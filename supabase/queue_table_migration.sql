-- Mint Queue Table Migration
-- Database-backed FIFO queue for minting
-- Run this in Supabase SQL Editor

-- Create mint_queue table
CREATE TABLE IF NOT EXISTS mint_queue (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'minting', 'confirming', 'completed', 'failed')),
  nft_id INTEGER,
  tx_hash TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_wallet CHECK (LENGTH(wallet_address) > 10)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mint_queue_status ON mint_queue(status);
CREATE INDEX IF NOT EXISTS idx_mint_queue_created_at ON mint_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_mint_queue_wallet ON mint_queue(wallet_address);

-- Function to get queue position (1-indexed)
-- Counts all users ahead of you (waiting, minting, AND confirming)
-- Returns 1 if you're first (minting now), 2 if there's 1 person ahead, etc.
-- This ensures sequential processing - only ONE person mints at a time
CREATE OR REPLACE FUNCTION get_queue_position(queue_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  position INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO position
  FROM mint_queue
  WHERE created_at < (SELECT created_at FROM mint_queue WHERE id = queue_id)
    AND status IN ('waiting', 'minting', 'confirming');

  RETURN position;
END;
$$;

-- Function to get next in queue
CREATE OR REPLACE FUNCTION get_next_in_queue()
RETURNS TABLE(id TEXT, wallet_address TEXT)
LANGUAGE sql
AS $$
  SELECT id, wallet_address
  FROM mint_queue
  WHERE status = 'waiting'
  ORDER BY created_at ASC
  LIMIT 1;
$$;

-- Function to cleanup old entries (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_queue_entries()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM mint_queue
  WHERE created_at < NOW() - INTERVAL '1 hour'
    AND status IN ('completed', 'failed');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mint_queue_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER mint_queue_updated_at
  BEFORE UPDATE ON mint_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_mint_queue_updated_at();

-- Comments
COMMENT ON TABLE mint_queue IS 'FIFO queue for NFT minting - persists across server restarts';
COMMENT ON COLUMN mint_queue.id IS 'Unique queue ID (wallet_address-timestamp)';
COMMENT ON COLUMN mint_queue.status IS 'Queue entry status: waiting, minting, confirming, completed, failed';
COMMENT ON COLUMN mint_queue.nft_id IS 'NFT ID being minted (set when minting starts)';
COMMENT ON COLUMN mint_queue.tx_hash IS 'Transaction hash (set when tx submitted)';
COMMENT ON COLUMN mint_queue.created_at IS 'When user joined queue (determines FIFO order)';

-- Mark migration as applied
INSERT INTO schema_migrations (version, name) VALUES (5, 'mint_queue_table') ON CONFLICT DO NOTHING;
