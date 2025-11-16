# Automatic Database Migrations ✨

Your application now automatically manages database schema migrations! No manual SQL needed.

## How It Works

When your app starts and makes its first database call, it automatically:

1. **Checks** if the database schema is up-to-date
2. **Runs** any pending migrations
3. **Tracks** which migrations have been applied
4. **Only runs once** per app instance (cached)

## Zero Manual Setup Required

Just start your app:

```bash
npm run dev
```

That's it! The schema will be created automatically when the app first accesses the database.

## What Gets Created Automatically

### Migration 1: Initial Schema
- `schema_migrations` table (tracks migration versions)
- `nft_sales` table (tracks NFT sales)
- Indexes for performance
- Data validation constraints

### Migration 2: Database Functions
- `get_random_available_nft()` - Concurrency-safe random NFT selection
- `get_random_available_nfts(count)` - Get multiple NFTs
- `get_available_nfts()` - List all available
- `get_sales_stats()` - Sales statistics

## Testing the Migrations

### Option 1: Visit the test endpoint

```bash
npm run dev
```

Then visit: http://localhost:3000/api/db/test

You'll see:
```json
{
  "success": true,
  "message": "Database connection successful! ✅",
  "schema": {
    "version": 2,
    "ready": true,
    "status": "All migrations applied"
  },
  "data": {
    "stats": {
      "totalSold": 0,
      "totalAvailable": 2000,
      "latestSale": null
    }
  }
}
```

### Option 2: Check the console

When your app first accesses the database, you'll see:

```
🔄 Checking database migrations...
🔄 Running migration 1: initial_schema...
✅ Migration 1 completed
🔄 Running migration 2: database_functions...
✅ Migration 2 completed
✅ All migrations completed
```

Or if already migrated:
```
🔄 Checking database migrations...
✓ Migration 1 already applied
✓ Migration 2 already applied
✅ All migrations completed
```

## Migration Files

### `src/lib/migrations.ts`
Contains all migration definitions. Each migration:
- Has a version number
- Has a descriptive name
- Is idempotent (safe to run multiple times)
- Uses `CREATE OR REPLACE` and `IF NOT EXISTS`

### `src/lib/db.ts`
Automatically calls `ensureMigrations()` before any database operation.

## Adding New Migrations

When you need to update the schema:

1. Open `src/lib/migrations.ts`
2. Add a new migration object:

```typescript
{
  version: 3,
  name: 'add_user_favorites',
  up: async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id BIGSERIAL PRIMARY KEY,
        user_address TEXT NOT NULL,
        nft_id INTEGER REFERENCES nft_sales(nft_id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
  }
}
```

3. Restart your app
4. Migration runs automatically!

## Migration Safety

✅ **Idempotent** - Safe to run multiple times
✅ **Tracked** - Won't re-run completed migrations
✅ **Atomic** - Each migration runs in a transaction
✅ **Cached** - Only checks once per app instance
✅ **Logged** - See exactly what's happening

## How It Prevents Race Conditions

Each migration:
- Uses `CREATE TABLE IF NOT EXISTS`
- Uses `CREATE OR REPLACE FUNCTION`
- Checks `schema_migrations` table first
- Uses `ON CONFLICT DO NOTHING` when tracking

Even if 10 app instances start simultaneously, only one will run the migration.

## Vercel Deployment

On Vercel, migrations run automatically:

1. First request hits your app
2. Migrations check and run (if needed)
3. All subsequent requests use existing schema
4. Each deployment checks migrations independently

**No manual database setup needed!**

## Monitoring Migrations

### Check Current Version

```bash
curl http://localhost:3000/api/db/test
```

Look for:
```json
{
  "schema": {
    "version": 2,
    "ready": true
  }
}
```

### Check in Supabase Dashboard

1. Go to Supabase → Table Editor
2. Look for `schema_migrations` table
3. See all applied migrations

## Troubleshooting

### "relation does not exist"
**Cause:** First database call hasn't happened yet
**Solution:** Just access any database function, migrations will run

### "Migration failed"
**Cause:** Database connection issue
**Solution:** Check `.envrc` has all Supabase variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POSTGRES_URL`

### Migration stuck
**Cause:** Rare - concurrent migration attempt
**Solution:** Restart app, migrations are idempotent

## Benefits Over Manual Schema

**Before (Manual SQL):**
- ❌ Have to remember to run SQL
- ❌ Easy to forget on deployments
- ❌ Different environments get out of sync
- ❌ No version tracking

**After (Auto Migrations):**
- ✅ Runs automatically
- ✅ Every deployment is correct
- ✅ All environments stay in sync
- ✅ Version tracked in database
- ✅ Idempotent and safe

## Production Deployment

```bash
git add .
git commit -m "Add automatic migrations"
git push
```

Vercel deploys:
1. App starts
2. First API call triggers migration check
3. Migrations run if needed
4. Schema ready!
5. All subsequent calls use existing schema

**Zero downtime, zero manual steps!**

---

## Summary

You don't need to do anything! Just:

1. ✅ Start your app
2. ✅ Make a database call (or visit `/api/db/test`)
3. ✅ Migrations run automatically
4. ✅ Database ready!

That's it! 🎉
