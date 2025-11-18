-- Update Queue Position to Start at 0
-- Position 0 = you're minting NOW
-- Position 1 = you're next
-- etc.

-- Update the get_queue_position function to return 0-indexed positions
CREATE OR REPLACE FUNCTION get_queue_position(queue_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  position INTEGER;
BEGIN
  -- Count how many people are AHEAD of you
  -- Returns 0 if you're first (no one ahead)
  -- Returns 1 if there's 1 person ahead, etc.
  SELECT COUNT(*) INTO position
  FROM mint_queue
  WHERE created_at < (SELECT created_at FROM mint_queue WHERE id = queue_id)
    AND status IN ('waiting', 'minting', 'confirming');

  RETURN position;
END;
$$;

COMMENT ON FUNCTION get_queue_position(TEXT) IS 'Returns 0-indexed queue position (0 = minting now, 1 = next, etc.)';
