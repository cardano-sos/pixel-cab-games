-- Network-Aware Schema for Cardano NFT Minting
-- Supports both preprod (testnet) and mainnet networks

-- Create schema_migrations table (shared across networks)
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- PREPROD (Testnet) Tables
CREATE TABLE IF NOT EXISTS nft_sales_preprod (
  id BIGSERIAL PRIMARY KEY,
  nft_id INTEGER UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  tx_hash TEXT, -- NULL for reservations, populated on sale
  sold_at TIMESTAMPTZ DEFAULT NOW(),
  reserved_at TIMESTAMPTZ, -- Set when NFT is reserved, NULL when sold
  reserved_by TEXT, -- Wallet that reserved the NFT

  CONSTRAINT nft_sales_preprod_nft_id_range CHECK (nft_id >= 1 AND nft_id <= 2000),
  CONSTRAINT nft_sales_preprod_valid_wallet CHECK (LENGTH(wallet_address) > 10),
  CONSTRAINT nft_sales_preprod_valid_tx_hash CHECK (tx_hash IS NULL OR LENGTH(tx_hash) > 10)
);

-- MAINNET Tables
CREATE TABLE IF NOT EXISTS nft_sales_mainnet (
  id BIGSERIAL PRIMARY KEY,
  nft_id INTEGER UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  tx_hash TEXT, -- NULL for reservations, populated on sale
  sold_at TIMESTAMPTZ DEFAULT NOW(),
  reserved_at TIMESTAMPTZ, -- Set when NFT is reserved, NULL when sold
  reserved_by TEXT, -- Wallet that reserved the NFT

  CONSTRAINT nft_sales_mainnet_nft_id_range CHECK (nft_id >= 1 AND nft_id <= 2000),
  CONSTRAINT nft_sales_mainnet_valid_wallet CHECK (LENGTH(wallet_address) > 10),
  CONSTRAINT nft_sales_mainnet_valid_tx_hash CHECK (tx_hash IS NULL OR LENGTH(tx_hash) > 10)
);

-- Indexes for PREPROD
CREATE INDEX IF NOT EXISTS idx_nft_sales_preprod_sold_at ON nft_sales_preprod(sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_nft_sales_preprod_wallet ON nft_sales_preprod(wallet_address);
CREATE INDEX IF NOT EXISTS idx_nft_sales_preprod_tx_hash ON nft_sales_preprod(tx_hash);
CREATE INDEX IF NOT EXISTS idx_nft_sales_preprod_reserved ON nft_sales_preprod(reserved_at) WHERE reserved_at IS NOT NULL;

-- Indexes for MAINNET
CREATE INDEX IF NOT EXISTS idx_nft_sales_mainnet_sold_at ON nft_sales_mainnet(sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_nft_sales_mainnet_wallet ON nft_sales_mainnet(wallet_address);
CREATE INDEX IF NOT EXISTS idx_nft_sales_mainnet_tx_hash ON nft_sales_mainnet(tx_hash);
CREATE INDEX IF NOT EXISTS idx_nft_sales_mainnet_reserved ON nft_sales_mainnet(reserved_at) WHERE reserved_at IS NOT NULL;

-- Comments for PREPROD
COMMENT ON TABLE nft_sales_preprod IS 'Tracks NFT sales on Cardano PREPROD (testnet)';
COMMENT ON COLUMN nft_sales_preprod.nft_id IS 'Unique NFT ID (1-2000)';
COMMENT ON COLUMN nft_sales_preprod.wallet_address IS 'Cardano testnet wallet address';
COMMENT ON COLUMN nft_sales_preprod.tx_hash IS 'Cardano testnet transaction hash';

-- Comments for MAINNET
COMMENT ON TABLE nft_sales_mainnet IS 'Tracks NFT sales on Cardano MAINNET';
COMMENT ON COLUMN nft_sales_mainnet.nft_id IS 'Unique NFT ID (1-2000)';
COMMENT ON COLUMN nft_sales_mainnet.wallet_address IS 'Cardano mainnet wallet address';
COMMENT ON COLUMN nft_sales_mainnet.tx_hash IS 'Cardano mainnet transaction hash';

-- PREPROD Functions
CREATE OR REPLACE FUNCTION get_random_available_nft_preprod()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  available_nft_id INTEGER;
BEGIN
  SELECT nft_id INTO available_nft_id
  FROM generate_series(1, 2000) AS nft_id
  WHERE nft_id NOT IN (SELECT nft_id FROM nft_sales_preprod)
  ORDER BY RANDOM()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  RETURN available_nft_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_random_available_nfts_preprod(count INTEGER)
RETURNS TABLE(nft_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT gs.nft_id
  FROM generate_series(1, 2000) AS gs(nft_id)
  WHERE gs.nft_id NOT IN (SELECT nft_sales_preprod.nft_id FROM nft_sales_preprod)
  ORDER BY RANDOM()
  LIMIT count
  FOR UPDATE SKIP LOCKED;
END;
$$;

CREATE OR REPLACE FUNCTION get_available_nfts_preprod()
RETURNS TABLE(nft_id INTEGER)
LANGUAGE sql
STABLE
AS $$
  SELECT gs.nft_id
  FROM generate_series(1, 2000) AS gs(nft_id)
  WHERE gs.nft_id NOT IN (SELECT nft_sales_preprod.nft_id FROM nft_sales_preprod)
  ORDER BY gs.nft_id;
$$;

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
    COUNT(*) AS total_sold,
    (2000 - COUNT(*)) AS total_available,
    MAX(sold_at) AS latest_sale
  FROM nft_sales_preprod;
$$;

-- MAINNET Functions
CREATE OR REPLACE FUNCTION get_random_available_nft_mainnet()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  available_nft_id INTEGER;
BEGIN
  SELECT nft_id INTO available_nft_id
  FROM generate_series(1, 2000) AS nft_id
  WHERE nft_id NOT IN (SELECT nft_id FROM nft_sales_mainnet)
  ORDER BY RANDOM()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  RETURN available_nft_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_random_available_nfts_mainnet(count INTEGER)
RETURNS TABLE(nft_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT gs.nft_id
  FROM generate_series(1, 2000) AS gs(nft_id)
  WHERE gs.nft_id NOT IN (SELECT nft_sales_mainnet.nft_id FROM nft_sales_mainnet)
  ORDER BY RANDOM()
  LIMIT count
  FOR UPDATE SKIP LOCKED;
END;
$$;

CREATE OR REPLACE FUNCTION get_available_nfts_mainnet()
RETURNS TABLE(nft_id INTEGER)
LANGUAGE sql
STABLE
AS $$
  SELECT gs.nft_id
  FROM generate_series(1, 2000) AS gs(nft_id)
  WHERE gs.nft_id NOT IN (SELECT nft_sales_mainnet.nft_id FROM nft_sales_mainnet)
  ORDER BY gs.nft_id;
$$;

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
    COUNT(*) AS total_sold,
    (2000 - COUNT(*)) AS total_available,
    MAX(sold_at) AS latest_sale
  FROM nft_sales_mainnet;
$$;

-- Mark migrations as applied
INSERT INTO schema_migrations (version, name) VALUES (1, 'initial_schema') ON CONFLICT DO NOTHING;
INSERT INTO schema_migrations (version, name) VALUES (2, 'database_functions') ON CONFLICT DO NOTHING;
INSERT INTO schema_migrations (version, name) VALUES (3, 'network_aware_schema') ON CONFLICT DO NOTHING;

-- Optional: Drop old table if you want (uncomment to use)
-- DROP TABLE IF EXISTS nft_sales;
