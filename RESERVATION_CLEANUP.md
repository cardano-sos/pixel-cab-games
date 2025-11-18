# Reservation Cleanup System

## Problem

When users start minting but don't complete it (close browser, error occurs, etc.), a **reservation** is created in the `nft_sales` table with:
- `tx_hash` = NULL
- `reserved_at` = timestamp
- `reserved_by` = wallet address

These reservations show up in "Recent Sales" as **"Reserved"** and never get cleaned up automatically.

Example:
```
Recent Sales (PREPROD)
NFT ID    Wallet              TX Hash      Date
#628      addr_test1qz...    Reserved     2025-11-17, 6:35:15 p.m.
```

## Solution

### Step 1: Run SQL Migration (One-Time Setup)

Open your Supabase SQL Editor and run:

**File:** `supabase/cleanup_expired_reservations.sql`

This creates two SQL functions:
- `cleanup_expired_reservations_preprod()` - Cleans PREPROD reservations
- `cleanup_expired_reservations_mainnet()` - Cleans MAINNET reservations

**What it does:**
Removes reservations that are:
- Older than 10 minutes
- Still have `tx_hash` = NULL (never completed)
- Have `reserved_at` set (indicating it was a reservation)

### Step 2: Use Admin Panel to Clean Up

1. Go to `/admin`
2. Click the **"Tools"** tab
3. Find the **"🧹 Reservation Cleanup"** card
4. Click **"🧹 Cleanup Reservations"** button

This will:
- Call the SQL function to remove old reservations
- Refresh the stats/sales data
- Show success message with count of cleaned entries

### Alternative: Clear Queue AND Reservations

If you need to clear everything:

1. **Clear Queue:** Click "🗑️ Clear All" in Queue Management
   - Removes all entries from `mint_queue`
   - BUT leaves reservations in `nft_sales`

2. **Clean Reservations:** Click "🧹 Cleanup Reservations" in Reservation Cleanup
   - Removes old entries from `nft_sales` where `tx_hash` is NULL
   - Updates the "Recent Sales" display

## How It Works

### Database Structure

```sql
-- Before cleanup
SELECT nft_id, wallet_address, tx_hash, reserved_at
FROM nft_sales_preprod;

nft_id | wallet_address        | tx_hash | reserved_at
-------|----------------------|---------|-------------------
628    | addr_test1qz...     | NULL    | 2025-11-17 18:35:15
```

### Cleanup Function

```sql
-- The SQL function
CREATE OR REPLACE FUNCTION cleanup_expired_reservations_preprod()
RETURNS INTEGER
AS $$
BEGIN
  DELETE FROM nft_sales_preprod
  WHERE tx_hash IS NULL
    AND reserved_at IS NOT NULL
    AND reserved_at < NOW() - INTERVAL '10 minutes';

  RETURN deleted_count;
END;
$$;
```

### API Endpoint

```bash
# POST /api/admin/reservations
curl -X POST http://localhost:3000/api/admin/reservations

# Response:
{
  "success": true,
  "cleaned": 1,
  "message": "Cleaned up 1 expired reservation(s)"
}
```

## Admin Panel UI

The new "Reservation Cleanup" card shows:

```
┌─────────────────────────────────────────────────┐
│ 🧹 Reservation Cleanup                          │
│ Remove abandoned reservations from Recent Sales │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ Clean up reservations that are:             │ │
│ │ • Older than 10 minutes                     │ │
│ │ • Still showing "Reserved" (no TX hash)     │ │
│ │ • From abandoned mint attempts              │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│          [ 🧹 Cleanup Reservations ]             │
│                                                  │
│ 💡 This removes entries from "Recent Sales"     │
│    that show "Reserved" but were never completed│
└─────────────────────────────────────────────────┘
```

## Why 10 Minutes?

- User joins queue: ~0 seconds
- Wait in queue: Variable (could be instant or several minutes)
- Build transaction: ~5 seconds
- User signs: Variable (user can take time)
- Submit transaction: ~2 seconds
- Confirmation wait: Up to 90 seconds
- **Total: Usually < 5 minutes**

Using **10 minutes** ensures we don't delete reservations for legitimate slow users while still cleaning up truly abandoned entries.

## When to Use This

### Use Case 1: After Clearing Queue

**Scenario:** You cleared the queue because someone was stuck

**Steps:**
1. Clear queue: "🗑️ Clear All"
2. Clean reservations: "🧹 Cleanup Reservations"
3. Verify: Click "Refresh" on Recent Sales

### Use Case 2: "Reserved" Entries Won't Go Away

**Scenario:** Recent Sales shows multiple "Reserved" entries from hours ago

**Steps:**
1. Click "🧹 Cleanup Reservations"
2. Success message: "Cleaned up 3 expired reservations"
3. Recent Sales updates automatically

### Use Case 3: Daily Maintenance

**Scenario:** End of day cleanup

**Steps:**
1. Check queue: "🔄 Load Queue"
2. Cleanup old queue entries: "🧹 Cleanup Stale"
3. Cleanup old reservations: "🧹 Cleanup Reservations"
4. Verify stats are accurate

## Troubleshooting

### Button Says "No expired reservations to clean up"

**Cause:** All reservations are either:
- Completed (have tx_hash)
- Less than 10 minutes old

**Fix:** This is normal! Nothing needs cleaning.

### Recent Sales Still Shows "Reserved"

**Cause 1:** Reservation is less than 10 minutes old
**Fix:** Wait until it's older than 10 minutes, then run cleanup

**Cause 2:** SQL function not created yet
**Fix:** Run `supabase/cleanup_expired_reservations.sql` in Supabase SQL Editor

### Error: "Failed to cleanup reservations"

**Cause:** SQL function doesn't exist or database error

**Fix:**
1. Run the SQL migration: `supabase/cleanup_expired_reservations.sql`
2. Verify function exists:
   ```sql
   SELECT proname FROM pg_proc WHERE proname LIKE 'cleanup_expired%';
   ```
3. Should see:
   - `cleanup_expired_reservations_preprod`
   - `cleanup_expired_reservations_mainnet`

## Code Files

### SQL Migration
- `supabase/cleanup_expired_reservations.sql` - Creates the cleanup functions

### API Endpoint
- `src/app/api/admin/reservations/route.ts` - Admin endpoint to trigger cleanup

### Frontend
- `src/app/admin/page.tsx` - Admin panel UI with cleanup button

### Database Functions
- `src/lib/db.ts` - Contains `cleanupExpiredReservations()` function

## Summary

This system automatically cleans up abandoned reservations, keeping your "Recent Sales" accurate and preventing ghost entries that show "Reserved" forever.

**Key Points:**
- ✅ Removes reservations older than 10 minutes with no tx_hash
- ✅ One-click cleanup from admin panel
- ✅ Safe - only removes abandoned mints, not completed sales
- ✅ Works for both PREPROD and MAINNET
