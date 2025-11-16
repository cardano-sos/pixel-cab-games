import { NextResponse } from 'next/server';
import {
  getSalesStats,
  getRandomAvailableNFTId,
  getAvailableNFTIds,
  getAllSales,
  getCurrentNetwork
} from '@/lib/db';
import { getCurrentSchemaVersion, isDatabaseReady } from '@/lib/migrations';

/**
 * Test endpoint to verify Supabase connection and schema
 * GET /api/db/test
 */
export async function GET() {
  try {
    const autoMigrationsDisabled = process.env.DISABLE_AUTO_MIGRATIONS === 'true';

    // Check schema status (only if auto-migrations not disabled)
    let schemaVersion = 0;
    let dbReady = false;

    if (!autoMigrationsDisabled) {
      try {
        schemaVersion = await getCurrentSchemaVersion();
        dbReady = await isDatabaseReady();
      } catch (error) {
        console.log('Could not check schema version (this is ok if migrations are disabled)');
      }
    }

    // Test connection and functions
    const stats = await getSalesStats();
    const randomNFT = await getRandomAvailableNFTId();
    const allSales = await getAllSales();
    const availableCount = await getAvailableNFTIds().then(ids => ids.length);

    const network = getCurrentNetwork();

    return NextResponse.json({
      success: true,
      message: 'Database connection successful! ✅',
      network: {
        current: network,
        description: network === 'mainnet' ? 'Production (Mainnet)' : 'Testing (Preprod/Testnet)'
      },
      schema: autoMigrationsDisabled
        ? {
            status: 'Manual setup (auto-migrations disabled)',
            hint: 'Run supabase/schema.sql in Supabase SQL Editor'
          }
        : {
            version: schemaVersion,
            ready: dbReady,
            status: dbReady ? 'All migrations applied' : 'Migrations pending'
          },
      data: {
        stats: {
          totalSold: stats.totalSold,
          totalAvailable: stats.totalAvailable,
          latestSale: stats.latestSale
        },
        randomAvailableNFT: randomNFT,
        totalAvailableNFTs: availableCount,
        recentSales: allSales.slice(0, 5) // Show 5 most recent
      }
    });
  } catch (error: any) {
    console.error('Database test error:', error);

    // Check if it's a schema not found error
    const isSchemaError = error.message?.includes('not find') ||
                          error.message?.includes('does not exist') ||
                          error.code === 'PGRST202' ||
                          error.code === 'PGRST205';

    if (isSchemaError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Database schema not found',
          error: 'Tables and functions have not been created yet',
          hint: 'Run the SQL from supabase/schema.sql in your Supabase SQL Editor',
          instructions: 'See MANUAL_SCHEMA_SETUP.md for step-by-step instructions'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Database connection failed',
        error: error.message,
        hint: 'Check your environment variables and Supabase connection.'
      },
      { status: 500 }
    );
  }
}
