# Fix Stuck Queue Entries

## Problem

Queue entries can get stuck in "minting" or "confirming" status if:
- User closes browser during minting
- Network error occurs during transaction
- Server error occurs during confirmation
- Transaction takes longer than expected

Example stuck entry:
```
Wallet              Status     NFT ID    Created
addr_tes...w69v2u   minting    628       6:35:14 PM
```

This entry is stuck in "minting" status and blocks the entire queue because only ONE person can mint at a time.

## Root Cause

The cleanup function only removed "waiting" entries older than 5 minutes. It didn't clean up stuck "minting" or "confirming" entries.

## Solution

### Step 1: Run SQL Migration (Fixes Future Issues)

1. Open Supabase SQL Editor
2. Run `supabase/fix_stuck_queue_cleanup.sql`
3. This updates the cleanup function to also remove:
   - "minting" entries older than 10 minutes
   - "confirming" entries older than 10 minutes

**SQL to run:**
```sql
-- Updated cleanup function that removes ALL stuck entries
CREATE OR REPLACE FUNCTION cleanup_stale_queue_entries()
RETURNS INTEGER
LANGUAGE plpgsql
AS $
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Remove entries that have been "waiting" for more than 5 minutes
  DELETE FROM mint_queue
  WHERE status = 'waiting'
    AND created_at < NOW() - INTERVAL '5 minutes';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- ALSO remove stuck "minting" or "confirming" entries older than 10 minutes
  DELETE FROM mint_queue
  WHERE status IN ('minting', 'confirming')
    AND created_at < NOW() - INTERVAL '10 minutes';

  -- Also remove old completed/failed entries (older than 1 hour)
  DELETE FROM mint_queue
  WHERE created_at < NOW() - INTERVAL '1 hour'
    AND status IN ('completed', 'failed');

  RETURN deleted_count;
END;
$;
```

### Step 2: Clear Current Stuck Entry (Immediate Fix)

**Option A: Use Admin Panel** (Easiest)
1. Go to `/admin`
2. Click "Tools" tab
3. Scroll to "Queue Management" card
4. Click "🗑️ Clear All" button
5. Confirm the action

**Option B: Run SQL Manually**
```sql
-- Delete the stuck entry directly
DELETE FROM mint_queue
WHERE status IN ('minting', 'confirming')
  AND created_at < NOW() - INTERVAL '5 minutes';
```

**Option C: Trigger Cleanup via Admin Panel**
1. Go to `/admin`
2. Click "Tools" tab
3. Click "🧹 Cleanup Stale" button
4. This runs the cleanup function (but only works AFTER Step 1)

## Verification

After running the fix:

### Check Queue is Empty
```sql
SELECT * FROM mint_queue;
```

Should return 0 rows (or only active valid entries).

### Test Cleanup Function
```sql
-- Should return 0 (nothing to clean)
SELECT cleanup_stale_queue_entries();
```

### Monitor Logs
Server logs should show:
```
🧹 Cleaned up N stale queue entries (5 min timeout for waiting)
```

## Prevention

After applying this fix, the system will automatically:
- Clean up "waiting" entries older than 5 minutes
- Clean up "minting" entries older than 10 minutes
- Clean up "confirming" entries older than 10 minutes
- Clean up "completed/failed" entries older than 1 hour

Cleanup runs every 30 seconds automatically.

## Why 10 Minutes?

- Transaction building: ~5 seconds
- User signing: Variable (user can take time)
- Transaction submission: ~2 seconds
- Blockchain confirmation: Up to 90 seconds (our timeout)
- Buffer: Extra time for slow networks

Total: 10 minutes is generous and ensures we don't kill valid mints while still cleaning up truly stuck entries.

## Future Improvements

Consider:
1. Add webhook/notification when queue entry is stuck for >5 minutes
2. Add admin UI to manually mark entries as failed
3. Add auto-retry mechanism for failed confirmations
4. Add metrics to track how often entries get stuck
