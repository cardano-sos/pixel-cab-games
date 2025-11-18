# Queue Duplicate Entry Fix

## The Problem

**Issue:** The same user could have multiple positions in the queue simultaneously.

### What Was Happening:

1. **Window 1:** User clicks "Mint" → Creates queue entry → Position 3
2. **Window 2:** User clicks "Mint" → Creates ANOTHER queue entry for same wallet → Position 4
3. **Both windows refresh:** localStorage saves the latest queueId → Both show Position 4

**Result:** The same wallet address had TWO entries in the queue, taking up multiple positions!

### Root Cause:

The `addToQueue()` function in `src/lib/mintQueue.ts` blindly created a new queue entry every time it was called, without checking if the wallet already had an active entry:

```typescript
// OLD CODE (BROKEN):
async addToQueue(walletAddress: string) {
  const queueId = `${walletAddress}-${Date.now()}`;

  // Just creates a new entry every time!
  await supabase.from('mint_queue').insert({
    id: queueId,
    wallet_address: walletAddress,
    status: 'waiting'
  });

  // ...
}
```

**Problems this caused:**
- Same user could be at positions #3 AND #4 at the same time
- Multiple browser windows/tabs created multiple queue entries
- Refreshing would show different positions in different windows
- Unfair to other users - one person taking multiple queue spots
- Queue length was inflated

## The Fix

Updated `addToQueue()` to check for existing active entries before creating a new one:

```typescript
// NEW CODE (FIXED):
async addToQueue(walletAddress: string) {
  // First, check if this wallet already has an active queue entry
  const { data: existingEntry } = await supabase
    .from('mint_queue')
    .select('*')
    .eq('wallet_address', walletAddress)
    .in('status', ['waiting', 'minting', 'confirming'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // If they already have an active entry, return that instead
  if (existingEntry) {
    const { data: positionData } = await supabase
      .rpc('get_queue_position', { queue_id: existingEntry.id });

    const position = positionData || 1;

    console.log(`🔄 ${walletAddress} already in queue at position ${position}`);
    return { queueId: existingEntry.id, position };
  }

  // No active entry found, create a new one
  const queueId = `${walletAddress}-${Date.now()}`;

  await supabase.from('mint_queue').insert({
    id: queueId,
    wallet_address: walletAddress,
    status: 'waiting'
  });

  // ...
}
```

## How It Works Now

### Scenario 1: Normal Single Window Use
```
1. User clicks "Mint" → Check for existing entry → None found → Create new entry → Position 3
2. User waits in queue...
3. User's turn comes → Mints successfully → Queue entry removed
```
✅ **Works perfectly**

### Scenario 2: Multiple Windows (FIXED)
```
Window 1:
1. Click "Mint" → Check for existing entry → None found → Create entry #1 → Position 3
2. Wait in queue...

Window 2 (same wallet):
1. Click "Mint" → Check for existing entry → FOUND entry #1! → Return entry #1 → Position 3
2. Both windows now show SAME position

Refresh both windows:
1. Restore queueId from localStorage → Both have entry #1 → Both show Position 3
```
✅ **Both windows show SAME position**

### Scenario 3: After Successful Mint
```
1. User mints successfully → Queue entry completed → Removed from queue
2. User clicks "Mint Another Collectible" → Check for existing entry → None (was removed) → Create NEW entry → Position 15
3. User waits again from position #15
```
✅ **Can mint again but goes to back of queue**

### Scenario 4: User Abandons Queue
```
1. User joins queue → Position 5
2. User closes browser
3. 5 minutes pass → Cleanup runs → Entry removed
4. User comes back, clicks "Mint" → Check for existing entry → None (was cleaned up) → Create new entry → Position 20
```
✅ **Timed out entries don't block new mints**

## What This Prevents

❌ **Multiple queue positions per wallet**
- Before: Same wallet could be at #3 AND #4
- After: Same wallet only at ONE position

❌ **Inconsistent positions across windows/tabs**
- Before: Window 1 shows #3, Window 2 shows #4
- After: Both windows show #3

❌ **Queue position jumping on refresh**
- Before: Refresh could change your position
- After: Position stays the same across refreshes

❌ **Queue spam**
- Before: Spamming "Mint" button created many entries
- After: Spamming "Mint" button returns same entry

## Edge Cases Handled

### 1. User Already Minting
```
Window 1: Status = 'minting', Position = 1
Window 2: Clicks "Mint" → Finds existing entry with status 'minting' → Returns same entry
Result: Both windows see they're minting (no duplicate created)
```

### 2. User Already Confirming
```
Window 1: Status = 'confirming', Position = 1
Window 2: Clicks "Mint" → Finds existing entry with status 'confirming' → Returns same entry
Result: Both windows see transaction is confirming (no duplicate created)
```

### 3. User Completed Mint
```
Window 1: Status = 'completed' → Entry gets deleted after 5 seconds
Window 2: Clicks "Mint" → No active entry found (completed entries aren't counted) → Creates NEW entry
Result: User can mint again with new queue entry
```

### 4. User Failed Mint
```
Window 1: Status = 'failed' → Entry gets deleted after 5 seconds
Window 2: Clicks "Mint" → No active entry found (failed entries aren't counted) → Creates NEW entry
Result: User can try again with new queue entry
```

## Database Query Details

The check for existing entries uses:

```sql
SELECT * FROM mint_queue
WHERE wallet_address = '<user_wallet>'
  AND status IN ('waiting', 'minting', 'confirming')
ORDER BY created_at DESC
LIMIT 1;
```

**Why these statuses?**
- `waiting` - User is in queue waiting
- `minting` - User is building/signing transaction
- `confirming` - User is waiting for blockchain confirmation

**Why NOT these statuses?**
- `completed` - Mint succeeded, entry will be removed soon, user can mint again
- `failed` - Mint failed, entry will be removed soon, user can try again

**Order by created_at DESC:**
- Gets the MOST RECENT entry if somehow there are duplicates (from before this fix)

**Limit 1:**
- Only need to know if ANY active entry exists

## Server Logs

### Before Fix:
```
📝 Added addr_test1... to queue at position 3
📝 Added addr_test1... to queue at position 4  ← DUPLICATE!
```

### After Fix:
```
📝 Added addr_test1... to queue at position 3
🔄 addr_test1... already in queue at position 3 (queue ID: addr_test1...-1234567890)  ← REUSED!
```

## Testing

To verify the fix works:

### Test 1: Multiple Windows
1. Open two browser windows to `/mint`
2. Connect same wallet in both
3. Window 1: Click "Mint"
4. Window 2: Click "Mint"
5. **Expected:** Both show SAME position
6. **Check logs:** Should see "already in queue" message for Window 2

### Test 2: Refresh Behavior
1. Join queue (position 5)
2. Refresh page
3. **Expected:** Still position 5
4. Open new window
5. **Expected:** Also position 5

### Test 3: Queue After Success
1. Mint successfully
2. Click "Mint Another Collectible"
3. **Expected:** Goes to back of queue (new position)
4. **Check logs:** Should see "Added to queue" (not "already in queue")

## Summary

This fix ensures:
- ✅ One wallet = One queue position
- ✅ Multiple windows/tabs show same position
- ✅ Refreshing doesn't change position
- ✅ Can still mint again after success (new entry)
- ✅ Fair queue for all users
- ✅ Accurate queue length

The queue now works correctly across multiple browser windows and refreshes!
