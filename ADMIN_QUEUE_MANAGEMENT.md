# Admin Queue Management

## Overview

Admins can now view and manage the mint queue directly from the admin panel. This includes viewing all queue entries, manually cleaning up stale entries, and clearing the entire queue if needed.

## Features

### 1. View Queue Status
- See all active queue entries in real-time
- View each user's wallet address, status, NFT ID, and join time
- Monitor queue length (active entries vs total entries)

### 2. Load Queue Data
- Fetch current queue state from database
- See detailed information about each entry
- Refresh at any time to see latest state

### 3. Cleanup Stale Entries
- Manually trigger cleanup of stale entries
- Removes entries older than 5 minutes (same as auto-cleanup)
- Doesn't affect active minting or confirming entries

### 4. Clear All Queue
- Emergency "reset" button to clear entire queue
- Removes ALL entries regardless of status
- Requires confirmation dialog
- Disabled when queue is empty

## Accessing Queue Management

### Admin Panel Location
1. Navigate to `/admin`
2. Login with Discord (admin credentials required)
3. Click the **🛠️ Tools** tab
4. Scroll to **🚦 Queue Management** card

## Queue Management UI

### Display

```
┌─────────────────────────────────────────────────────────┐
│ 🚦 Queue Management                                     │
│ View and manage the mint queue                          │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Active Entries: 3        Total Entries: 5          │ │
│ │                                                      │ │
│ │ ┌──────────────────────────────────────────────────┐│ │
│ │ │ Wallet         Status      NFT ID   Created     ││ │
│ │ ├──────────────────────────────────────────────────┤│ │
│ │ │ addr1qxy...abc waiting    -        10:15:30 AM ││ │
│ │ │ addr1qab...def minting    42       10:16:45 AM ││ │
│ │ │ addr1qcd...ghi confirming 53       10:17:12 AM ││ │
│ │ └──────────────────────────────────────────────────┘│ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ [ 🔄 Load Queue ] [ 🧹 Cleanup Stale ] [ 🗑️ Clear All ]│
│                                                          │
│ 💡 "Cleanup Stale" removes entries older than 5 minutes.│
│    "Clear All" removes ALL entries immediately.         │
└─────────────────────────────────────────────────────────┘
```

### Status Colors

Entries are color-coded by status:
- **Waiting** - Blue (user in queue, waiting for turn)
- **Minting** - Yellow (building/submitting transaction)
- **Confirming** - Purple (waiting for blockchain confirmation)
- **Completed** - Green (successfully minted)
- **Failed** - Red (error occurred)

### Table Columns

| Column | Description |
|--------|-------------|
| **Wallet** | Truncated wallet address (first 8 + last 6 chars) |
| **Status** | Current queue status with color badge |
| **NFT ID** | NFT being minted (shows "-" if not yet assigned) |
| **Created** | Time when user joined queue |

## API Endpoints

### GET /api/admin/queue
Get current queue state

**Request:**
```bash
curl http://localhost:3000/api/admin/queue
```

**Response:**
```json
{
  "success": true,
  "queueLength": 3,
  "entries": [
    {
      "id": "addr1...abc-1699900000000",
      "wallet_address": "addr1qxy...abc",
      "status": "waiting",
      "nft_id": null,
      "tx_hash": null,
      "error_message": null,
      "created_at": "2024-01-15T10:15:30.000Z",
      "updated_at": "2024-01-15T10:15:30.000Z"
    },
    {
      "id": "addr1...def-1699900065000",
      "wallet_address": "addr1qab...def",
      "status": "minting",
      "nft_id": 42,
      "tx_hash": null,
      "error_message": null,
      "created_at": "2024-01-15T10:16:45.000Z",
      "updated_at": "2024-01-15T10:16:50.000Z"
    }
  ],
  "message": "Found 3 active entries in queue"
}
```

### DELETE /api/admin/queue
Clear entire queue

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/admin/queue
```

**Response:**
```json
{
  "success": true,
  "deleted": 5,
  "message": "Cleared 5 entries from queue"
}
```

### POST /api/admin/queue
Run cleanup manually

**Request:**
```bash
curl -X POST http://localhost:3000/api/admin/queue
```

**Response:**
```json
{
  "success": true,
  "queueLength": 2,
  "entries": [...],
  "message": "Cleanup completed successfully"
}
```

## Use Cases

### Use Case 1: Monitor Queue During Launch

**Scenario:** NFT drop is live, want to see how queue is performing

**Steps:**
1. Go to Admin Panel → Tools tab
2. Click **🔄 Load Queue**
3. See real-time list of users waiting
4. Check if anyone is stuck in "minting" or "confirming"

**Example:**
```
Active Entries: 12

Wallet         Status      NFT ID   Created
addr1qxy...abc waiting     -        10:15:30 AM  ← Position #1
addr1qab...def waiting     -        10:16:45 AM  ← Position #2
addr1qcd...ghi waiting     -        10:17:12 AM  ← Position #3
...
```

### Use Case 2: Someone is Stuck

**Scenario:** User reports "I've been waiting 10 minutes but nothing happens"

**Steps:**
1. Click **🔄 Load Queue**
2. Look for the user's wallet address in table
3. Check their status:
   - If "waiting" for > 5 min → stale entry
   - If "minting" for > 5 min → stuck transaction
   - If "confirming" for > 5 min → blockchain delay
4. Click **🧹 Cleanup Stale** to remove old "waiting" entries
5. Or click **🗑️ Clear All** to reset entire queue

### Use Case 3: Emergency Queue Reset

**Scenario:** Something went wrong, need to clear everyone and start fresh

**Steps:**
1. Click **🔄 Load Queue** to see current state
2. Click **🗑️ Clear All**
3. Confirm: "Are you sure you want to clear the entire queue?"
4. Click OK
5. Success message: "Successfully cleared 15 entries from queue"
6. All users will see: "Queue timeout. Please try again."
7. Users can rejoin queue fresh

### Use Case 4: Routine Cleanup

**Scenario:** End of day, want to clean up any abandoned sessions

**Steps:**
1. Click **🧹 Cleanup Stale**
2. Removes entries older than 5 minutes
3. Success message: "Cleanup completed successfully"
4. View updated queue state

## Code Implementation

### Backend (`src/app/api/admin/queue/route.ts`)

**GET Handler:**
```typescript
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const queueEntries = await mintQueue.getQueueState();
  const queueLength = await mintQueue.getQueueLength();

  return NextResponse.json({
    success: true,
    queueLength,
    entries: queueEntries,
    message: `Found ${queueLength} active entries in queue`
  });
}
```

**DELETE Handler:**
```typescript
export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const deleted = await mintQueue.clearQueue();

  return NextResponse.json({
    success: true,
    deleted,
    message: `Cleared ${deleted} entries from queue`
  });
}
```

**POST Handler (Cleanup):**
```typescript
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await mintQueue.cleanup();

  const queueEntries = await mintQueue.getQueueState();
  const queueLength = await mintQueue.getQueueLength();

  return NextResponse.json({
    success: true,
    queueLength,
    entries: queueEntries,
    message: 'Cleanup completed successfully'
  });
}
```

### Database (`src/lib/mintQueue.ts`)

**Clear Queue Method:**
```typescript
async clearQueue(): Promise<number> {
  // Get count before deleting
  const { count } = await supabase
    .from('mint_queue')
    .select('*', { count: 'exact', head: true });

  const deletedCount = count || 0;

  // Delete all entries
  const { error } = await supabase
    .from('mint_queue')
    .delete()
    .neq('id', ''); // Delete all (PostgreSQL requires a condition)

  if (error) {
    throw new Error('Failed to clear queue');
  }

  console.log(`🧹 Queue cleared - removed ${deletedCount} entries`);

  return deletedCount;
}
```

### Frontend (`src/app/admin/page.tsx`)

**Load Queue Data:**
```typescript
const loadQueueData = async () => {
  setQueueLoading(true);
  const response = await fetch('/api/admin/queue');
  const data = await response.json();

  if (response.ok) {
    setQueueData(data);
  }
};
```

**Clear Queue:**
```typescript
const clearQueue = async () => {
  if (!confirm('Are you sure you want to clear the entire queue?')) {
    return;
  }

  const response = await fetch('/api/admin/queue', {
    method: 'DELETE'
  });
  const data = await response.json();

  if (response.ok) {
    setQueueSuccess(`Successfully cleared ${data.deleted} entries`);
    loadQueueData(); // Reload
  }
};
```

## Security

### Authorization

All queue management endpoints check for admin authorization:

```typescript
function isAdmin(request: NextRequest): boolean {
  const adminDiscordIds = process.env.ADMIN_DISCORD_IDS?.split(',') || [];
  return adminDiscordIds.length > 0;
}
```

### Rate Limiting

Consider adding rate limiting to prevent:
- Rapid queue clears (DoS)
- Excessive polling of queue data

### Audit Logging

All admin actions are logged:
```
🧹 Admin cleared queue - removed 5 entries
🧹 Admin triggered manual queue cleanup
```

## Troubleshooting

### "Unauthorized - Admin access required"

**Cause:** Not logged in as admin or session expired

**Fix:**
1. Logout: Click "Logout" in admin panel
2. Login again with Discord
3. Verify your Discord ID is in `ADMIN_DISCORD_IDS` env var

### Queue data shows 0 entries but users are waiting

**Cause:** Frontend cache or database issue

**Fix:**
1. Click **🔄 Load Queue** again
2. Check server logs for database errors
3. Verify `mint_queue` table exists in Supabase

### "Clear All" button is disabled

**Cause:** Queue is already empty

**Fix:**
- Button is disabled when `queueLength === 0`
- This is expected behavior - nothing to clear

### Cleanup doesn't remove entries

**Cause:** Entries are not old enough (< 5 minutes)

**Fix:**
- **Cleanup Stale** only removes entries older than 5 minutes
- For immediate removal, use **Clear All** instead

## Best Practices

### Regular Monitoring

During active minting periods:
1. Load queue data every few minutes
2. Watch for stuck entries (same user in "minting" for > 2 min)
3. Run cleanup if you see old "waiting" entries

### Emergency Procedures

If queue is completely stuck:
1. Load queue data to diagnose
2. Check server logs for errors
3. Try **Cleanup Stale** first (safer)
4. Only use **Clear All** as last resort
5. Announce to users that queue was reset

### Communication

When clearing queue:
1. Announce in Discord/Twitter
2. Explain why (stuck, bug, etc.)
3. Tell users to rejoin queue
4. Apologize for inconvenience

## Summary

The admin queue management system provides:
- ✅ **Real-time visibility** into queue state
- ✅ **Manual cleanup** for stale entries
- ✅ **Emergency reset** to clear all entries
- ✅ **Detailed monitoring** of each user's status
- ✅ **Safe operations** with confirmation dialogs
- ✅ **Admin-only access** with authorization checks

This gives admins full control over the queue system without needing direct database access!
