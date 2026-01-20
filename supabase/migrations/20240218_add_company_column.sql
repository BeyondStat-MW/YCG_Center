
-- Add company column to metric_configs for multi-vendor support
-- Generated: 2026-01-17

-- 1. Add company column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='metric_configs' AND column_name='company') THEN
        ALTER TABLE metric_configs ADD COLUMN company TEXT DEFAULT 'VALD';
    END IF;
END $$;

-- 2. Backfill existing VALD devices
-- We assume current data is all VALD, but let's be specific just in case
UPDATE metric_configs 
SET company = 'VALD' 
WHERE device IN ('ForceDecks', 'NordBord', 'ForceFrame', 'SmartSpeed', 'DynaMo');

-- 3. Update Unique Constraint to include company
-- This prevents collision if different companies have same device name (unlikely but good practice)
-- and helps with query indexing.

DO $$
BEGIN
    -- Drop the previous hierarchical constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'metric_configs_hierarchical_unique'
    ) THEN
        ALTER TABLE metric_configs DROP CONSTRAINT metric_configs_hierarchical_unique;
    END IF;

    -- Create new constraint with company
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'metric_configs_company_hierarchical_unique'
    ) THEN
        ALTER TABLE metric_configs 
        ADD CONSTRAINT metric_configs_company_hierarchical_unique 
        UNIQUE (company, device, test_category, metric_key);
    END IF;
END $$;

-- 4. Index for company
CREATE INDEX IF NOT EXISTS idx_metric_configs_company ON metric_configs(company);
