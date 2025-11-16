# Generate Policy ID from Mnemonic

Your application can automatically generate a Cardano policy ID from your minting wallet's mnemonic phrase.

## Method 1: NPM Script (Recommended)

The easiest method - uses your mnemonic to generate the policy:

### Step 1: Set Your Mnemonic

Make sure your `.envrc` file has:

```bash
export MINTTING_WALLET_OUTPUT_MNEMONIC="word1 word2 word3 ... word24"
```

Or if using `.env`:
```bash
MINTTING_WALLET_OUTPUT_MNEMONIC=word1 word2 word3 ... word24
```

### Step 2: Run the Generator

```bash
npm run generate-policy
```

You'll see output like:
```
🔐 Generating Cardano Policy ID from Mnemonic...

✓ Mnemonic loaded (24 words)
✓ Wallet created
✓ Payment key obtained

📋 Add this to your environment:

POLICY_ID=abc123def456...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Next Steps:
   1. Copy the line above to your .envrc or .env file
   2. Run `direnv allow` (if using .envrc) or restart your dev server
```

### Step 3: Add to Environment

Copy the policy ID to your `.envrc`:

```bash
export POLICY_ID='abc123def456...'
```

Or to your `.env`:
```bash
POLICY_ID=abc123def456...
```

### Step 4: Reload Environment

If using `.envrc`:
```bash
direnv allow
```

If using `.env`:
```bash
npm run dev  # Restart the server
```

Done!

## How It Works

### Policy Script Creation

The system creates a **native script policy** that:
- Requires your wallet's signature to mint
- Is derived from your wallet's payment key
- Works for both mainnet and testnet

### Policy Script Structure

```json
{
  "type": "all",
  "scripts": [
    {
      "type": "sig",
      "keyHash": "your_wallet_key_hash"
    }
  ]
}
```

This means:
- Only your wallet can mint NFTs with this policy
- No one else can mint using your policy ID
- You control the entire collection

### Security

✅ **Secure**: Only you can mint (requires your wallet signature)
✅ **Permanent**: Policy ID is cryptographically derived
✅ **Verifiable**: Anyone can verify the policy on-chain

## Manual Method (Alternative)

If you prefer not to use the API route, you can also use the Mesh SDK directly:

### Create a Script

Create `scripts/generate-policy.js`:

```javascript
const { AppWallet, resolveScriptHash } = require('@meshsdk/core');

const mnemonic = process.env.MINTTING_WALLET_OUTPUT_MNEMONIC;

const wallet = new AppWallet({
  networkId: 1, // 1 = mainnet, 0 = testnet
  key: {
    type: 'mnemonic',
    words: mnemonic.split(' ')
  }
});

const paymentKeyHash = await wallet.getPaymentKeyHash();

const policyScript = {
  type: 'all',
  scripts: [
    {
      type: 'sig',
      keyHash: paymentKeyHash
    }
  ]
};

const policyId = resolveScriptHash(policyScript);

console.log('Policy ID:', policyId);
console.log('Add to .env:', `POLICY_ID=${policyId}`);
```

Run it:
```bash
node scripts/generate-policy.js
```

## Testnet vs Mainnet

The policy ID differs between networks:

### For Testnet:
```bash
# In the API route, change networkId to 0
networkId: 0  // Testnet
```

### For Mainnet:
```bash
# Use networkId: 1 (default)
networkId: 1  // Mainnet
```

Generate separate policy IDs for each network.

## Verification

After generating your policy ID:

1. **Check Format**: Should be 56 hex characters
2. **Verify in Wallet**: Your wallet should show this policy when minting
3. **Test on Testnet**: Always test first on testnet

## Complete Setup

Your final `.envrc` should look like:

```bash
# Minting Wallet
export MINTTING_WALLET_OUTPUT_MNEMONIC="word1 word2 word3 ... word24"

# JWT Secret
export JWT_SECRET='your-secret-key'

# Generated/Configured Values
export NEXT_PUBLIC_PROFIT_WALLET='addr1qy...'  # Your wallet address
export POLICY_ID='abc123def456...'  # Generated from mnemonic
```

Or if using `.env`:
```bash
MINTTING_WALLET_OUTPUT_MNEMONIC=word1 word2 word3 ... word24
JWT_SECRET=your-secret-key
NEXT_PUBLIC_PROFIT_WALLET=addr1qy...
POLICY_ID=abc123def456...
```

## Troubleshooting

### "Failed to generate policy"
- Check mnemonic is exactly 24 words
- Verify no extra spaces or line breaks
- Make sure words are valid Cardano mnemonic words

### "Invalid policy ID"
- Should be 56 characters
- Should be hexadecimal (0-9, a-f)
- No spaces or special characters

### "Cannot resolve key hash"
- Update Mesh SDK: `npm install @meshsdk/core@latest`
- Verify mnemonic is correct format
- Try generating manually with cardano-cli

## What's Next?

Once you have your policy ID:

1. ✅ Add to `.envrc` (or `.env`) as `POLICY_ID`
2. ✅ Run `direnv allow` or restart dev server
3. ✅ Test on Cardano testnet
4. ✅ Verify NFTs mint correctly
5. ✅ Switch to mainnet when ready

Your policy ID is permanent and unique to your minting wallet! 🎉

## Policy Types

This generates a **simple signature policy** (most common).

Other policy types available:
- **Time-locked**: Minting only allowed before/after certain time
- **Multi-signature**: Requires multiple signers
- **Complex**: Combinations of above

For most NFT collections, simple signature policy is perfect.

## Security Best Practices

- ✅ Keep mnemonic in `.envrc` or `.env` (never commit to git)
- ✅ Use different mnemonics for testnet/mainnet
- ✅ Backup your mnemonic securely
- ✅ Never share your mnemonic
- ✅ Generate policy on secure machine

Your policy ID links to your wallet - keep it safe! 🔐
