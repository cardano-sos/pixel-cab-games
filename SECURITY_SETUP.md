# Database Security Setup

## Overview
This guide explains how to secure your Supabase tables with Row Level Security (RLS).

## What's the Problem?
Without RLS, your tables are **completely unrestricted** - anyone with your Supabase URL can:
- Read all data
- Insert fake sales records
- Update or delete existing data

## The Solution
Enable RLS and create policies that define who can do what.

## Applying the Security Policies

### Option 1: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/rls_policies.sql`
4. Click **Run**

### Option 2: Via Supabase CLI
```bash
supabase db push
```

### Option 3: Via psql
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT].supabase.co:5432/postgres" -f supabase/rls_policies.sql
```

## What Each Policy Does

### Read Policies (SELECT)
```sql
"Allow public read access to preprod sales"
```
- **Who**: Anyone (public)
- **What**: Can view all NFT sales
- **Why**: Users need to see which NFTs are sold/available

### Write Policies (INSERT)
```sql
"Only service role can insert preprod sales"
```
- **Who**: Only authenticated users (your backend with service role key)
- **What**: Can insert new sales records
- **Why**: Prevents users from faking sales directly

### Update/Delete Policies
```sql
"Prevent updates/deletes"
```
- **Who**: No one
- **What**: Cannot modify or delete sales
- **Why**: Sales should be immutable once recorded

## Authentication Setup

### Client (Browser) Usage
Use the **anon key** for public operations:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Public, safe to expose
)

// This works - public read access
const { data } = await supabase.from('nft_sales_preprod').select('*')
```

### Server (Backend) Usage
Use the **service role key** for privileged operations:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Secret, never expose
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// This works - service role can insert
const { data, error } = await supabaseAdmin
  .from('nft_sales_preprod')
  .insert({ nft_id: 1, wallet_address: 'addr...', tx_hash: 'tx...' })
```

## Environment Variables Required

Add to your `.env.local`:
```bash
# Public - safe to expose in browser
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Secret - NEVER expose in browser, server-side only
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## Testing Your Security

### Test 1: Public Read Access
```bash
curl "https://your-project.supabase.co/rest/v1/nft_sales_preprod" \
  -H "apikey: YOUR_ANON_KEY"
```
✅ Should work - returns sales data

### Test 2: Public Write Access (Should Fail)
```bash
curl -X POST "https://your-project.supabase.co/rest/v1/nft_sales_preprod" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"nft_id": 999, "wallet_address": "fake", "tx_hash": "fake"}'
```
❌ Should fail - anon users can't insert

### Test 3: Service Role Write Access
```bash
curl -X POST "https://your-project.supabase.co/rest/v1/nft_sales_preprod" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"nft_id": 999, "wallet_address": "addr_test1...", "tx_hash": "abc123..."}'
```
✅ Should work - service role can insert

## Verifying RLS is Enabled

In Supabase Dashboard:
1. Go to **Table Editor**
2. Select a table (e.g., `nft_sales_preprod`)
3. Look for a shield icon 🛡️ with "RLS enabled"
4. Click **Policies** to see your active policies

## Common Issues

### "new row violates row-level security policy"
- You're trying to insert with anon key
- Solution: Use service role key for inserts

### "permission denied for table"
- RLS is enabled but no policies match
- Solution: Check your policies are created

### Functions not working
- Functions might bypass RLS by default
- Solution: Ensure proper GRANT EXECUTE permissions

## Best Practices

1. **Never expose service role key** in client-side code
2. **Always use anon key** for browser/frontend
3. **Use service role key** only in server-side API routes
4. **Test policies** in a development environment first
5. **Make sales immutable** (no updates/deletes)

## Next Steps

1. Apply the RLS policies
2. Update your code to use service role for minting
3. Test the security works as expected
4. Monitor for any policy violations in Supabase logs
