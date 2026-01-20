-- Create metric_configs table for storing metric display settings
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS metric_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_type TEXT NOT NULL,
    metric_key TEXT NOT NULL,
    display_name TEXT NOT NULL,
    unit TEXT DEFAULT '',
    visible BOOLEAN DEFAULT true,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint for upsert
    CONSTRAINT metric_configs_unique UNIQUE (test_type, metric_key)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_metric_configs_test_type ON metric_configs(test_type);

-- Enable RLS
ALTER TABLE metric_configs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read (or service role)
CREATE POLICY "Allow read access to metric_configs" ON metric_configs
    FOR SELECT USING (true);

-- Allow service role to insert/update/delete
CREATE POLICY "Allow service role full access to metric_configs" ON metric_configs
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON metric_configs TO service_role;
GRANT SELECT ON metric_configs TO anon;
GRANT SELECT ON metric_configs TO authenticated;
