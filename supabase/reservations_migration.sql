-- NFT Reservations Migration
-- Adds reservation support to prevent concurrent minting conflicts
-- Run this in Supabase SQL Editor

-- Add reservation columns to PREPROD table
ALTER TABLE nft_sales_preprod
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reserved_by TEXT;

-- Add reservation columns to MAINNET table
ALTER TABLE nft_sales_mainnet
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reserved_by TEXT;

-- Update tx_hash to allow NULL values (for reservations)
-- Step 1: Remove NOT NULL constraint from column
ALTER TABLE nft_sales_preprod ALTER COLUMN tx_hash DROP NOT NULL;
ALTER TABLE nft_sales_mainnet ALTER COLUMN tx_hash DROP NOT NULL;

-- Step 2: Drop old CHECK constraints
ALTER TABLE nft_sales_preprod DROP CONSTRAINT IF EXISTS nft_sales_preprod_valid_tx_hash;
ALTER TABLE nft_sales_mainnet DROP CONSTRAINT IF EXISTS nft_sales_mainnet_valid_tx_hash;

-- Step 3: Add new CHECK constraints: tx_hash can be NULL OR must be > 10 chars
ALTER TABLE nft_sales_preprod
  ADD CONSTRAINT nft_sales_preprod_valid_tx_hash
  CHECK (tx_hash IS NULL OR LENGTH(tx_hash) > 10);

ALTER TABLE nft_sales_mainnet
  ADD CONSTRAINT nft_sales_mainnet_valid_tx_hash
  CHECK (tx_hash IS NULL OR LENGTH(tx_hash) > 10);

-- Add indexes for reservation queries
CREATE INDEX IF NOT EXISTS idx_nft_sales_preprod_reserved ON nft_sales_preprod(reserved_at) WHERE reserved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nft_sales_mainnet_reserved ON nft_sales_mainnet(reserved_at) WHERE reserved_at IS NOT NULL;

-- Comments
COMMENT ON COLUMN nft_sales_preprod.reserved_at IS 'Timestamp when NFT was reserved (NULL when sold)';
COMMENT ON COLUMN nft_sales_preprod.reserved_by IS 'Wallet address that reserved the NFT';
COMMENT ON COLUMN nft_sales_mainnet.reserved_at IS 'Timestamp when NFT was reserved (NULL when sold)';
COMMENT ON COLUMN nft_sales_mainnet.reserved_by IS 'Wallet address that reserved the NFT';
COMMENT ON COLUMN nft_sales_preprod.tx_hash IS 'Transaction hash (NULL for reservations, required for sales)';
COMMENT ON COLUMN nft_sales_mainnet.tx_hash IS 'Transaction hash (NULL for reservations, required for sales)';

-- ============================================================================
-- PREPROD Functions (Updated to exclude reserved NFTs)
-- ============================================================================

-- Get random available NFT (excludes sold AND reserved within 5 min)
CREATE OR REPLACE FUNCTION get_random_available_nft_preprod()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  available_nft_id INTEGER;
BEGIN
  SELECT nft_id INTO available_nft_id
  FROM generate_series(1, 2000) AS nft_id
  WHERE nft_id NOT IN (
    SELECT nft_id FROM nft_sales_preprod
    WHERE
      -- Exclude sold NFTs (no reserved_at means it's sold)
      reserved_at IS NULL
      OR
      -- Exclude reserved NFTs within last 5 minutes
      (reserved_at IS NOT NULL AND reserved_at > NOW() - INTERVAL '5 minutes')
  )
  ORDER BY RANDOM()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  RETURN available_nft_id;
END;
$$;

-- Get multiple random available NFTs
CREATE OR REPLACE FUNCTION get_random_available_nfts_preprod(count INTEGER)
RETURNS TABLE(nft_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT gs.nft_id
  FROM generate_series(1, 2000) AS gs(nft_id)
  WHERE gs.nft_id NOT IN (
    SELECT nft_sales_preprod.nft_id FROM nft_sales_preprod
    WHERE
      reserved_at IS NULL
      OR
      (reserved_at IS NOT NULL AND reserved_at > NOW() - INTERVAL '5 minutes')
  )
  ORDER BY RANDOM()
  LIMIT count
  FOR UPDATE SKIP LOCKED;
END;
$$;

-- Get all available NFTs
CREATE OR REPLACE FUNCTION get_available_nfts_preprod()
RETURNS TABLE(nft_id INTEGER)
LANGUAGE sql
STABLE
AS $$
  SELECT gs.nft_id
  FROM generate_series(1, 2000) AS gs(nft_id)
  WHERE gs.nft_id NOT IN (
    SELECT nft_sales_preprod.nft_id FROM nft_sales_preprod
    WHERE
      reserved_at IS NULL
      OR
      (reserved_at IS NOT NULL AND reserved_at > NOW() - INTERVAL '5 minutes')
  )
  ORDER BY gs.nft_id;
$$;

-- Get sales stats (counts sold NFTs only, not reservations)
CREATE OR REPLACE FUNCTION get_sales_stats_preprod()
RETURNS TABLE(
  total_sold BIGINT,
  total_available BIGINT,
  latest_sale TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*) FILTER (WHERE reserved_at IS NULL) AS total_sold,
    (2000 - COUNT(*) FILTER (WHERE reserved_at IS NULL OR (reserved_at IS NOT NULL AND reserved_at > NOW() - INTERVAL '5 minutes'))) AS total_available,
    MAX(sold_at) FILTER (WHERE reserved_at IS NULL) AS latest_sale
  FROM nft_sales_preprod;
$$;

-- ============================================================================
-- MAINNET Functions (Updated to exclude reserved NFTs)
-- ============================================================================

-- Get random available NFT (excludes sold AND reserved within 5 min)
CREATE OR REPLACE FUNCTION get_random_available_nft_mainnet()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  available_nft_id INTEGER;
BEGIN
  SELECT nft_id INTO available_nft_id
  FROM generate_series(1, 2000) AS nft_id
  WHERE nft_id NOT IN (
    SELECT nft_id FROM nft_sales_mainnet
    WHERE
      reserved_at IS NULL
      OR
      (reserved_at IS NOT NULL AND reserved_at > NOW() - INTERVAL '5 minutes')
  )
  ORDER BY RANDOM()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  RETURN available_nft_id;
END;
$$;

-- Get multiple random available NFTs
CREATE OR REPLACE FUNCTION get_random_available_nfts_mainnet(count INTEGER)
RETURNS TABLE(nft_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT gs.nft_id
  FROM generate_series(1, 2000) AS gs(nft_id)
  WHERE gs.nft_id NOT IN (
    SELECT nft_sales_mainnet.nft_id FROM nft_sales_mainnet
    WHERE
      reserved_at IS NULL
      OR
      (reserved_at IS NOT NULL AND reserved_at > NOW() - INTERVAL '5 minutes')
  )
  ORDER BY RANDOM()
  LIMIT count
  FOR UPDATE SKIP LOCKED;
END;
$$;

-- Get all available NFTs
CREATE OR REPLACE FUNCTION get_available_nfts_mainnet()
RETURNS TABLE(nft_id INTEGER)
LANGUAGE sql
STABLE
AS $$
  SELECT gs.nft_id
  FROM generate_series(1, 2000) AS gs(nft_id)
  WHERE gs.nft_id NOT IN (
    SELECT nft_sales_mainnet.nft_id FROM nft_sales_mainnet
    WHERE
      reserved_at IS NULL
      OR
      (reserved_at IS NOT NULL AND reserved_at > NOW() - INTERVAL '5 minutes')
  )
  ORDER BY gs.nft_id;
$$;

-- Get sales stats (counts sold NFTs only, not reservations)
CREATE OR REPLACE FUNCTION get_sales_stats_mainnet()
RETURNS TABLE(
  total_sold BIGINT,
  total_available BIGINT,
  latest_sale TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*) FILTER (WHERE reserved_at IS NULL) AS total_sold,
    (2000 - COUNT(*) FILTER (WHERE reserved_at IS NULL OR (reserved_at IS NOT NULL AND reserved_at > NOW() - INTERVAL '5 minutes'))) AS total_available,
    MAX(sold_at) FILTER (WHERE reserved_at IS NULL) AS latest_sale
  FROM nft_sales_mainnet;
$$;

-- ============================================================================
-- Cleanup Functions (for expired reservations)
-- ============================================================================

-- Clean up expired reservations for PREPROD
CREATE OR REPLACE FUNCTION cleanup_expired_reservations_preprod()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM nft_sales_preprod
  WHERE reserved_at IS NOT NULL
    AND reserved_at < NOW() - INTERVAL '5 minutes';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Clean up expired reservations for MAINNET
CREATE OR REPLACE FUNCTION cleanup_expired_reservations_mainnet()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM nft_sales_mainnet
  WHERE reserved_at IS NOT NULL
    AND reserved_at < NOW() - INTERVAL '5 minutes';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Mark migration as applied
INSERT INTO schema_migrations (version, name) VALUES (4, 'nft_reservations') ON CONFLICT DO NOTHING;
