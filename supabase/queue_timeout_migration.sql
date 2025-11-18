-- Queue Timeout System
-- Automatically removes users who don't mint within 5 minutes of joining queue
-- Run this AFTER running queue_table_migration.sql

-- Function to cleanup stale queue entries (timeout after 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_queue_entries()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Remove entries that have been "waiting" for more than 5 minutes
  -- This handles abandoned queue entries (user closed browser, etc.)
  DELETE FROM mint_queue
  WHERE status = 'waiting'
    AND created_at < NOW() - INTERVAL '5 minutes';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- ALSO remove stuck "minting" or "confirming" entries older than 10 minutes
  -- Any mint should complete within 10 minutes (90s confirmation + buffer)
  -- If stuck longer, something went wrong and we need to clean it up
  DELETE FROM mint_queue
  WHERE status IN ('minting', 'confirming')
    AND created_at < NOW() - INTERVAL '10 minutes';

  -- Also remove old completed/failed entries (older than 1 hour)
  DELETE FROM mint_queue
  WHERE created_at < NOW() - INTERVAL '1 hour'
    AND status IN ('completed', 'failed');

  RETURN deleted_count;
END;
$$;

-- Update the original cleanup function to also handle timeouts
CREATE OR REPLACE FUNCTION cleanup_old_queue_entries()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN cleanup_stale_queue_entries();
END;
$$;

-- Function to check if a queue entry has timed out
CREATE OR REPLACE FUNCTION get_queue_timeout_seconds(queue_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  seconds_remaining INTEGER;
  entry_created_at TIMESTAMPTZ;
BEGIN
  -- Get created_at for this queue entry
  SELECT created_at INTO entry_created_at
  FROM mint_queue
  WHERE id = queue_id;

  IF entry_created_at IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate seconds remaining (5 minutes = 300 seconds)
  seconds_remaining := 300 - EXTRACT(EPOCH FROM (NOW() - entry_created_at))::INTEGER;

  -- Return 0 if already timed out
  IF seconds_remaining < 0 THEN
    RETURN 0;
  END IF;

  RETURN seconds_remaining;
END;
$$;

-- Comments
COMMENT ON FUNCTION cleanup_stale_queue_entries() IS 'Removes waiting entries older than 5 minutes, stuck minting/confirming entries older than 10 minutes, and old completed/failed entries';
COMMENT ON FUNCTION get_queue_timeout_seconds(TEXT) IS 'Returns seconds remaining before queue entry times out (5 min limit)';
