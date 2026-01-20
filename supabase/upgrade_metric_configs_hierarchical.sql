-- Upgrade metric_configs table for hierarchical structure
-- Run this in Supabase SQL Editor to add new columns

-- Add new columns for hierarchical structure (safe to run multiple times)
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

-- Copy test_type to device for existing records
UPDATE metric_configs 
SET device = test_type 
WHERE device IS NULL AND test_type IS NOT NULL;

-- Create new unique constraint if not exists (for hierarchical upsert)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'metric_configs_hierarchical_unique'
    ) THEN
        -- Only create if we don't have conflicting data
        BEGIN
            ALTER TABLE metric_configs 
            ADD CONSTRAINT metric_configs_hierarchical_unique 
            UNIQUE (device, test_category, metric_key);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore if constraint already exists or conflicts
            NULL;
        END;
    END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_metric_configs_device ON metric_configs(device);
CREATE INDEX IF NOT EXISTS idx_metric_configs_category ON metric_configs(test_category);

-- Drop the old unique constraint which prevents same metric in different categories
ALTER TABLE metric_configs DROP CONSTRAINT IF EXISTS metric_configs_unique;

