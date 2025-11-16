# Network-Aware Database Setup (Preprod/Mainnet)

Your database now supports **separate tables** for Cardano preprod (testnet) and mainnet!

## 🎯 Quick Setup

### Step 1: Run the Network-Aware Schema

1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/xnjkxmihvgdkiqheoqyu/sql/new
2. Copy **ALL** contents from `supabase/schema.sql`
3. Paste and click **Run**

This creates:
- `nft_sales_preprod` - For testnet sales
- `nft_sales_mainnet` - For mainnet sales
- All functions with `_preprod` and `_mainnet` versions

### Step 2: Set Your Network

In `.envrc`, set the network:

```bash
# For testing on testnet
export CARDANO_NETWORK='preprod'

# For production on mainnet
export CARDANO_NETWORK='mainnet'
```

### Step 3: Reload and Test

```bash
direnv allow
npm run dev
```

Visit: http://localhost:3000/api/db/test

You should see:
```json
{
  "success": true,
  "network": {
    "current": "preprod",
    "description": "Testing (Preprod/Testnet)"
  },
  "data": {
    "stats": {
      "totalSold": 0,
      "totalAvailable": 2000
    }
  }
}
```

---

## 🔀 Switching Networks

### For Testing (Preprod/Testnet)

```bash
# .envrc
export CARDANO_NETWORK='preprod'
export BLOCKFROST_PROJECT_ID='your_preprod_project_id'
export NEXT_PUBLIC_PROFIT_WALLET='addr_test1...'
export POLICY_ID='your_preprod_policy_id'
```

```bash
direnv allow
npm run dev
```

Your app will use:
- Table: `nft_sales_preprod`
- Functions: `get_random_available_nft_preprod()`, etc.

### For Production (Mainnet)

```bash
# .envrc
export CARDANO_NETWORK='mainnet'
export BLOCKFROST_PROJECT_ID='your_mainnet_project_id'
export NEXT_PUBLIC_PROFIT_WALLET='addr1...'
export POLICY_ID='your_mainnet_policy_id'
```

```bash
direnv allow
npm run dev
```

Your app will use:
- Table: `nft_sales_mainnet`
- Functions: `get_random_available_nft_mainnet()`, etc.

---

## 📊 What Gets Created

### Tables

**Preprod (Testnet):**
- `nft_sales_preprod` - Stores testnet NFT sales
- Indexes on `sold_at`, `wallet_address`, `tx_hash`

**Mainnet (Production):**
- `nft_sales_mainnet` - Stores mainnet NFT sales
- Indexes on `sold_at`, `wallet_address`, `tx_hash`

### Functions

**Preprod:**
- `get_random_available_nft_preprod()` - Random NFT selection (concurrency-safe)
- `get_random_available_nfts_preprod(count)` - Multiple NFTs
- `get_available_nfts_preprod()` - List all available
- `get_sales_stats_preprod()` - Sales statistics

**Mainnet:**
- `get_random_available_nft_mainnet()` - Random NFT selection (concurrency-safe)
- `get_random_available_nfts_mainnet(count)` - Multiple NFTs
- `get_available_nfts_mainnet()` - List all available
- `get_sales_stats_mainnet()` - Sales statistics

---

## 🧪 Testing Workflow

### 1. Test on Preprod

```bash
export CARDANO_NETWORK='preprod'
direnv allow
npm run dev
```

- Test NFT minting
- Verify transactions on Cardano testnet
- Check database in Supabase: `nft_sales_preprod` table

### 2. Deploy to Mainnet

When ready for production:

```bash
export CARDANO_NETWORK='mainnet'
# Update all mainnet credentials
direnv allow
```

- Deploy to production
- Mainnet sales go to `nft_sales_mainnet` table
- Zero risk of mixing test/prod data!

---

## 🔒 Data Isolation

**Complete separation:**
- Preprod NFT #123 is independent from Mainnet NFT #123
- Preprod and Mainnet have separate 2000 NFT pools
- No risk of accidentally using testnet data in production
- Can test freely without affecting mainnet

**Example:**

```typescript
// With CARDANO_NETWORK='preprod'
await markNFTAsSold(123, 'addr_test1...', 'tx_hash');
// Inserts into nft_sales_preprod

// With CARDANO_NETWORK='mainnet'
await markNFTAsSold(123, 'addr1...', 'tx_hash');
// Inserts into nft_sales_mainnet

// Both NFT #123s are independent!
```

---

## 📁 Environment Setup Examples

### Preprod .envrc (Testing)

```bash
export BLOCKFROST_PROJECT_ID='preprodO3hTEB961ia8EBmZtAwi1NYtkZ8UG1Rs'
export CARDANO_NETWORK='preprod'
export NEXT_PUBLIC_PROFIT_WALLET='addr_test1qpl5cxkrtmr...'
export POLICY_ID='f22674fb80c6bcfee57b6127c7bd4211c06a73bd61dedc16d00e85f6'
export MINTTING_WALLET_OUTPUT_MNEMONIC='your testnet mnemonic...'
export JWT_SECRET='your-secret-key'
export DISABLE_AUTO_MIGRATIONS='true'

# Supabase (same for both networks)
export NEXT_PUBLIC_SUPABASE_URL='https://xnjkxmihvgdkiqheoqyu.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='your_service_role_key'
```

### Mainnet .envrc (Production)

```bash
export BLOCKFROST_PROJECT_ID='mainnetYOUR_MAINNET_PROJECT_ID'
export CARDANO_NETWORK='mainnet'
export NEXT_PUBLIC_PROFIT_WALLET='addr1your_mainnet_wallet...'
export POLICY_ID='your_mainnet_policy_id'
export MINTTING_WALLET_OUTPUT_MNEMONIC='your mainnet mnemonic...'
export JWT_SECRET='your-production-secret-key'
export DISABLE_AUTO_MIGRATIONS='true'

# Supabase (same for both networks)
export NEXT_PUBLIC_SUPABASE_URL='https://xnjkxmihvgdkiqheoqyu.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='your_service_role_key'
```

---

## 🚀 Vercel Deployment

### Preprod Deployment

Set environment variables in Vercel:
```
CARDANO_NETWORK=preprod
BLOCKFROST_PROJECT_ID=preprod...
NEXT_PUBLIC_PROFIT_WALLET=addr_test1...
POLICY_ID=preprod_policy_id
```

### Mainnet Deployment

Set environment variables in Vercel:
```
CARDANO_NETWORK=mainnet
BLOCKFROST_PROJECT_ID=mainnet...
NEXT_PUBLIC_PROFIT_WALLET=addr1...
POLICY_ID=mainnet_policy_id
```

**Pro tip:** Use different Vercel projects for preprod/mainnet!

---

## 💡 How It Works

The code automatically routes to the correct table/functions:

```typescript
// src/lib/db.ts
function getTableName(): string {
  return `nft_sales_${getCardanoNetwork()}`;
  // Returns: 'nft_sales_preprod' or 'nft_sales_mainnet'
}

function getFunctionName(baseName: string): string {
  return `${baseName}_${getCardanoNetwork()}`;
  // Returns: 'get_sales_stats_preprod' or 'get_sales_stats_mainnet'
}
```

**All your existing code works unchanged!**

---

## 🔍 Monitoring

### Check Current Network

```bash
curl http://localhost:3000/api/db/test | jq '.network'
```

Output:
```json
{
  "current": "preprod",
  "description": "Testing (Preprod/Testnet)"
}
```

### View Data in Supabase

**Preprod sales:**
1. Go to Supabase → Table Editor
2. Select `nft_sales_preprod`
3. See all testnet sales

**Mainnet sales:**
1. Go to Supabase → Table Editor
2. Select `nft_sales_mainnet`
3. See all production sales

---

## 🎯 Benefits

✅ **Complete data isolation** - Test/prod never mix
✅ **Same codebase** - No code changes needed
✅ **Easy switching** - Just change environment variable
✅ **Safe testing** - Test freely without affecting production
✅ **Production ready** - When ready, just switch to mainnet
✅ **One database** - Both networks in same Supabase project

---

## 🆘 Troubleshooting

### "Could not find the function"

You ran the old schema. Run `supabase/schema.sql` instead.

### "Could not find the table"

Check that:
1. You ran `schema.sql`
2. `CARDANO_NETWORK` is set correctly
3. You ran `direnv allow`

### Data showing in wrong table

Check your `CARDANO_NETWORK` environment variable. It should match your intention.

---

## ✅ Summary

**Setup once:**
1. Run `supabase/schema.sql` in Supabase
2. Set `CARDANO_NETWORK` in `.envrc`
3. Run `direnv allow`

**Daily use:**
- Testing: `export CARDANO_NETWORK='preprod'`
- Production: `export CARDANO_NETWORK='mainnet'`

**That's it!** Your app automatically uses the right tables. 🎉
