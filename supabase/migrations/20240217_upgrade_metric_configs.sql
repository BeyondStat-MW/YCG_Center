-- Upgrade metric_configs table for hierarchical structure
-- Generated: 2024-02-17

-- 1. Add new columns for hierarchical structure (safe to run multiple times)
DO $$ 
BEGIN
    -- Add device column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='metric_configs' AND column_name='device') THEN
        ALTER TABLE metric_configs ADD COLUMN device TEXT;
    END IF;
    
    -- Add test_category column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='metric_configs' AND column_name='test_category') THEN
        ALTER TABLE metric_configs ADD COLUMN test_category TEXT DEFAULT 'Unknown';
    END IF;
    
    -- Add test_position column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='metric_configs' AND column_name='test_position') THEN
        ALTER TABLE metric_configs ADD COLUMN test_position TEXT;
    END IF;
END $$;

-- 2. Backfill data: Copy test_type to device for existing records
UPDATE metric_configs 
SET device = test_type 
WHERE device IS NULL AND test_type IS NOT NULL;

-- 3. Create new unique constraint (device, test_category, metric_key)
-- Using a block to handle potential errors gracefully
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'metric_configs_hierarchical_unique'
    ) THEN
        BEGIN
            ALTER TABLE metric_configs 
            ADD CONSTRAINT metric_configs_hierarchical_unique 
            UNIQUE (device, test_category, metric_key);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create hierarchical unique constraint: %', SQLERRM;
        END;
    END IF;
END $$;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_metric_configs_device ON metric_configs(device);
CREATE INDEX IF NOT EXISTS idx_metric_configs_category ON metric_configs(test_category);

-- 5. Drop the legacy unique constraint to allow same metric_key in different categories
-- This is critical for the hierarchical system to work correctly.
ALTER TABLE metric_configs DROP CONSTRAINT IF EXISTS metric_configs_unique;
