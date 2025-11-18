-- IMMEDIATE FIX: Manually delete stuck "Reserved" entries
-- Run this in Supabase SQL Editor to immediately clean up

-- =====================================================
-- STEP 1: Check if cleanup function exists
-- =====================================================
SELECT proname FROM pg_proc WHERE proname LIKE 'cleanup_expired%';

-- If you see cleanup_expired_reservations_preprod and cleanup_expired_reservations_mainnet,
-- the functions exist. If not, continue to Step 2.

-- =====================================================
-- STEP 2: Create the cleanup functions (if they don't exist)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_reservations_preprod()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete reservations older than 10 minutes that still have tx_hash = NULL
  DELETE FROM nft_sales_preprod
  WHERE tx_hash IS NULL
    AND reserved_at IS NOT NULL
    AND reserved_at < NOW() - INTERVAL '10 minutes';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE 'Cleaned up % expired reservations from PREPROD', deleted_count;
  END IF;

  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_expired_reservations_mainnet()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete reservations older than 10 minutes that still have tx_hash = NULL
  DELETE FROM nft_sales_mainnet
  WHERE tx_hash IS NULL
    AND reserved_at IS NOT NULL
    AND reserved_at < NOW() - INTERVAL '10 minutes';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE 'Cleaned up % expired reservations from MAINNET', deleted_count;
  END IF;

  RETURN deleted_count;
END;
$$;

-- =====================================================
-- STEP 3: IMMEDIATE FIX - Delete ALL "Reserved" entries (PREPROD)
-- =====================================================
-- This removes ALL reservations with NULL tx_hash regardless of age
DELETE FROM nft_sales_preprod
WHERE tx_hash IS NULL
  AND reserved_at IS NOT NULL;

-- Check how many were deleted (should show in query results)

-- =====================================================
-- STEP 4: (Optional) IMMEDIATE FIX - Delete specific entry by NFT ID
-- =====================================================
-- If you know the specific NFT ID (e.g., 628), delete just that one:
-- DELETE FROM nft_sales_preprod WHERE nft_id = 628 AND tx_hash IS NULL;

-- =====================================================
-- STEP 5: Verify it's gone
-- =====================================================
SELECT nft_id, wallet_address, tx_hash, reserved_at, sold_at
FROM nft_sales_preprod
WHERE tx_hash IS NULL
ORDER BY reserved_at DESC;

-- Should return 0 rows if all reservations are cleaned up

-- =====================================================
-- STEP 6: Test the cleanup function
-- =====================================================
SELECT cleanup_expired_reservations_preprod();

-- Should return 0 (nothing to clean) since we already cleaned everything manually
