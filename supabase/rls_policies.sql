-- Enable Row Level Security (RLS) on all tables
-- This prevents unrestricted access to your data

-- Enable RLS on preprod table
ALTER TABLE nft_sales_preprod ENABLE ROW LEVEL SECURITY;

-- Enable RLS on mainnet table
ALTER TABLE nft_sales_mainnet ENABLE ROW LEVEL SECURITY;

-- Enable RLS on schema_migrations table
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PREPROD POLICIES
-- ============================================================================

-- Allow public to READ all NFT sales (so they can see which NFTs are sold)
CREATE POLICY "Allow public read access to preprod sales"
  ON nft_sales_preprod
  FOR SELECT
  TO public
  USING (true);

-- Only allow INSERT from authenticated service role (your backend)
-- This prevents random users from inserting fake sales
CREATE POLICY "Only service role can insert preprod sales"
  ON nft_sales_preprod
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Prevent updates to sales records (immutable once created)
CREATE POLICY "Prevent updates to preprod sales"
  ON nft_sales_preprod
  FOR UPDATE
  TO authenticated
  USING (false);

-- Prevent deletes (sales should be permanent)
CREATE POLICY "Prevent deletes from preprod sales"
  ON nft_sales_preprod
  FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- MAINNET POLICIES
-- ============================================================================

-- Allow public to READ all NFT sales
CREATE POLICY "Allow public read access to mainnet sales"
  ON nft_sales_mainnet
  FOR SELECT
  TO public
  USING (true);

-- Only allow INSERT from authenticated service role
CREATE POLICY "Only service role can insert mainnet sales"
  ON nft_sales_mainnet
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Prevent updates to sales records
CREATE POLICY "Prevent updates to mainnet sales"
  ON nft_sales_mainnet
  FOR UPDATE
  TO authenticated
  USING (false);

-- Prevent deletes
CREATE POLICY "Prevent deletes from mainnet sales"
  ON nft_sales_mainnet
  FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- SCHEMA_MIGRATIONS POLICIES
-- ============================================================================

-- Allow public to read schema_migrations (safe, just version info)
CREATE POLICY "Allow public read access to schema_migrations"
  ON schema_migrations
  FOR SELECT
  TO public
  USING (true);

-- Only allow service role to manage migrations
CREATE POLICY "Only service role can manage migrations"
  ON schema_migrations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- FUNCTION PERMISSIONS
-- ============================================================================

-- Allow public to execute read-only functions
GRANT EXECUTE ON FUNCTION get_available_nfts_preprod() TO public;
GRANT EXECUTE ON FUNCTION get_sales_stats_preprod() TO public;
GRANT EXECUTE ON FUNCTION get_available_nfts_mainnet() TO public;
GRANT EXECUTE ON FUNCTION get_sales_stats_mainnet() TO public;

-- Only allow authenticated (service role) to execute write functions
GRANT EXECUTE ON FUNCTION get_random_available_nft_preprod() TO authenticated;
GRANT EXECUTE ON FUNCTION get_random_available_nfts_preprod(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_random_available_nft_mainnet() TO authenticated;
GRANT EXECUTE ON FUNCTION get_random_available_nfts_mainnet(INTEGER) TO authenticated;

-- Mark migration as applied
INSERT INTO schema_migrations (version, name)
VALUES (4, 'enable_rls_policies')
ON CONFLICT DO NOTHING;
