/**
 * Mint Queue System (Database-Backed)
 * Ensures only one mint happens at a time (FIFO)
 * Prevents concurrent UTxO conflicts
 * Persists across server restarts and works with multiple server instances
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface QueueEntry {
  id: string;
  wallet_address: string;
  status: 'waiting' | 'minting' | 'confirming' | 'completed' | 'failed';
  nft_id?: number | null;
  tx_hash?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

class MintQueue {

  /**
   * Add user to queue and return their position
   * If user already has an active queue entry, returns existing entry instead of creating duplicate
   */
  async addToQueue(walletAddress: string): Promise<{ queueId: string; position: number }> {
    // First, check if this wallet already has an active queue entry
    const { data: existingEntry } = await supabase
      .from('mint_queue')
      .select('*')
      .eq('wallet_address', walletAddress)
      .in('status', ['waiting', 'minting', 'confirming'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If they already have an active entry, return that instead of creating a new one
    if (existingEntry) {
      const { data: positionData } = await supabase
        .rpc('get_queue_position', { queue_id: existingEntry.id });

      const position = positionData || 1;

      console.log(`🔄 ${walletAddress} already in queue at position ${position} (queue ID: ${existingEntry.id})`);

      return { queueId: existingEntry.id, position };
    }

    // No active entry found, create a new one
    const queueId = `${walletAddress}-${Date.now()}`;

    // Insert into database
    const { error } = await supabase
      .from('mint_queue')
      .insert({
        id: queueId,
        wallet_address: walletAddress,
        status: 'waiting'
      });

    if (error) {
      console.error('Error adding to queue:', error);
      throw new Error('Failed to join queue');
    }

    // Get position using SQL function
    const { data: positionData } = await supabase
      .rpc('get_queue_position', { queue_id: queueId });

    const position = positionData || 1;

    console.log(`📝 Added ${walletAddress} to queue at position ${position}`);

    return { queueId, position };
  }

  /**
   * Get queue status for a specific user
   */
  async getQueueStatus(queueId: string): Promise<{
    position: number;
    status: string;
    totalInQueue: number;
    estimatedWaitTime: number;
    timeoutSeconds?: number | null;
    nftId?: number | null;
    txHash?: string | null;
    error?: string | null;
  } | null> {
    // Get entry from database
    const { data: entry, error } = await supabase
      .from('mint_queue')
      .select('*')
      .eq('id', queueId)
      .single();

    if (error || !entry) {
      return null;
    }

    // Get position using SQL function
    const { data: positionData } = await supabase
      .rpc('get_queue_position', { queue_id: queueId });

    const position = positionData || 1;

    // Get total in queue (count waiting, minting, AND confirming)
    const { count } = await supabase
      .from('mint_queue')
      .select('*', { count: 'exact', head: true })
      .in('status', ['waiting', 'minting', 'confirming']);

    const totalInQueue = count || 0;

    // Estimate: 60s per mint (build + sign + submit + confirm)
    // Each person must fully complete before next person starts
    // Position 1 = 0 wait (minting now), Position 2 = 60s wait, Position 3 = 120s wait, etc.
    const estimatedWaitTime = position > 1 ? (position - 1) * 60 : 0;

    // Get timeout seconds (5 min limit from created_at)
    const { data: timeoutData } = await supabase
      .rpc('get_queue_timeout_seconds', { queue_id: queueId });

    const timeoutSeconds = timeoutData as number | null;

    return {
      position,
      status: entry.status,
      totalInQueue,
      estimatedWaitTime,
      timeoutSeconds,
      nftId: entry.nft_id,
      txHash: entry.tx_hash,
      error: entry.error_message
    };
  }

  /**
   * Check if user is at front of queue (can mint)
   * ONLY ONE person can mint at a time (including confirmation)
   */
  async canMint(queueId: string): Promise<boolean> {
    // Get entry from database
    const { data: entry } = await supabase
      .from('mint_queue')
      .select('*')
      .eq('id', queueId)
      .single();

    if (!entry || entry.status !== 'waiting') return false;

    // Check if ANYONE is currently minting OR confirming
    // This ensures ONLY ONE person mints at a time (prevents ALL UTxO conflicts)
    const { count } = await supabase
      .from('mint_queue')
      .select('*', { count: 'exact', head: true })
      .in('status', ['minting', 'confirming']);

    // If someone is minting or confirming, you can't start yet
    if (count && count > 0) {
      return false;
    }

    // Check if you're the first waiting entry (by created_at)
    const { data } = await supabase
      .rpc('get_next_in_queue')
      .single();

    const firstInQueue = data as { id: string; wallet_address: string } | null;

    return firstInQueue?.id === queueId;
  }

  /**
   * Mark that minting has started
   */
  async startMinting(queueId: string, nftId: number): Promise<void> {
    await supabase
      .from('mint_queue')
      .update({
        status: 'minting',
        nft_id: nftId
      })
      .eq('id', queueId);

    console.log(`🔨 Started minting NFT ${nftId} for queue ID ${queueId}`);
  }

  /**
   * Mark that transaction was submitted, now confirming
   */
  async startConfirming(queueId: string, txHash: string): Promise<void> {
    await supabase
      .from('mint_queue')
      .update({
        status: 'confirming',
        tx_hash: txHash
      })
      .eq('id', queueId);

    console.log(`⏳ Confirming transaction ${txHash} for queue ID ${queueId}`);
  }

  /**
   * Mark mint as completed and remove from queue
   */
  async completeMint(queueId: string): Promise<void> {
    await supabase
      .from('mint_queue')
      .update({ status: 'completed' })
      .eq('id', queueId);

    console.log(`✅ Completed mint for queue ID ${queueId}`);

    // Remove from queue after 5 seconds (so user can see completion status)
    setTimeout(async () => {
      await supabase
        .from('mint_queue')
        .delete()
        .eq('id', queueId);

      console.log(`🗑️ Removed ${queueId} from queue`);
    }, 5000);
  }

  /**
   * Mark mint as failed and remove from queue
   */
  async failMint(queueId: string, error: string): Promise<void> {
    await supabase
      .from('mint_queue')
      .update({
        status: 'failed',
        error_message: error
      })
      .eq('id', queueId);

    console.log(`❌ Failed mint for queue ID ${queueId}: ${error}`);

    // Remove from queue after 5 seconds
    setTimeout(async () => {
      await supabase
        .from('mint_queue')
        .delete()
        .eq('id', queueId);

      console.log(`🗑️ Removed failed ${queueId} from queue`);
    }, 5000);
  }

  /**
   * Clean up stale entries (older than 5 minutes for waiting, 1 hour for completed/failed)
   */
  async cleanup(): Promise<void> {
    const { data } = await supabase.rpc('cleanup_stale_queue_entries');

    if (data && data > 0) {
      console.log(`🧹 Cleaned up ${data} stale queue entries (5 min timeout for waiting)`);
    }
  }

  /**
   * Get current queue state (for debugging)
   */
  async getQueueState(): Promise<QueueEntry[]> {
    const { data } = await supabase
      .from('mint_queue')
      .select('*')
      .order('created_at', { ascending: true });

    return data || [];
  }

  /**
   * Get queue length
   */
  async getQueueLength(): Promise<number> {
    const { count } = await supabase
      .from('mint_queue')
      .select('*', { count: 'exact', head: true })
      .in('status', ['waiting', 'minting', 'confirming']);

    return count || 0;
  }

  /**
   * Clear entire queue (admin only)
   * Removes ALL entries from queue
   */
  async clearQueue(): Promise<number> {
    // Get count before deleting
    const { count } = await supabase
      .from('mint_queue')
      .select('*', { count: 'exact', head: true });

    const deletedCount = count || 0;

    // Delete all entries
    const { error } = await supabase
      .from('mint_queue')
      .delete()
      .neq('id', ''); // Delete all (PostgreSQL requires a condition)

    if (error) {
      console.error('Error clearing queue:', error);
      throw new Error('Failed to clear queue');
    }

    console.log(`🧹 Queue cleared - removed ${deletedCount} entries`);

    return deletedCount;
  }
}

// Singleton instance
export const mintQueue = new MintQueue();

// Run cleanup every 30 seconds (to catch 5-minute timeouts quickly)
setInterval(() => {
  mintQueue.cleanup();
}, 30 * 1000);
