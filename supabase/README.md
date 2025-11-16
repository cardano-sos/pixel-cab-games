# Supabase Database Documentation

All database-related files and documentation for the Pixel Cab Games NFT minting platform.

## 📁 Files in this Directory

### Schema
- **`schema.sql`** - Main database schema (network-aware: preprod/mainnet)
  - Run this in Supabase SQL Editor to set up your database
  - Creates tables for both testnet and mainnet
  - Includes all functions for concurrency-safe NFT minting

### Documentation
- **`NETWORK_SETUP.md`** - 🌐 How to switch between preprod/mainnet
- **`MANUAL_SCHEMA_SETUP.md`** - 📝 Step-by-step schema setup guide
- **`AUTO_MIGRATIONS.md`** - 🤖 Auto-migration system info (disabled by default)
- **`SUPABASE_MIGRATION.md`** - 📦 Migration from local JSON to Supabase

## 🚀 Quick Start

### 1. Set Up Database Schema

**Go to Supabase SQL Editor:**
https://supabase.com/dashboard/project/xnjkxmihvgdkiqheoqyu/sql/new

**Copy and run:** `schema.sql` (all of it!)

### 2. Configure Network

In your `.envrc`:
```bash
# For testing
export CARDANO_NETWORK='preprod'

# For production
export CARDANO_NETWORK='mainnet'
```

### 3. Test Connection

```bash
direnv allow
npm run dev
```

Visit: http://localhost:3000/api/db/test

## 📊 Database Structure

### Tables

**Preprod (Testnet):**
- `nft_sales_preprod` - Tracks testnet NFT sales
  - `id` - Auto-incrementing primary key
  - `nft_id` - Unique NFT ID (1-2000)
  - `wallet_address` - Cardano testnet wallet
  - `tx_hash` - Testnet transaction hash
  - `sold_at` - Timestamp

**Mainnet (Production):**
- `nft_sales_mainnet` - Tracks mainnet NFT sales
  - Same structure as preprod
  - Completely separate data

**Shared:**
- `schema_migrations` - Tracks schema versions

### Functions

All functions exist in both `_preprod` and `_mainnet` versions:

- `get_random_available_nft_[network]()` - Get random NFT (concurrency-safe)
- `get_random_available_nfts_[network](count)` - Get multiple NFTs
- `get_available_nfts_[network]()` - List all available NFTs
- `get_sales_stats_[network]()` - Get sales statistics

## 🔒 Concurrency Protection

The database uses PostgreSQL's `FOR UPDATE SKIP LOCKED` to prevent race conditions:

- 100 people can mint simultaneously
- Each gets a unique NFT
- Zero duplicates guaranteed
- No queue system needed!

## 🌐 Network Separation

**Complete data isolation:**
- Preprod and Mainnet have separate tables
- Can test freely without affecting production
- Switch networks with environment variable
- Same codebase works for both

## 📚 Detailed Documentation

**Need help with:**
- Setting up schema? → `MANUAL_SCHEMA_SETUP.md`
- Switching networks? → `NETWORK_SETUP.md`
- Understanding migrations? → `AUTO_MIGRATIONS.md`
- Migration history? → `SUPABASE_MIGRATION.md`

## 🛠️ Environment Variables

Required in `.envrc`:

```bash
# Supabase connection
export NEXT_PUBLIC_SUPABASE_URL='https://xnjkxmihvgdkiqheoqyu.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='your_service_role_key'

# Network selection (preprod or mainnet)
export CARDANO_NETWORK='preprod'

# Migration control
export DISABLE_AUTO_MIGRATIONS='true'
```

## 🔍 Monitoring

### View Data in Supabase

1. Go to: https://supabase.com/dashboard/project/xnjkxmihvgdkiqheoqyu
2. Click **Table Editor**
3. Select table:
   - `nft_sales_preprod` for testnet data
   - `nft_sales_mainnet` for production data

### Test Endpoint

http://localhost:3000/api/db/test

Shows:
- Current network (preprod/mainnet)
- Schema status
- Sales statistics
- Random available NFT

## 🚢 Deployment

### Vercel

Environment variables are auto-configured via Supabase integration.

Just set:
```
CARDANO_NETWORK=preprod  (or mainnet)
DISABLE_AUTO_MIGRATIONS=true
```

All other Supabase vars come from integration.

### Testing

Always test on preprod first:
1. Set `CARDANO_NETWORK='preprod'`
2. Test minting
3. Verify transactions
4. Check data in `nft_sales_preprod` table

### Production

When ready for mainnet:
1. Set `CARDANO_NETWORK='mainnet'`
2. Update mainnet credentials (Blockfrost, wallet, policy)
3. Deploy
4. Monitor `nft_sales_mainnet` table

## 💡 Pro Tips

- **Keep preprod forever** - Use for ongoing testing
- **Separate Vercel projects** - One for preprod, one for mainnet
- **Monitor both tables** - Check preprod after tests, mainnet after launches
- **Test concurrency** - Use preprod to test high-traffic scenarios
- **Backup mainnet data** - Export from Supabase regularly

## 🆘 Troubleshooting

### Schema not found

Run `schema.sql` in Supabase SQL Editor.

### Wrong network data

Check `CARDANO_NETWORK` environment variable and run `direnv allow`.

### Functions not found

You ran old schema. Re-run `schema.sql` (it's idempotent).

### Connection errors

Check Supabase environment variables are set correctly.

---

## Questions?

Check the detailed docs in this directory or visit:
- Supabase Dashboard: https://supabase.com/dashboard/project/xnjkxmihvgdkiqheoqyu
- Test Endpoint: http://localhost:3000/api/db/test
