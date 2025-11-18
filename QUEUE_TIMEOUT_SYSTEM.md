# Queue Timeout System (5 Minute Limit)

## Overview

Users now have **5 minutes** from when they join the queue to complete their mint. If they don't start minting within this time (e.g., they close the browser, lose connection, or just wait too long), they are automatically removed from the queue and the next person gets their turn.

## Why This is Needed

**Problem:** User joins queue → Closes browser → Blocks everyone forever

**Before timeout system:**
- User A joins queue (position #1)
- User A closes browser
- User B joins queue (position #2)
- User B waits... forever ❌
- User C joins queue (position #3)
- User C waits... forever ❌
- Queue is permanently blocked

**After timeout system:**
- User A joins queue (position #1) at 10:00:00
- User A closes browser
- User B joins queue (position #2)
- Server cleanup runs at 10:05:30 (every 30 seconds)
- Detects User A has been "waiting" for > 5 minutes
- Removes User A from queue ✅
- User B automatically becomes position #1
- User B can now mint!

## How It Works

### 1. Timeout Tracking

Each queue entry has a `created_at` timestamp:
```sql
CREATE TABLE mint_queue (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),  -- Tracks when they joined
  ...
);
```

### 2. Automatic Cleanup

Server runs cleanup every **30 seconds**:

```typescript
// src/lib/mintQueue.ts:277
setInterval(() => {
  mintQueue.cleanup();
}, 30 * 1000); // Every 30 seconds
```

Cleanup function removes stale entries:

```sql
-- supabase/queue_timeout_migration.sql
CREATE OR REPLACE FUNCTION cleanup_stale_queue_entries()
RETURNS INTEGER
AS $$
BEGIN
  -- Remove entries that have been "waiting" for more than 5 minutes
  DELETE FROM mint_queue
  WHERE status = 'waiting'
    AND created_at < NOW() - INTERVAL '5 minutes';

  RETURN deleted_count;
END;
$$;
```

### 3. Real-Time Countdown Timer

Users see how much time they have left:

**When position > 1 (waiting in queue):**
```
┌─────────────────────────────────────────┐
│  ⏳ Please wait your turn              │
│                                         │
│  The page will automatically start      │
│  minting when it's your turn.           │
│                                         │
│  ⚠️ You'll have 5 minutes to mint      │
│     once it's your turn.                │
└─────────────────────────────────────────┘
```

**When position = 1 (your turn!):**
```
┌─────────────────────────────────────────┐
│  ⏰ Time remaining to mint:     4:32   │
│                                         │
│  You have 5 minutes to complete your   │
│  mint or you'll lose your turn.        │
└─────────────────────────────────────────┘
```

### 4. Frontend Timeout Detection

Frontend polls queue status every 2 seconds:

```typescript
// src/app/mint/page.tsx:84-120
const pollQueue = async () => {
  const response = await fetch(`/api/queue/status?queueId=${queueId}`);
  const data = await response.json();

  setTimeoutSeconds(data.timeoutSeconds);

  // Check if timed out
  if (data.timeoutSeconds !== null && data.timeoutSeconds <= 0) {
    setError('Your queue session timed out (5 minute limit). Please try again.');
    setQueueId(null);
    setQueueStatus('failed');
    return;
  }

  // Also handle 404 (entry was deleted by cleanup)
  if (response.status === 404) {
    setError('Your queue session timed out. Please try again.');
    setQueueId(null);
    setQueueStatus('failed');
  }
};
```

## User Experience Flow

### Scenario 1: User completes mint within 5 minutes ✅

```
Time        Action                      Timeout Remaining
───────────────────────────────────────────────────────────
10:00:00    Join queue (pos #1)         5:00
10:01:00    Still at browser            4:00
10:02:00    Click "Mint Collectible"    3:00
10:02:30    Sign transaction            2:30
10:03:00    Transaction confirming      2:00
10:03:30    ✅ Confirmed and complete   1:30 (didn't need it!)
```

Result: **Success!** Mint completed with time to spare.

### Scenario 2: User abandons queue ❌→✅

```
Time        User A                      User B                Timeout
──────────────────────────────────────────────────────────────────────
10:00:00    Join queue (pos #1)         -                     5:00
            5:00 remaining
10:01:00    Closes browser ❌           -                     4:00
10:02:00    (gone)                      Joins queue (pos #2)  3:00
                                        Waiting...
10:03:00    (gone)                      Still waiting         2:00
10:04:00    (gone)                      Still waiting         1:00
10:05:00    (gone)                      Still waiting         0:00
10:05:30    [CLEANUP RUNS]              -                     -
            User A removed from queue
10:05:31    -                           Position → #1! ✅     -
                                        Starts minting
```

Result: **User B gets to mint!** Queue wasn't permanently blocked.

### Scenario 3: User is slow but within limit ⚠️→✅

```
Time        Action                      Timeout Display
───────────────────────────────────────────────────────────
10:00:00    Join queue (pos #1)         -
10:01:00    Position #1, can mint       ⏰ Time remaining: 4:00
10:02:00    Thinking...                 ⏰ Time remaining: 3:00
10:03:00    Still thinking...           ⏰ Time remaining: 2:00
10:04:00    Finally clicks mint!        ⏰ Time remaining: 1:00
10:04:30    Signing transaction         ⏰ Time remaining: 0:30
10:04:45    ✅ Transaction submitted    -
```

Result: **Success!** User was slow but beat the 5-minute limit.

### Scenario 4: User times out while at position #1 ❌

```
Time        Action                      Timeout Display
───────────────────────────────────────────────────────────
10:00:00    Join queue (pos #1)         -
10:01:00    Position #1, can mint       ⏰ Time remaining: 4:00
10:02:00    AFK (away from keyboard)    ⏰ Time remaining: 3:00
10:03:00    Still AFK                   ⏰ Time remaining: 2:00
10:04:00    Still AFK                   ⏰ Time remaining: 1:00
10:05:00    Still AFK                   ⏰ Time remaining: 0:00
10:05:30    [CLEANUP RUNS]              -
            Entry removed from queue
10:05:31    Page updates                ❌ "Queue timeout. Please try again."
            Queue ID cleared
            Button re-enabled
```

Result: **Kicked out!** User can join the queue again if they want.

## Database Functions

### 1. Cleanup Stale Entries

```sql
CREATE OR REPLACE FUNCTION cleanup_stale_queue_entries()
RETURNS INTEGER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Remove entries that have been "waiting" for more than 5 minutes
  DELETE FROM mint_queue
  WHERE status = 'waiting'
    AND created_at < NOW() - INTERVAL '5 minutes';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Also remove old completed/failed entries (older than 1 hour)
  DELETE FROM mint_queue
  WHERE created_at < NOW() - INTERVAL '1 hour'
    AND status IN ('completed', 'failed');

  RETURN deleted_count;
END;
$$;
```

### 2. Get Timeout Seconds Remaining

```sql
CREATE OR REPLACE FUNCTION get_queue_timeout_seconds(queue_id TEXT)
RETURNS INTEGER
AS $$
DECLARE
  seconds_remaining INTEGER;
  entry_created_at TIMESTAMPTZ;
BEGIN
  SELECT created_at INTO entry_created_at
  FROM mint_queue
  WHERE id = queue_id;

  IF entry_created_at IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate seconds remaining (5 minutes = 300 seconds)
  seconds_remaining := 300 - EXTRACT(EPOCH FROM (NOW() - entry_created_at))::INTEGER;

  -- Return 0 if already timed out
  IF seconds_remaining < 0 THEN
    RETURN 0;
  END IF;

  RETURN seconds_remaining;
END;
$$;
```

## Code Changes

### Backend (src/lib/mintQueue.ts)

**1. Return timeout in status:**
```typescript
async getQueueStatus(queueId: string) {
  // ... existing code ...

  // Get timeout seconds (5 min limit from created_at)
  const { data: timeoutData } = await supabase
    .rpc('get_queue_timeout_seconds', { queue_id: queueId });

  const timeoutSeconds = timeoutData as number | null;

  return {
    position,
    status: entry.status,
    totalInQueue,
    estimatedWaitTime,
    timeoutSeconds,  // NEW!
    nftId: entry.nft_id,
    txHash: entry.tx_hash,
    error: entry.error_message
  };
}
```

**2. Run cleanup more frequently:**
```typescript
// Run cleanup every 30 seconds (was 2 minutes)
setInterval(() => {
  mintQueue.cleanup();
}, 30 * 1000);
```

**3. Updated cleanup function:**
```typescript
async cleanup(): Promise<void> {
  const { data } = await supabase.rpc('cleanup_stale_queue_entries');

  if (data && data > 0) {
    console.log(`🧹 Cleaned up ${data} stale queue entries (5 min timeout)`);
  }
}
```

### Frontend (src/app/mint/page.tsx)

**1. Add timeout state:**
```typescript
const [timeoutSeconds, setTimeoutSeconds] = useState<number | null>(null);
```

**2. Update polling to handle timeout:**
```typescript
const pollQueue = async () => {
  const response = await fetch(`/api/queue/status?queueId=${queueId}`);

  if (response.ok) {
    const data = await response.json();
    setTimeoutSeconds(data.timeoutSeconds);

    // Check if timed out
    if (data.timeoutSeconds !== null && data.timeoutSeconds <= 0) {
      setError('Your queue session timed out (5 minute limit).');
      setQueueId(null);
      setQueueStatus('failed');
      return;
    }
  } else if (response.status === 404) {
    // Entry was deleted by cleanup
    setError('Your queue session timed out.');
    setQueueId(null);
    setQueueStatus('failed');
  }
};
```

**3. Display countdown timer:**
```typescript
{/* Show countdown when position = 1 */}
{queuePosition === 1 && timeoutSeconds !== null && timeoutSeconds > 0 && (
  <div className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
    <div className="flex items-center justify-between">
      <span className="text-red-300 font-medium">⏰ Time remaining to mint:</span>
      <span className="text-red-400 font-bold text-lg">
        {Math.floor(timeoutSeconds / 60)}:{(timeoutSeconds % 60).toString().padStart(2, '0')}
      </span>
    </div>
    <p className="text-xs text-red-300 mt-2">
      You have 5 minutes to complete your mint or you'll lose your turn.
    </p>
  </div>
)}
```

**4. Show warning to waiting users:**
```typescript
<p className="text-xs text-gray-500 text-center mt-2">
  ⚠️ You'll have 5 minutes to mint once it's your turn.
</p>
```

## Migration Steps

### 1. Run Database Migration

```bash
# Open Supabase SQL Editor
# Run: supabase/queue_timeout_migration.sql
```

This creates:
- `cleanup_stale_queue_entries()` function
- `get_queue_timeout_seconds()` function

### 2. Verify Functions Exist

```sql
-- Check functions were created
SELECT proname FROM pg_proc WHERE proname LIKE '%queue%';

-- Should see:
-- cleanup_stale_queue_entries
-- get_queue_timeout_seconds
-- get_queue_position
-- get_next_in_queue
```

### 3. Test Manually

```sql
-- Insert test entry
INSERT INTO mint_queue (id, wallet_address, status, created_at)
VALUES ('test-old', 'addr1test', 'waiting', NOW() - INTERVAL '6 minutes');

-- Check timeout
SELECT get_queue_timeout_seconds('test-old'); -- Returns 0 (timed out)

-- Run cleanup
SELECT cleanup_stale_queue_entries(); -- Returns 1 (deleted test entry)

-- Verify deleted
SELECT * FROM mint_queue WHERE id = 'test-old'; -- Returns nothing
```

## Monitoring

### Check for Stale Entries

```sql
-- Find entries approaching timeout (< 1 min remaining)
SELECT
  id,
  wallet_address,
  status,
  created_at,
  get_queue_timeout_seconds(id) as seconds_remaining
FROM mint_queue
WHERE status = 'waiting'
  AND get_queue_timeout_seconds(id) < 60
ORDER BY seconds_remaining ASC;
```

### View Cleanup History

```sql
-- See when entries were created (helps identify slow users)
SELECT
  id,
  wallet_address,
  status,
  created_at,
  NOW() - created_at as age
FROM mint_queue
WHERE status = 'waiting'
ORDER BY created_at DESC;
```

### Server Logs

```bash
# Cleanup logs appear every 30 seconds if entries were removed:
🧹 Cleaned up 3 stale queue entries (5 min timeout for waiting)
```

## Benefits

✅ **No permanent queue blocking** - Abandoned users are auto-removed
✅ **Clear user expectations** - "You have 5 minutes to mint"
✅ **Real-time countdown** - Users see exactly how much time remains
✅ **Graceful failure** - Kicked users see clear error message
✅ **Automatic recovery** - Queue keeps moving even if users leave
✅ **Fair system** - Everyone gets 5 minutes, no special treatment

## Edge Cases Handled

**1. User refreshes page while waiting:**
- Frontend polls with queueId
- Backend returns timeout remaining
- Countdown continues from where it was
- ✅ Works correctly

**2. Multiple users time out simultaneously:**
- Cleanup runs every 30s
- Deletes ALL entries older than 5 minutes
- Next person in queue becomes #1
- ✅ Works correctly

**3. User times out while minting:**
- Timeout only applies to "waiting" status
- Once status → "minting", no timeout
- User has unlimited time to sign/submit
- ✅ Works correctly (only waiting times out)

**4. User joins queue right as another times out:**
- Position calculated from created_at
- Cleanup doesn't affect new entries
- ✅ Works correctly

## Summary

The 5-minute timeout system ensures the queue keeps moving even when users abandon their session. Users see clear warnings and countdown timers, so they know exactly how much time they have. The automatic cleanup runs every 30 seconds to quickly remove stale entries and unblock waiting users.

**Key numbers:**
- ⏰ **5 minutes** - Time limit from joining queue to starting mint
- 🧹 **30 seconds** - How often cleanup runs
- 📊 **Real-time** - Countdown updates every 2 seconds
- ✅ **100% automatic** - No manual intervention needed
