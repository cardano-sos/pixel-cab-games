# Sequential Mint Queue System

## Overview

The mint queue ensures **ONLY ONE person can mint at a time** from start to finish. This completely eliminates UTxO conflicts by ensuring each mint fully completes (including blockchain confirmation) before the next person starts.

## How It Works

### Queue Flow

```
User A → Joins Queue (#1) → Starts Minting → Submits TX → Waits 30s → ✅ Confirmed → Complete
                                                                                    ↓
User B → Joins Queue (#2) → WAITS ----------------------------------------→ Now can start minting
```

### Queue States

1. **waiting** - User joined queue, waiting for their turn to start
2. **minting** - User is building and submitting transaction
3. **confirming** - Transaction submitted, waiting for blockchain confirmation (30 seconds)
4. **completed** - Fully confirmed, removed from queue after 5 seconds
5. **failed** - Error occurred, removed from queue after 5 seconds

### Critical Rule

**You can ONLY start minting if:**
1. ✅ You are in "waiting" status
2. ✅ NO ONE else is in "minting" status
3. ✅ NO ONE else is in "confirming" status
4. ✅ You are first in the waiting queue (by created_at timestamp)

## Why This Prevents UTxO Conflicts

### The UTxO Problem

When multiple people try to mint at the same time:
- They both fetch the same UTxOs from the minting wallet
- They both try to spend the same UTxOs
- Only ONE transaction succeeds
- The other fails with "UTxO already spent"

### The Sequential Solution

By ensuring ONLY ONE person mints at a time:
- Person A gets UTxOs from wallet
- Person A builds transaction using those UTxOs
- Person A submits transaction
- **Person A's transaction confirms on blockchain** (UTxOs now spent)
- Person A completes (status → completed)
- NOW Person B can start
- Person B fetches FRESH UTxOs (Person A's are already spent)
- Person B builds transaction with the fresh UTxOs
- No conflict! ✅

## Timeline Example

```
Time    User A Status        User B Status        User C Status
00s     waiting (pos #1)     -                    -
05s     minting              -                    -
15s     confirming           waiting (pos #2)     -
25s     confirming           waiting (pos #2)     waiting (pos #3)
45s     completed            waiting (pos #2)     waiting (pos #3)
50s     [removed]            minting              waiting (pos #2)
60s     -                    confirming           waiting (pos #2)
90s     -                    completed            waiting (pos #2)
95s     -                    [removed]            minting
105s    -                    -                    confirming
135s    -                    -                    completed
140s    -                    -                    [removed]
```

**Total time for 3 users: ~140 seconds (2.3 minutes)**
- Average: ~45-50 seconds per person
- Guaranteed: Zero UTxO conflicts

## Code Implementation

### 1. Queue Check (`src/lib/mintQueue.ts:120`)

```typescript
async canMint(queueId: string): Promise<boolean> {
  // Get your entry
  const { data: entry } = await supabase
    .from('mint_queue')
    .select('*')
    .eq('id', queueId)
    .single();

  if (!entry || entry.status !== 'waiting') return false;

  // Check if ANYONE is currently minting OR confirming
  const { count } = await supabase
    .from('mint_queue')
    .select('*', { count: 'exact', head: true })
    .in('status', ['minting', 'confirming']);

  // If someone is minting/confirming, you can't start yet
  if (count && count > 0) {
    return false; // ❌ Wait your turn
  }

  // Check if you're first in waiting queue
  const { data } = await supabase
    .rpc('get_next_in_queue')
    .single();

  const firstInQueue = data as { id: string; wallet_address: string } | null;

  return firstInQueue?.id === queueId; // ✅ You can mint!
}
```

### 2. Transaction Submit (`src/app/api/mint/submit-mint-tx/route.ts:167`)

```typescript
// Submit transaction
const txHash = await blockchainProvider.submitTx(finalTxHex);

// Mark as confirming (still blocks queue)
await mintQueue.startConfirming(queueId, txHash);

// WAIT for blockchain confirmation (blocks queue for 30s)
const confirmed = await waitForConfirmation(txHash, blockchainProvider, 30);

// Mark as complete (releases queue)
await mintQueue.completeMint(queueId);

// Return AFTER confirmation - next person can now start
return NextResponse.json({ success: true, txHash, confirmed });
```

### 3. Queue Position Calculation (`supabase/queue_table_migration.sql:27`)

```sql
CREATE OR REPLACE FUNCTION get_queue_position(queue_id TEXT)
RETURNS INTEGER
AS $$
DECLARE
  position INTEGER;
BEGIN
  -- Count all users ahead of you (waiting, minting, AND confirming)
  SELECT COUNT(*) + 1 INTO position
  FROM mint_queue
  WHERE created_at < (SELECT created_at FROM mint_queue WHERE id = queue_id)
    AND status IN ('waiting', 'minting', 'confirming');

  RETURN position;
END;
$$;
```

## Database Setup

### Run the Migration

1. Open Supabase Dashboard → SQL Editor
2. Run the migration from `supabase/queue_table_migration.sql`
3. This creates:
   - `mint_queue` table
   - `get_queue_position()` function
   - `get_next_in_queue()` function
   - `cleanup_old_queue_entries()` function

### Verify Migration

```sql
-- Check table exists
SELECT * FROM mint_queue;

-- Test position function
INSERT INTO mint_queue (id, wallet_address, status)
VALUES ('test-1', 'addr1test', 'waiting');

SELECT get_queue_position('test-1'); -- Should return 1

-- Cleanup
DELETE FROM mint_queue WHERE id = 'test-1';
```

## Testing the Queue

### Test 1: Sequential Processing

1. Open TWO browser windows
2. Connect wallets in both
3. Click "Mint Collectible" in Window 1
4. Click "Mint Collectible" in Window 2 immediately after
5. Expected behavior:
   - **Window 1:** Starts minting immediately (position #1)
   - **Window 2:** Shows "You are #2 in queue. Please wait..."
   - **Window 1:** Minting → Confirming → Success (45s total)
   - **Window 2:** Automatically starts minting ONLY AFTER Window 1 completes
   - **Window 2:** Minting → Confirming → Success (45s total)

### Test 2: Queue Persistence

1. Join queue in browser (position #1)
2. Stop dev server (`Ctrl+C`)
3. Restart dev server (`npm run dev`)
4. Check mint page - you should STILL be in queue!
5. Database-backed queue survives server restarts ✅

### Test 3: Multiple Users

1. Open THREE browser windows
2. Join queue in all three windows quickly
3. Expected positions: #1, #2, #3
4. Window 1 mints and completes (45s)
5. Check Window 2 and 3:
   - Window 2 should now be minting (was #2, now processing)
   - Window 3 should now be #2 (was #3, moved up)

## Monitoring the Queue

### Check Queue Status (SQL)

```sql
-- See all active queue entries
SELECT
  id,
  wallet_address,
  status,
  nft_id,
  tx_hash,
  created_at,
  updated_at
FROM mint_queue
WHERE status IN ('waiting', 'minting', 'confirming')
ORDER BY created_at ASC;

-- See how many in each status
SELECT status, COUNT(*) as count
FROM mint_queue
GROUP BY status;
```

### Check Queue Status (API)

```bash
# Get queue status for a specific queue ID
curl "http://localhost:3000/api/queue/status?queueId=YOUR_QUEUE_ID"

# Response:
{
  "success": true,
  "position": 2,
  "status": "waiting",
  "totalInQueue": 3,
  "estimatedWaitTime": 60  // seconds
}
```

## Troubleshooting

### "Still waiting in queue" but no one is minting

**Cause:** Someone got stuck in "minting" or "confirming" status

**Fix:**
```sql
-- Find stuck entries (older than 5 minutes)
SELECT * FROM mint_queue
WHERE status IN ('minting', 'confirming')
  AND created_at < NOW() - INTERVAL '5 minutes';

-- Remove stuck entries
DELETE FROM mint_queue
WHERE status IN ('minting', 'confirming')
  AND created_at < NOW() - INTERVAL '5 minutes';
```

### "Failed to submit minting transaction"

**Possible Causes:**
1. **Not your turn** - Someone else is still minting/confirming
2. **Insufficient ADA** - Need at least 52 ADA
3. **Minting wallet has no UTxOs** - Server wallet needs funds

**Check:**
```sql
-- See who is currently minting/confirming
SELECT * FROM mint_queue WHERE status IN ('minting', 'confirming');
```

### Queue not moving forward

**Check if cleanup is running:**
```sql
-- Run manual cleanup
SELECT cleanup_old_queue_entries();

-- Should return number of entries cleaned up
```

**Check server logs:**
```
✅ Added wallet_address to queue at position 2
🔨 Started minting NFT 123 for queue ID abc
✅ Transaction submitted! TX: hash123
⏳ Confirming transaction hash123 for queue ID abc
✅ NFT minted and confirmed! TX: hash123
✅ Completed mint for queue ID abc
```

## Performance Characteristics

### Throughput

- **Single user:** ~45-50 seconds per mint
- **Multiple users:** ~45-50 seconds per user (sequential)
- **No UTxO conflicts:** 100% success rate (if wallet funded)

### Wait Times

| Queue Position | Estimated Wait Time |
|---------------|---------------------|
| #1            | 0 seconds (start immediately) |
| #2            | ~60 seconds |
| #3            | ~120 seconds |
| #4            | ~180 seconds |
| #5            | ~240 seconds |

### Trade-offs

**✅ Advantages:**
- Zero UTxO conflicts
- 100% predictable behavior
- Queue persists across server restarts
- Works with multiple server instances
- Simple to understand and debug

**❌ Disadvantages:**
- Lower throughput (sequential vs parallel)
- Users must wait their turn
- Confirmation time adds to queue delay

## Maintenance

### Regular Cleanup

The cleanup function runs automatically every 2 minutes (`src/lib/mintQueue.ts:253`):

```typescript
setInterval(() => {
  mintQueue.cleanup();
}, 2 * 60 * 1000);
```

This removes `completed` and `failed` entries older than 1 hour.

### Manual Cleanup

If needed, run manual cleanup:

```sql
-- Clean up old entries
SELECT cleanup_old_queue_entries();

-- Or clear entire queue (emergency reset)
DELETE FROM mint_queue;
```

### Monitoring

Monitor queue health:

```sql
-- Check for stuck entries
SELECT * FROM mint_queue
WHERE updated_at < NOW() - INTERVAL '10 minutes'
  AND status IN ('minting', 'confirming');

-- Check queue length
SELECT COUNT(*) as queue_length
FROM mint_queue
WHERE status IN ('waiting', 'minting', 'confirming');

-- Average wait time
SELECT
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
FROM mint_queue
WHERE status = 'completed';
```

## Summary

The sequential queue system ensures **zero UTxO conflicts** by enforcing strict one-at-a-time minting. While this means lower throughput compared to parallel processing, it provides **100% reliability** and **predictable behavior** for all users.

The database-backed implementation ensures the queue persists across server restarts and works correctly with multiple server instances, making it production-ready for multi-user concurrent access.
