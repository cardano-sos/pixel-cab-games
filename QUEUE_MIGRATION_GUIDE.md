# Database Queue Migration Guide

## What Changed?

The mint queue has been migrated from in-memory storage to a persistent database-backed queue in Supabase. This fixes the issue where the queue was lost on server restart and enables multiple users from different computers to mint concurrently.

## Why This Migration is Needed

**Before:** Queue stored in JavaScript memory
- Lost when server restarts or hot-reloads
- Doesn't work across multiple server instances
- Can't persist queue between different computers

**After:** Queue stored in Supabase database
- Persists across server restarts
- Works with multiple server instances
- Queue survives even if you close your laptop
- Multiple users from different computers can join the queue

## Migration Steps

### 1. Run the Database Migration

Open your Supabase Dashboard and run the migration SQL:

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
2. Copy the contents of `supabase/queue_table_migration.sql`
3. Paste into the SQL Editor
4. Click "Run"

### 2. Verify Migration Success

After running the migration, verify it was successful:

```sql
-- Check if table exists
SELECT * FROM mint_queue;

-- Check if functions exist
SELECT get_queue_position('test');
SELECT * FROM get_next_in_queue();
SELECT cleanup_old_queue_entries();
```

You should see:
- `mint_queue` table exists (returns empty result set)
- All three functions execute without error

### 3. Test the Queue System

1. Start your development server: `npm run dev`
2. Open the mint page in TWO different browser windows (or use incognito)
3. Connect a wallet in BOTH windows
4. Try to mint in BOTH windows at the same time
5. Verify:
   - First user proceeds immediately
   - Second user sees "You are #2 in queue"
   - Second user automatically proceeds after first completes

### 4. Test Queue Persistence

1. Join the queue (but don't mint yet)
2. Stop the dev server (Ctrl+C)
3. Restart the dev server: `npm run dev`
4. Check queue status - your position should still be there!

## What Was Modified

### Database Schema

**New Table: `mint_queue`**
- `id` - Unique queue ID (wallet_address-timestamp)
- `wallet_address` - User's Cardano wallet address
- `status` - Queue entry status (waiting, minting, confirming, completed, failed)
- `nft_id` - NFT being minted (set when minting starts)
- `tx_hash` - Transaction hash (set when tx submitted)
- `error_message` - Error details if failed
- `created_at` - When user joined (determines FIFO order)
- `updated_at` - Last update timestamp

**New SQL Functions:**
1. `get_queue_position(queue_id)` - Returns user's position in queue
2. `get_next_in_queue()` - Returns first waiting user
3. `cleanup_old_queue_entries()` - Removes old completed/failed entries (older than 1 hour)

### Code Changes

**`src/lib/mintQueue.ts`:**
- Added Supabase client
- All methods now async (return Promises)
- Replaced in-memory array with database queries

**API Routes Updated:**
- `src/app/api/queue/join/route.ts` - Already async ✅
- `src/app/api/queue/status/route.ts` - Added await
- `src/app/api/mint/build-mint-tx/route.ts` - Added await to all queue calls
- `src/app/api/mint/submit-mint-tx/route.ts` - Added await to all queue calls

## Rollback (if needed)

If you encounter issues and need to rollback:

```sql
-- Drop the new table and functions
DROP TABLE IF EXISTS mint_queue CASCADE;
DROP FUNCTION IF EXISTS get_queue_position(TEXT);
DROP FUNCTION IF EXISTS get_next_in_queue();
DROP FUNCTION IF EXISTS cleanup_old_queue_entries();
DELETE FROM schema_migrations WHERE version = 5;
```

Then revert the code changes using git:
```bash
git checkout HEAD -- src/lib/mintQueue.ts src/app/api/
```

## Troubleshooting

### "Queue entry not found" (404)
- The migration hasn't been run yet
- The queue table doesn't exist
- Run the migration SQL in Supabase

### "function get_next_in_queue() does not exist"
- The SQL functions weren't created
- Re-run the migration SQL

### "You are still waiting" even though no one is minting
- Old entries stuck in queue
- Run cleanup manually:
```sql
SELECT cleanup_old_queue_entries();
-- Or delete all queue entries:
DELETE FROM mint_queue;
```

## Next Steps

After successfully running the migration:
1. ✅ Database queue is now active
2. ✅ Queue persists across server restarts
3. ✅ Multiple users can queue from different computers
4. ✅ FIFO ordering is preserved
5. ✅ Old entries auto-cleanup every 2 minutes

You're ready to test multi-user concurrent minting!
