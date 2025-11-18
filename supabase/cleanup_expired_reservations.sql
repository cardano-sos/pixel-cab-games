-- Cleanup Expired Reservations
-- Removes reservation entries that are older than 10 minutes and still have tx_hash = NULL
-- This handles cases where users started minting but never completed

-- Function for PREPROD network
CREATE OR REPLACE FUNCTION cleanup_expired_reservations_preprod()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete reservations older than 10 minutes that still have tx_hash = NULL
  -- This means the user never completed the mint
  DELETE FROM nft_sales_preprod
  WHERE tx_hash IS NULL
    AND reserved_at IS NOT NULL
    AND reserved_at < NOW() - INTERVAL '10 minutes';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE 'Cleaned up % expired reservations from PREPROD', deleted_count;
  END IF;

  RETURN deleted_count;
END;
$$;

-- Function for MAINNET network
CREATE OR REPLACE FUNCTION cleanup_expired_reservations_mainnet()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete reservations older than 10 minutes that still have tx_hash = NULL
  -- This means the user never completed the mint
  DELETE FROM nft_sales_mainnet
  WHERE tx_hash IS NULL
    AND reserved_at IS NOT NULL
    AND reserved_at < NOW() - INTERVAL '10 minutes';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE 'Cleaned up % expired reservations from MAINNET', deleted_count;
  END IF;

  RETURN deleted_count;
END;
$$;

-- Add comments
COMMENT ON FUNCTION cleanup_expired_reservations_preprod() IS 'Removes reservation entries older than 10 minutes with NULL tx_hash (abandoned mints) from PREPROD';
COMMENT ON FUNCTION cleanup_expired_reservations_mainnet() IS 'Removes reservation entries older than 10 minutes with NULL tx_hash (abandoned mints) from MAINNET';
