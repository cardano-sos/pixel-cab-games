-- Quick Fix: Update tx_hash to allow NULL values
-- Run this if you already ran the reservations_migration.sql and got constraint errors
-- This is safe to run multiple times

-- STEP 1: Allow NULL values in the tx_hash column
ALTER TABLE nft_sales_preprod ALTER COLUMN tx_hash DROP NOT NULL;
ALTER TABLE nft_sales_mainnet ALTER COLUMN tx_hash DROP NOT NULL;

-- STEP 2: Drop old CHECK constraints
ALTER TABLE nft_sales_preprod DROP CONSTRAINT IF EXISTS nft_sales_preprod_valid_tx_hash;
ALTER TABLE nft_sales_mainnet DROP CONSTRAINT IF EXISTS nft_sales_mainnet_valid_tx_hash;

-- STEP 3: Add new CHECK constraints: tx_hash can be NULL (for reservations) OR must be > 10 chars (for sales)
ALTER TABLE nft_sales_preprod
  ADD CONSTRAINT nft_sales_preprod_valid_tx_hash
  CHECK (tx_hash IS NULL OR LENGTH(tx_hash) > 10);

ALTER TABLE nft_sales_mainnet
  ADD CONSTRAINT nft_sales_mainnet_valid_tx_hash
  CHECK (tx_hash IS NULL OR LENGTH(tx_hash) > 10);

-- Verify the constraints were updated
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_name LIKE '%valid_tx_hash'
ORDER BY tc.table_name;
