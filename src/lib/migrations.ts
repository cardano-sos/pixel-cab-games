// Automatic database migration system
import { sql } from '@vercel/postgres';

interface Migration {
  version: number;
  name: string;
  up: () => Promise<void>;
}

// Track if migrations have run this session
let migrationsRun = false;

/**
 * All database migrations in order
 * Each migration is idempotent (safe to run multiple times)
 */
const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: async () => {
      // Create schema_migrations table
      await sql`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      // Create nft_sales table
      await sql`
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
      `;

      // Create indexes
      await sql`CREATE INDEX IF NOT EXISTS idx_nft_sales_sold_at ON nft_sales(sold_at DESC);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_nft_sales_wallet ON nft_sales(wallet_address);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_nft_sales_tx_hash ON nft_sales(tx_hash);`;
    }
  },
  {
    version: 2,
    name: 'database_functions',
    up: async () => {
      // Function: Get random available NFT (concurrency-safe)
      await sql`
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
      `;

      // Function: Get multiple random available NFTs
      await sql`
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
      `;

      // Function: Get all available NFTs
      await sql`
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
      `;

      // Function: Get sales statistics
      await sql`
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
      `;
    }
  }
];

/**
 * Check if a specific migration has been applied
 */
async function isMigrationApplied(version: number): Promise<boolean> {
  try {
    const result = await sql`
      SELECT version FROM schema_migrations WHERE version = ${version}
    `;
    return result.rows.length > 0;
  } catch (error: any) {
    // If table doesn't exist, no migrations have been applied
    if (error.message?.includes('does not exist')) {
      return false;
    }
    console.error('Error checking migration:', error);
    return false;
  }
}

/**
 * Mark a migration as applied
 */
async function markMigrationApplied(version: number, name: string): Promise<void> {
  try {
    await sql`
      INSERT INTO schema_migrations (version, name)
      VALUES (${version}, ${name})
      ON CONFLICT (version) DO NOTHING
    `;
  } catch (error) {
    console.error('Error marking migration applied:', error);
    // Don't throw - migration succeeded, just tracking failed
  }
}

/**
 * Run a single migration
 */
async function runMigration(migration: Migration): Promise<void> {
  console.log(`🔄 Running migration ${migration.version}: ${migration.name}...`);

  try {
    await migration.up();
    await markMigrationApplied(migration.version, migration.name);
    console.log(`✅ Migration ${migration.version} completed`);
  } catch (error: any) {
    console.error(`❌ Migration ${migration.version} failed:`, error);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  // Only run once per app instance
  if (migrationsRun) {
    return;
  }

  try {
    console.log('🔄 Checking database migrations...');

    for (const migration of migrations) {
      const applied = await isMigrationApplied(migration.version);

      if (!applied) {
        await runMigration(migration);
      } else {
        console.log(`✓ Migration ${migration.version} already applied`);
      }
    }

    migrationsRun = true;
    console.log('✅ All migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Check if database is ready (all migrations applied)
 */
export async function isDatabaseReady(): Promise<boolean> {
  try {
    for (const migration of migrations) {
      const applied = await isMigrationApplied(migration.version);
      if (!applied) {
        return false;
      }
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get current schema version
 */
export async function getCurrentSchemaVersion(): Promise<number> {
  try {
    const result = await sql`
      SELECT version FROM schema_migrations
      ORDER BY version DESC
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return 0;
    }

    return result.rows[0].version;
  } catch (error) {
    return 0;
  }
}
