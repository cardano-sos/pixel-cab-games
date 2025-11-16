# Manual Database Schema Setup

Auto-migrations are disabled. Follow these steps to set up your database manually:

## Quick Setup (5 minutes)

### 1. Open Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/xnjkxmihvgdkiqheoqyu/sql/new

Or:
1. Visit https://supabase.com/dashboard
2. Select your project: **xnjkxmihvgdkiqheoqyu**
3. Click **SQL Editor** in left sidebar
4. Click **New Query**

### 2. Run This SQL

Copy and paste this entire script into the SQL editor:

```sql
-- Create schema_migrations table to track versions
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create nft_sales table
CREATE TABLE IF NOT EXISTS nft_sales (
  id BIGSERIAL PRIMARY KEY,
  nft_id INTEGER UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  sold_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT nft_id_range CHECK (nft_id >= 1 AND nft_id <= 2000),
  CONSTRAINT valid_wallet CHECK (LENGTH(wallet_address) > 10),
  CONSTRAINT valid_tx_hash CHECK (LENGTH(tx_hash) > 10)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nft_sales_sold_at ON nft_sales(sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_nft_sales_wallet ON nft_sales(wallet_address);
CREATE INDEX IF NOT EXISTS idx_nft_sales_tx_hash ON nft_sales(tx_hash);

-- Function: Get random available NFT (concurrency-safe)
CREATE OR REPLACE FUNCTION get_random_available_nft()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  available_nft_id INTEGER;
BEGIN
  SELECT nft_id INTO available_nft_id
  FROM generate_series(1, 2000) AS nft_id
  WHERE nft_id NOT IN (SELECT nft_id FROM nft_sales)
  ORDER BY RANDOM()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  RETURN available_nft_id;
END;
$$;

-- Function: Get multiple random available NFTs
CREATE OR REPLACE FUNCTION get_random_available_nfts(count INTEGER)
RETURNS TABLE(nft_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT gs.nft_id
  FROM generate_series(1, 2000) AS gs(nft_id)
  WHERE gs.nft_id NOT IN (SELECT nft_sales.nft_id FROM nft_sales)
  ORDER BY RANDOM()
  LIMIT count
  FOR UPDATE SKIP LOCKED;
END;
$$;

-- Function: Get all available NFTs
CREATE OR REPLACE FUNCTION get_available_nfts()
RETURNS TABLE(nft_id INTEGER)
LANGUAGE sql
STABLE
AS $$
  SELECT gs.nft_id
  FROM generate_series(1, 2000) AS gs(nft_id)
  WHERE gs.nft_id NOT IN (SELECT nft_sales.nft_id FROM nft_sales)
  ORDER BY gs.nft_id;
$$;

-- Function: Get sales statistics
CREATE OR REPLACE FUNCTION get_sales_stats()
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
  FROM nft_sales;
$$;

-- Mark migrations as applied
INSERT INTO schema_migrations (version, name) VALUES (1, 'initial_schema') ON CONFLICT DO NOTHING;
INSERT INTO schema_migrations (version, name) VALUES (2, 'database_functions') ON CONFLICT DO NOTHING;
```

### 3. Click "Run" or press Cmd/Ctrl + Enter

You should see: `Success. No rows returned`

### 4. Verify Setup

Run this verification query:

```sql
-- Check tables exist
SELECT * FROM schema_migrations;

-- Check functions exist
SELECT get_sales_stats();

-- Test getting available NFT
SELECT get_random_available_nft();
```

You should see:
- 2 rows in `schema_migrations` (versions 1 and 2)
- Stats showing 0 sold, 2000 available
- A random number between 1-2000

## Done! ✅

Now test your app:

```bash
direnv allow
npm run dev
```

Visit: http://localhost:3000/api/db/test

You should see successful response with no errors!

## Re-enabling Auto-Migrations

If you want to switch back to automatic migrations later:

1. Edit `.envrc`
2. Remove or comment out: `export DISABLE_AUTO_MIGRATIONS='true'`
3. Run `direnv allow`
4. Restart your dev server

## Troubleshooting

### "relation does not exist"
You forgot to run the schema SQL. Go back to step 2.

### "function does not exist"
Make sure you ran the ENTIRE SQL script, including all the `CREATE FUNCTION` statements.

### Still getting errors?
Check that:
1. You ran the SQL in the correct Supabase project
2. All environment variables are set in `.envrc`
3. You ran `direnv allow` after editing `.envrc`

## Why Manual vs Auto?

**Manual (current setup):**
- ✅ You control when schema updates happen
- ✅ Simpler for small projects
- ✅ No complex migration code needed
- ❌ Need to remember to run SQL manually
- ❌ Easy to forget on new environments

**Automatic:**
- ✅ Schema always up-to-date automatically
- ✅ Works on every deployment/environment
- ✅ Version tracked automatically
- ❌ More complex migration system
- ❌ Needs proper Postgres connection

Both work great! Choose what you prefer.
