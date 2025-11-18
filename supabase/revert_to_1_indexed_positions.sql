-- Revert Queue Position to Start at 1
-- Position 1 = you're minting NOW
-- Position 2 = you're next
-- etc.

-- Revert the get_queue_position function to return 1-indexed positions
CREATE OR REPLACE FUNCTION get_queue_position(queue_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  position INTEGER;
BEGIN
  -- Count how many people are AHEAD of you, then add 1
  -- Returns 1 if you're first (no one ahead)
  -- Returns 2 if there's 1 person ahead, etc.
  SELECT COUNT(*) + 1 INTO position
  FROM mint_queue
  WHERE created_at < (SELECT created_at FROM mint_queue WHERE id = queue_id)
    AND status IN ('waiting', 'minting', 'confirming');

  RETURN position;
END;
$$;

COMMENT ON FUNCTION get_queue_position(TEXT) IS 'Returns 1-indexed queue position (1 = minting now, 2 = next, etc.)';
