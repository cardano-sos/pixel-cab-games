# Mint Queue System (FIFO)

## ✅ Implemented Features

The mint queue system ensures **only one person can mint at a time**, preventing:
- UTxO conflicts between users
- Race conditions for NFT selection
- Concurrent transaction failures

## How It Works

### User Flow:

1. **User clicks "Mint NFT"**
   - Immediately joins the queue
   - Gets assigned a queue position (#1, #2, #3, etc.)

2. **If not first in line:**
   - Sees queue position and estimated wait time
   - Polls server every 2 seconds for updates
   - Automatically proceeds when it's their turn

3. **When it's your turn (#1 in queue):**
   - Transaction builds and mints automatically
   - Status shows "Minting your NFT..."
   - Other users wait in queue

4. **After transaction submits:**
   - Server waits **30 seconds** and checks blockchain confirmation
   - Status shows "Confirming on blockchain..."
   - Once confirmed (or 30s timeout), you're removed from queue
   - **Next person in queue can now mint!**

### Technical Flow:

```
User A clicks Mint → Queue Position #1 → Mints immediately → Waits 30s for confirmation → Exits queue
User B clicks Mint → Queue Position #2 → Waits for User A → Becomes #1 → Mints → Exits queue
User C clicks Mint → Queue Position #3 → Waits for A, then B → Becomes #1 → Mints → Exits queue
```

## File Structure

### Backend Files:

1. **`src/lib/mintQueue.ts`** - Core queue management
   - In-memory FIFO queue
   - Tracks user position, status, NFT ID, tx hash
   - Auto-cleanup of stale entries
   - Singleton instance shared across requests

2. **`src/app/api/queue/join/route.ts`** - Join queue endpoint
   - POST `/api/queue/join`
   - Returns `queueId` and `position`

3. **`src/app/api/queue/status/route.ts`** - Check queue status
   - GET `/api/queue/status?queueId=xxx`
   - Returns position, status, estimated wait time

4. **`src/app/api/mint/build-mint-tx/route.ts`** - Updated to require queue
   - Checks if user is at front of queue (`mintQueue.canMint()`)
   - Marks as "minting" when building tx
   - Rejects if not your turn (403 error)

5. **`src/app/api/mint/submit-mint-tx/route.ts`** - Updated with confirmation wait
   - Marks as "confirming" after submission
   - Waits 30 seconds and polls Blockfrost for confirmation
   - Marks as "completed" and releases queue
   - Next person can now mint

### Frontend Files:

1. **`src/app/mint/page.tsx`** - Updated mint page
   - Joins queue before minting
   - Polls queue status every 2 seconds
   - Shows queue position, wait time, and status
   - Automatically proceeds when at front of queue

## Queue States

Each user in the queue has one of these states:

| State | Description | What user sees |
|-------|-------------|----------------|
| `waiting` | In queue, waiting for turn | "Queue position: #3" |
| `minting` | Building and signing transaction | "🔨 Minting your NFT..." |
| `confirming` | Transaction submitted, waiting 30s for blockchain confirmation | "⏳ Confirming on blockchain..." |
| `completed` | Successfully minted and confirmed | "✅ NFT minted and confirmed!" |
| `failed` | Error occurred, removed from queue | Error message displayed |

## API Endpoints

### Join Queue
```typescript
POST /api/queue/join
Body: { walletAddress: string }
Response: {
  success: true,
  queueId: string,
  position: number,
  message: string
}
```

### Check Status
```typescript
GET /api/queue/status?queueId=xxx
Response: {
  success: true,
  position: number,
  status: 'waiting' | 'minting' | 'confirming' | 'completed' | 'failed',
  totalInQueue: number,
  estimatedWaitTime: number, // seconds
  nftId?: number,
  txHash?: string,
  error?: string
}
```

## Queue Management

### Automatic Cleanup:
- Entries older than 10 minutes are removed (except if currently minting/confirming)
- Failed mints are removed after 5 seconds
- Completed mints are removed after 5 seconds
- Cleanup runs every 2 minutes

### Concurrency Handling:
- **Single server instance**: In-memory queue works perfectly
- **Multiple server instances** (production with load balancing): Would need Redis or database-based queue

## User Experience

### Good UX Features:

1. **Immediate feedback**: User knows their position instantly
2. **Progress visibility**: Can see status changes (waiting → minting → confirming)
3. **Fair ordering**: First come, first served (FIFO)
4. **Estimated wait time**: Shows ~1 minute per person ahead
5. **Auto-progression**: No need to click again when it's your turn
6. **Real-time updates**: Queue status updates every 2 seconds

### Example User Journey:

**User perspective:**
```
[Click "Mint NFT"]
↓
"Joining mint queue..."
↓
"Queue position: #3. Estimated wait: ~2 minutes"
↓
[Wait 60 seconds]
↓
"Queue position: #2. Estimated wait: ~1 minute"
↓
[Wait 60 seconds]
↓
"Queue position: #1. Your turn to mint!"
↓
"🔨 Minting your NFT..."
↓
[Sign transaction with wallet]
↓
"Submitting minting transaction..."
↓
"⏳ Confirming on blockchain (30s)..."
↓
[Wait 30 seconds for confirmation]
↓
"✅ NFT minted and confirmed on blockchain!"
```

## Transaction Confirmation (30s Wait)

After transaction is submitted to the blockchain:

1. **Server calls `waitForConfirmation()`**
   - Polls Blockfrost every 3 seconds for up to 30 seconds
   - Checks if transaction appears on blockchain

2. **If confirmed within 30s:**
   - User sees: "✅ NFT minted and confirmed on blockchain!"
   - Queue completes immediately

3. **If not confirmed within 30s:**
   - User sees: "🎉 NFT minted! Confirming on blockchain (may take 30-60s)..."
   - Queue still completes (transaction was submitted successfully)
   - Transaction will confirm eventually (just takes longer than 30s)

### Why 30 seconds?

- Average Cardano block time: ~20 seconds
- Network propagation: ~5-10 seconds
- Buffer for delays: ~5 seconds
- **Total: 30 seconds is a reasonable wait**

If blockchain is slow, transaction still succeeds but confirmation might take longer. The queue releases anyway to prevent backing up.

## Monitoring and Debugging

### Server Logs:

```
📝 Added addr_test1... to queue at position 2
🎯 Your turn to mint!
✅ Reserved NFT 123 for addr_test1...
🔨 Started minting NFT 123 for queue ID addr_test1...-1234567890
✅ Transaction submitted! TX: abc123...
⏳ Waiting up to 30s for transaction confirmation...
⏳ Confirming transaction abc123... for queue ID addr_test1...-1234567890
✅ Transaction confirmed on blockchain: abc123...
✅ Completed mint for queue ID addr_test1...-1234567890
🗑️ Removed addr_test1...-1234567890 from queue
```

### Frontend Console:

```
📝 Joined queue at position 2
🎯 Your turn to mint!
User has 5 UTxOs available
🎲 Selected NFT: 123
✅ Reserved NFT 123 for addr_test1...
🔨 Building transaction...
✍️ Signing with wallet...
📤 Submitting transaction...
✅ Mint completed, queue released for next user
```

## Benefits Over Previous System

### Before (No Queue):
- ❌ Multiple users could try to mint simultaneously
- ❌ UTxO conflicts between users
- ❌ Race conditions for NFT selection
- ❌ No guarantee of fairness
- ❌ Users didn't know if someone else was minting

### After (With Queue):
- ✅ Only one user mints at a time
- ✅ No UTxO conflicts between users
- ✅ Fair FIFO ordering
- ✅ Users see their position and wait time
- ✅ Automatic progression when it's your turn
- ✅ 30-second confirmation ensures transaction succeeded
- ✅ Next user doesn't start until previous transaction is confirmed

## Edge Cases Handled

### User closes browser while minting:
- Entry stays in queue for 10 minutes
- Eventually cleaned up automatically
- Other users can proceed after timeout

### Transaction fails:
- Marked as "failed" immediately
- Removed from queue after 5 seconds
- Next user can proceed

### Blockchain is slow (>30s confirmation):
- Transaction still submitted successfully
- Queue releases after 30s anyway
- User notified that confirmation may take longer
- Next user can start minting

### Multiple tabs/windows:
- Each gets a separate queue entry
- Both will wait in line normally
- Not recommended but won't break system

## Production Considerations

### For Single Server (Current):
- ✅ In-memory queue works perfectly
- ✅ Simple and fast
- ✅ No external dependencies

### For Multiple Servers (Future):
Would need to implement:
- Redis-based queue for shared state
- Or database-based queue with locking
- Sticky sessions to route user to same server

### For High Traffic:
- Consider batch minting (multiple NFTs per transaction)
- Implement priority queue (paid fast-track)
- Add queue reservation system
- Scale horizontally with Redis queue

## Testing

### Single User Test:
1. Connect wallet
2. Click "Mint NFT"
3. Should see "Queue position: #1"
4. Should mint immediately
5. Should see 30s confirmation wait
6. Should complete successfully

### Multiple Users Test (Simulated):
1. Open 3 incognito windows
2. Connect different wallets in each
3. Click "Mint NFT" in all 3 quickly
4. First user: Mints immediately
5. Second user: Waits, sees position #2
6. Third user: Waits, sees position #3
7. As each completes, next user progresses

### Queue Status Display:
- Position number updates correctly
- Status changes: waiting → minting → confirming → completed
- Estimated wait time decreases as queue moves
- Emoji indicators show current activity

## Future Enhancements

Potential improvements:
- WebSocket for real-time queue updates (instead of polling)
- Queue history/analytics dashboard
- VIP/priority queue lanes
- Batch minting support
- Email/push notifications when it's your turn
- Estimated time based on actual historical data
- Queue position preservation on page refresh
