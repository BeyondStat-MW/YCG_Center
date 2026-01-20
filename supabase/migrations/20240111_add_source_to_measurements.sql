-- Add 'source' column to measurements table to distinguish between data origins (vald, manual, catapult, etc.)
-- Add 'external_id' to store the ID from the external system to prevent duplicates.

ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'vald',
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Create an index on external_id for faster lookups during sync
CREATE INDEX IF NOT EXISTS idx_measurements_external_id ON measurements(external_id);

-- Create an index on source for filtering
CREATE INDEX IF NOT EXISTS idx_measurements_source ON measurements(source);

-- Comment on columns
COMMENT ON COLUMN measurements.source IS 'Source of the measurement data (e.g., vald, manual, catapult)';
COMMENT ON COLUMN measurements.external_id IS 'ID from the external source system for deduplication';
