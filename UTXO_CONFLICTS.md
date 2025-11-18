# UTxO Conflicts - Understanding and Prevention

## What Are UTxO Conflicts?

**UTxO** = Unspent Transaction Output (how Cardano tracks balances)

When you make a transaction on Cardano, you "spend" UTxOs and create new ones. Once a UTxO is spent, it cannot be spent again - this is fundamental blockchain behavior.

## The Error You're Seeing

```
BadInputsUTxO - trying to use UTxOs that were already spent
ValueNotConservedUTxO - inputs don't match outputs
```

**This is NOT a bug or Blockfrost issue** - this is normal blockchain behavior preventing double-spending.

## Why This Happens

### Timeline of the Problem:

1. **First Mint** (successful):
   ```
   Fetch UTxOs from wallet → Build tx → Sign → Submit → Blockchain processes → UTxOs are SPENT
   ```

2. **Second Mint** (immediate, fails):
   ```
   Fetch UTxOs from wallet → STILL THE SAME UTxOs (wallet hasn't synced!)
   → Build tx with STALE UTxOs → Sign → Submit → ERROR (UTxOs already spent)
   ```

### Root Cause:

**Wallet extensions cache UTxOs** and don't instantly update after transactions. When you mint again immediately:
- Your wallet extension still thinks the old UTxOs exist
- It sends those stale UTxOs to build the transaction
- The blockchain rejects them because they're already spent

## Solutions Implemented

### 1. Error Handler Fix ✅
**Problem**: Crash when trying to cancel reservation after error
**Fix**: Save nftData at the beginning so we can access it in error handler

### 2. Increased Cooldown Timer ✅
**Before**: 5 seconds
**After**: 15 seconds

This gives more time for:
- Blockchain to process the transaction
- Wallet extension to sync its UTxO cache
- Network propagation

### 3. Better Error Messages ✅
**Before**: Generic "Transaction failed" message
**After**: Clear message explaining wallet sync delay

```
"⏳ Wallet syncing - please wait 15-30 seconds before minting again.
Your previous mint was successful!"
```

### 4. Automatic Wallet Refresh ✅
After each successful mint, we now:
1. Call `refreshBalance()` to request wallet update
2. Wait 2 seconds for sync
3. Start 15-second cooldown timer

## For Multiple Concurrent Users

The **Reservation System** prevents different users from getting the same NFT:

- User A mints → NFT #123 reserved
- User B mints (same time) → Gets NFT #456 (different one)
- Both can mint successfully ✅

The UTxO conflict issue is specifically about the **SAME USER** minting twice quickly.

## Best Practices for Users

### If You're Minting Multiple NFTs:

1. **Wait for success message** before clicking "Mint" again
2. **Wait for 15-second cooldown** to complete
3. **Check your wallet** to confirm the previous NFT arrived
4. If you get a UTxO conflict error:
   - Your previous mint was likely **successful**
   - Just wait 15-30 seconds and try again
   - Don't click multiple times quickly

### Why 15-30 Seconds?

- **Blockchain confirmation**: ~20 seconds on Cardano
- **Wallet sync**: Varies by wallet extension (Eternl, Nami, etc.)
- **Network propagation**: Distributed across nodes

## Technical Details

### Where UTxOs Come From:

In `src/app/mint/page.tsx`:
```typescript
const userUtxos = await wallet.getUtxos(); // Gets UTxOs from wallet extension
```

This calls the wallet extension's API (Eternl, Nami, etc.), which maintains its own cache of UTxOs.

### What the Cooldown Does:

```typescript
// After successful mint:
setCooldownSeconds(15); // Disable button for 15 seconds
await refreshBalance();  // Request wallet to refresh
await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
```

### Error Detection:

```typescript
const isUtxoConflict = errorMessage.includes('BadInputsUTxO') ||
                       errorMessage.includes('ValueNotConservedUTxO') ||
                       errorMessage.includes('already spent');
```

When detected, shows helpful message instead of technical error.

## Why We Can't Completely Prevent This

1. **Wallet Extension Control**: We can't force wallet extensions to refresh their cache immediately
2. **Blockchain Timing**: Transaction confirmation takes time (20+ seconds)
3. **Network Propagation**: Distributed system with eventual consistency

The 15-second cooldown is a **reasonable balance** between:
- User experience (not too long to wait)
- Preventing UTxO conflicts (enough time for wallet sync)

## Comparison with Traditional Systems

**Traditional Bank Account**:
- Balance: $100
- Spend $50 → Balance: $50 (instant update)
- Can immediately spend another $50

**Cardano UTxO Model**:
- UTxOs: [50 ADA, 30 ADA, 20 ADA]
- Spend 50 ADA UTxO → **That specific UTxO is gone**
- New UTxOs created: [40 ADA (to recipient), 10 ADA (change)]
- Wallet needs time to see the new UTxOs before next transaction

## Monitoring

Watch the console logs to understand the flow:

```
🎲 Selected NFT: 123
✅ Reserved NFT 123 for addr_test1...
🔨 Building transaction...
✍️ Signing with wallet...
📤 Submitting transaction...
✅ NFT minted! TX: abc123...
🔄 Refreshing wallet balance to get fresh UTxOs...
✅ Wallet balance refreshed
⏳ Cooldown: 15 seconds remaining...
```

If you see a UTxO conflict:
```
❌ Error: BadInputsUTxO
⏳ Wallet syncing - please wait 15-30 seconds...
```

## FAQ

**Q: Is this a bug?**
A: No, this is normal blockchain behavior. You cannot spend the same UTxO twice.

**Q: Is Blockfrost broken?**
A: No, Blockfrost is working correctly. It's correctly rejecting transactions with already-spent UTxOs.

**Q: Will multiple users have this problem?**
A: No, the reservation system prevents different users from getting the same NFT. UTxO conflicts only affect the same user minting multiple times quickly.

**Q: Why not fetch UTxOs from Blockfrost instead of wallet?**
A: We could, but then we'd need to handle UTxO selection logic server-side, which is complex and would require storing wallet details server-side (security concern).

**Q: Can I reduce the cooldown?**
A: You can, but you'll increase the chance of UTxO conflicts. 15 seconds is recommended.

**Q: What if I need to mint many NFTs quickly?**
A: Consider using a queue system or batch minting (mint multiple NFTs in a single transaction) - but that would require significant changes to the current system.
