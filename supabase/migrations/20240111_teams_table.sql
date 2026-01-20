-- Migration: Multi-tenant Architecture Support
-- Created: 2024-01-11

-- 1. Create Teams Table
-- 1. Create Teams Table (Safe Update)
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'slug') THEN
        ALTER TABLE teams ADD COLUMN slug TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'logo_url') THEN
        ALTER TABLE teams ADD COLUMN logo_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'theme_config') THEN
        ALTER TABLE teams ADD COLUMN theme_config JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'api_config') THEN
        ALTER TABLE teams ADD COLUMN api_config JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'is_active') THEN
        ALTER TABLE teams ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 2. Update Profiles to link to Teams
-- team_id already exists in profiles, let's ensure it's a foreign key
ALTER TABLE profiles 
ADD CONSTRAINT fk_profiles_team 
FOREIGN KEY (team_id) REFERENCES teams(id);

-- 3. Update Measurements to include team_id for faster isolation
-- This avoids needing to join with profiles for every dashboard query
ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- 4. Create Index on measurements(team_id)
CREATE INDEX IF NOT EXISTS idx_measurements_team ON measurements(team_id);

-- 5. Enable RLS on Teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access for authenticated users
CREATE POLICY "Allow read access for teams"
  ON teams FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow all for admin users (To be defined, but for now allow authenticated to manage if we strictly control routes)
-- In a real scenario, we would check for a special 'admin' claim or role.
CREATE POLICY "Allow update for authenticated admins"
  ON teams FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
