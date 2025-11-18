# NFT Reservation System

## 🚨 IMPORTANT FIX

**If you're getting either of these errors:**
```
null value in column "tx_hash" of relation "nft_sales_preprod" violates not-null constraint
```
OR
```
new row for relation "nft_sales_preprod" violates check constraint "nft_sales_preprod_valid_tx_hash"
```

**Quick Fix:** Run the SQL script in `supabase/fix_tx_hash_constraint.sql` in your Supabase SQL Editor.

This does TWO things:
1. Removes the `NOT NULL` constraint from `tx_hash` column
2. Updates the CHECK constraint to allow NULL values for reservations

---

## Overview

This system prevents concurrent minting conflicts when multiple users try to mint NFTs at the same time. Instead of multiple users potentially selecting the same NFT, we now **reserve** NFTs for 5 minutes when building the transaction, then **convert to sale** when the transaction is submitted.

## How It Works

### Before (Potential Race Condition):
1. User A selects NFT #123
2. User B selects NFT #123 (0.5 seconds later - same NFT!)
3. Both users sign their transactions
4. User A submits → Success ✅
5. User B submits → **Error** ❌ (NFT already sold)

### After (With Reservations):
1. User A requests mint → NFT #123 **reserved** for User A
2. User B requests mint → NFT #123 is reserved, so User B gets NFT #456
3. Both users sign their transactions
4. User A submits → Reservation converted to sale ✅
5. User B submits → Reservation converted to sale ✅

### Reservation Expiry:
- Reservations expire after **5 minutes**
- If a user abandons the mint (closes page, error, etc.), the reservation is cleaned up
- Expired reservations are automatically removed from the database

## Database Changes

### New Columns Added:
- `reserved_at` (TIMESTAMPTZ): Timestamp when NFT was reserved (NULL when sold)
- `reserved_by` (TEXT): Wallet address that reserved the NFT (NULL when sold)

### Updated Functions:
- `get_random_available_nft_*`: Now excludes reserved NFTs
- `get_random_available_nfts_*`: Now excludes reserved NFTs
- `get_available_nfts_*`: Now excludes reserved NFTs
- `get_sales_stats_*`: Only counts sold NFTs (reserved_at IS NULL)

### New Functions:
- `cleanup_expired_reservations_preprod()`: Removes expired reservations
- `cleanup_expired_reservations_mainnet()`: Removes expired reservations

## Code Changes

### 1. Database Layer (`src/lib/db.ts`)
Added functions:
- `reserveNFT(nftId, walletAddress)`: Reserve an NFT for a wallet
- `convertReservationToSale(nftId, txHash)`: Convert reservation to final sale
- `cancelReservation(nftId)`: Cancel a reservation if mint fails
- `cleanupExpiredReservations()`: Remove expired reservations

### 2. Build Transaction API (`src/app/api/mint/build-mint-tx/route.ts`)
Changed from:
```typescript
const selectedNFTIds = await getRandomAvailableNFTIds(1);
const nftId = selectedNFTIds[0];
```

To:
```typescript
// Get 5 candidates in case first ones are reserved
const candidateNFTIds = await getRandomAvailableNFTIds(5);

// Try to reserve each candidate until successful
for (const candidateId of candidateNFTIds) {
  const reserved = await reserveNFT(candidateId, userAddress);
  if (reserved) {
    nftId = candidateId;
    break;
  }
}
```

### 3. Submit Transaction API (`src/app/api/mint/submit-mint-tx/route.ts`)
Changed from:
```typescript
markNFTAsSold(nftData.id, userAddress, txHash);
```

To:
```typescript
await convertReservationToSale(nftData.id, txHash);
```

Also added error handling to cancel reservation if minting fails.

## Migration Steps

### IMPORTANT: Run this migration in Supabase SQL Editor

#### Option A: Fresh Installation (Recommended)
If you haven't run any reservation migrations yet:

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to**: Your Project → SQL Editor
3. **Create New Query**
4. **Copy and paste** the entire contents of `supabase/reservations_migration.sql`
5. **Run the query** (it's safe to run multiple times - it's idempotent)
6. **Verify migration**: Check that version 4 appears in schema_migrations table

#### Option B: Quick Fix (If you already ran the old migration)
If you already ran the migration and got the `tx_hash` constraint error:

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to**: Your Project → SQL Editor
3. **Create New Query**
4. **Copy and paste** the contents of `supabase/fix_tx_hash_constraint.sql`
5. **Run the query** - this will update the constraint to allow NULL
6. **Test minting** - should now work without errors

```sql
-- Verify migration was applied
SELECT * FROM schema_migrations ORDER BY version;
-- Should show version 4: 'nft_reservations'
```

### Verify Schema Changes

```sql
-- Check that new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('nft_sales_preprod', 'nft_sales_mainnet')
  AND column_name IN ('reserved_at', 'reserved_by')
ORDER BY table_name, column_name;
```

### Test Reservation System

```sql
-- Test reserving an NFT (preprod)
INSERT INTO nft_sales_preprod (nft_id, wallet_address, tx_hash, reserved_at, reserved_by)
VALUES (9999, 'addr_test1...', '', NOW(), 'addr_test1...');

-- Check that it's excluded from available NFTs
SELECT * FROM get_available_nfts_preprod()
WHERE nft_id = 9999;
-- Should return no rows

-- Clean up test
DELETE FROM nft_sales_preprod WHERE nft_id = 9999;
```

## Monitoring

### Check Active Reservations:
```sql
-- PREPROD reservations
SELECT nft_id, reserved_by, reserved_at,
       EXTRACT(EPOCH FROM (NOW() - reserved_at))/60 AS minutes_ago
FROM nft_sales_preprod
WHERE reserved_at IS NOT NULL
ORDER BY reserved_at DESC;

-- MAINNET reservations
SELECT nft_id, reserved_by, reserved_at,
       EXTRACT(EPOCH FROM (NOW() - reserved_at))/60 AS minutes_ago
FROM nft_sales_mainnet
WHERE reserved_at IS NOT NULL
ORDER BY reserved_at DESC;
```

### Manual Cleanup (if needed):
```sql
-- Clean up expired reservations (preprod)
SELECT cleanup_expired_reservations_preprod();

-- Clean up expired reservations (mainnet)
SELECT cleanup_expired_reservations_mainnet();
```

## Deployment Notes

1. **Migration must be run BEFORE deploying code** to Vercel
2. Old code will continue to work during migration (backwards compatible)
3. Once code is deployed, reservation system will be active
4. No downtime required

## Testing Concurrent Mints

To test that the system handles concurrent users:

1. Open two browser windows in incognito mode
2. Connect different wallets in each
3. Click "Mint NFT" in both windows simultaneously
4. Both should receive different NFTs
5. Check console logs - you should see reservation messages

## Troubleshooting

### Error: "null value in column tx_hash violates not-null constraint"

**Cause:** The original database schema had two issues:
1. Column defined as `NOT NULL` (doesn't allow NULL values)
2. CHECK constraint required length > 10 (doesn't allow NULL)

But reservations need to use `NULL` as a placeholder before the transaction is submitted.

**Fix:** Run `supabase/fix_tx_hash_constraint.sql` which does:
```sql
-- Remove NOT NULL constraint
ALTER TABLE nft_sales_preprod ALTER COLUMN tx_hash DROP NOT NULL;

-- Update CHECK constraint to allow NULL
ALTER TABLE nft_sales_preprod
  ADD CONSTRAINT nft_sales_preprod_valid_tx_hash
  CHECK (tx_hash IS NULL OR LENGTH(tx_hash) > 10);
```

**Details:**
- Reservations use `tx_hash = NULL` (no transaction yet)
- Sales use `tx_hash = '<actual-hash>'` (64+ character hex string)
- The constraints now allow both cases

### If users get "No NFTs available" error:
- Check active reservations (query above)
- Run cleanup function manually
- Check that migration was applied correctly

### If same NFT is minted twice (shouldn't happen):
- Check that migration version 4 is in schema_migrations
- Verify functions were updated (check function definitions)
- Check application logs for reservation errors

### If reservations are never cleaned up:
- The cleanup happens automatically when `reserveNFT()` is called
- You can also run `cleanup_expired_reservations_*()` manually via cron job or API endpoint

## Future Improvements

Potential enhancements:
- Add API endpoint for manual cleanup (e.g., `/api/admin/cleanup`)
- Add monitoring dashboard for active reservations
- Implement websocket notifications when reservations expire
- Add user notification if their reservation is about to expire
