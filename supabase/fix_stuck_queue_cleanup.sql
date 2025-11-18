-- Fix Stuck Queue Entries
-- Updates cleanup function to also remove stuck "minting" and "confirming" entries
-- that are older than 10 minutes (plenty of time for any mint to complete)

-- Updated cleanup function that removes ALL stuck entries
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

-- Add comment
COMMENT ON FUNCTION cleanup_stale_queue_entries() IS 'Removes waiting entries older than 5 minutes, stuck minting/confirming entries older than 10 minutes, and old completed/failed entries';
