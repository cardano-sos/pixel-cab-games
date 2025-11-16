// Supabase-based database for tracking NFT sales
// Supports network-aware tables (preprod/mainnet)
import { createClient } from '@supabase/supabase-js';
import { runMigrations } from './migrations';

// Initialize Supabase client with service role key (server-side only)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

// Use service role key for server-side operations (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Network configuration
type CardanoNetwork = 'preprod' | 'mainnet';

/**
 * Get current Cardano network from environment
 * Defaults to 'preprod' for safety
 */
function getCardanoNetwork(): CardanoNetwork {
  const network = process.env.CARDANO_NETWORK?.toLowerCase();
  if (network === 'mainnet') {
    console.log('🌐 Using MAINNET database');
    return 'mainnet';
  }
  console.log('🧪 Using PREPROD (testnet) database');
  return 'preprod';
}

/**
 * Get network-specific table name
 */
function getTableName(): string {
  return `nft_sales_${getCardanoNetwork()}`;
}

/**
 * Get network-specific function name
 */
function getFunctionName(baseName: string): string {
  return `${baseName}_${getCardanoNetwork()}`;
}

// Track if migrations have been ensured
let migrationsEnsured = false;

/**
 * Ensure database migrations are run before any database operation
 * Only runs once per application instance
 *
 * Set DISABLE_AUTO_MIGRATIONS=true to skip automatic migrations
 */
async function ensureMigrations(): Promise<void> {
  // Skip if disabled or already ensured
  if (process.env.DISABLE_AUTO_MIGRATIONS === 'true' || migrationsEnsured) {
    if (!migrationsEnsured) {
      console.log('⏭️  Auto-migrations disabled - schema must be created manually');
      migrationsEnsured = true; // Mark as ensured so we don't check again
    }
    return;
  }

  try {
    await runMigrations();
    migrationsEnsured = true;
  } catch (error) {
    console.error('Failed to run migrations:', error);
    // Don't throw - let the app continue, but log the error
    // The actual database operations will fail and provide better error messages
  }
}

export interface NFTSale {
  nftId: number;
  walletAddress: string;
  txHash: string;
  soldAt: string;
}

export interface NFTDatabase {
  sales: NFTSale[];
}

/**
 * Get all sold NFT IDs
 */
export async function getSoldNFTIds(): Promise<number[]> {
  await ensureMigrations();

  const { data, error } = await supabase
    .from(getTableName())
    .select('nft_id')
    .order('nft_id');

  if (error) {
    console.error('Error fetching sold NFT IDs:', error);
    return [];
  }

  return data.map(row => row.nft_id);
}

/**
 * Check if NFT is sold
 */
export async function isNFTSold(nftId: number): Promise<boolean> {
  await ensureMigrations();

  const { data, error } = await supabase
    .from(getTableName())
    .select('nft_id')
    .eq('nft_id', nftId)
    .single();

  if (error) {
    // Not found means not sold
    if (error.code === 'PGRST116') {
      return false;
    }
    console.error('Error checking if NFT is sold:', error);
    return false;
  }

  return data !== null;
}

/**
 * Mark NFT as sold
 * Uses UNIQUE constraint to prevent duplicates
 */
export async function markNFTAsSold(
  nftId: number,
  walletAddress: string,
  txHash: string
): Promise<void> {
  await ensureMigrations();

  // Check if already sold first
  const alreadySold = await isNFTSold(nftId);
  if (alreadySold) {
    throw new Error(`NFT ${nftId} is already sold`);
  }

  const { error } = await supabase
    .from(getTableName())
    .insert({
      nft_id: nftId,
      wallet_address: walletAddress,
      tx_hash: txHash
    });

  if (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      throw new Error(`NFT ${nftId} is already sold`);
    }
    console.error('Error marking NFT as sold:', error);
    throw new Error(`Failed to mark NFT ${nftId} as sold: ${error.message}`);
  }
}

/**
 * Get available NFT IDs (1-2000, excluding sold ones)
 */
export async function getAvailableNFTIds(): Promise<number[]> {
  await ensureMigrations();

  const { data, error } = await supabase.rpc(getFunctionName('get_available_nfts'));

  if (error) {
    console.error('Error fetching available NFT IDs:', error);
    return [];
  }

  return data.map((row: { nft_id: number }) => row.nft_id);
}

/**
 * Get random available NFT ID (concurrency-safe)
 * Uses Postgres FOR UPDATE SKIP LOCKED to prevent race conditions
 */
export async function getRandomAvailableNFTId(): Promise<number | null> {
  await ensureMigrations();

  const { data, error } = await supabase.rpc(getFunctionName('get_random_available_nft'));

  if (error) {
    console.error('Error getting random available NFT:', error);
    return null;
  }

  return data;
}

/**
 * Get multiple random available NFT IDs (concurrency-safe)
 */
export async function getRandomAvailableNFTIds(count: number): Promise<number[]> {
  await ensureMigrations();

  const { data, error } = await supabase.rpc(getFunctionName('get_random_available_nfts'), { count });

  if (error) {
    console.error('Error getting random available NFTs:', error);
    return [];
  }

  return data.map((row: { nft_id: number }) => row.nft_id);
}

/**
 * Get sale by NFT ID
 */
export async function getSaleByNFTId(nftId: number): Promise<NFTSale | null> {
  await ensureMigrations();

  const { data, error } = await supabase
    .from(getTableName())
    .select('*')
    .eq('nft_id', nftId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching sale by NFT ID:', error);
    return null;
  }

  return {
    nftId: data.nft_id,
    walletAddress: data.wallet_address,
    txHash: data.tx_hash,
    soldAt: data.sold_at
  };
}

/**
 * Get all sales
 */
export async function getAllSales(): Promise<NFTSale[]> {
  await ensureMigrations();

  const { data, error } = await supabase
    .from(getTableName())
    .select('*')
    .order('sold_at', { ascending: false });

  if (error) {
    console.error('Error fetching all sales:', error);
    return [];
  }

  return data.map(row => ({
    nftId: row.nft_id,
    walletAddress: row.wallet_address,
    txHash: row.tx_hash,
    soldAt: row.sold_at
  }));
}

/**
 * Get sales statistics
 */
export async function getSalesStats(): Promise<{
  totalSold: number;
  totalAvailable: number;
  latestSale: string | null;
}> {
  await ensureMigrations();

  const { data, error } = await supabase.rpc(getFunctionName('get_sales_stats'));

  if (error) {
    console.error('Error fetching sales stats:', error);
    return {
      totalSold: 0,
      totalAvailable: 2000,
      latestSale: null
    };
  }

  const stats = data[0];
  return {
    totalSold: Number(stats.total_sold),
    totalAvailable: Number(stats.total_available),
    latestSale: stats.latest_sale
  };
}

/**
 * Get current Cardano network
 * Useful for displaying in UI
 */
export function getCurrentNetwork(): CardanoNetwork {
  return getCardanoNetwork();
}
