-- Diagnose Queue Issues
-- Run this in Supabase SQL Editor to see what's blocking the queue

-- 1. Check all current queue entries
SELECT
  id,
  wallet_address,
  status,
  nft_id,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))::INTEGER as age_seconds,
  get_queue_position(id) as position
FROM mint_queue
ORDER BY created_at ASC;

-- 2. Check if anyone is stuck in minting or confirming
SELECT
  id,
  wallet_address,
  status,
  EXTRACT(EPOCH FROM (NOW() - created_at))::INTEGER as age_seconds,
  CASE
    WHEN status = 'minting' AND EXTRACT(EPOCH FROM (NOW() - created_at)) > 600 THEN 'STUCK - Should cleanup'
    WHEN status = 'confirming' AND EXTRACT(EPOCH FROM (NOW() - created_at)) > 600 THEN 'STUCK - Should cleanup'
    WHEN status = 'waiting' AND EXTRACT(EPOCH FROM (NOW() - created_at)) > 300 THEN 'STUCK - Should cleanup'
    ELSE 'OK'
  END as health_status
FROM mint_queue
WHERE status IN ('waiting', 'minting', 'confirming')
ORDER BY created_at ASC;

-- 3. Get the next person who should be able to mint
SELECT * FROM get_next_in_queue();

-- 4. SOLUTION: Clear all stuck entries (if needed)
-- Uncomment this to run cleanup:
-- DELETE FROM mint_queue WHERE status IN ('waiting', 'minting', 'confirming') AND created_at < NOW() - INTERVAL '10 minutes';

-- 5. SOLUTION: Clear EVERYTHING (nuclear option)
-- Uncomment this to clear entire queue:
-- DELETE FROM mint_queue;
