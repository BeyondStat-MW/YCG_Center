-- Create player_aliases table for identifying players across different sources
CREATE TABLE IF NOT EXISTS player_aliases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    source TEXT NOT NULL, -- e.g., 'VALD', 'Keiser', 'Manual'
    alias_name TEXT NOT NULL, -- The name as strictly equal to the source data
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Constraint: A specific alias in a source can map to only one real profile
    UNIQUE(source, alias_name)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_player_aliases_lookup ON player_aliases(source, alias_name);

-- RLS Policy (Open for now as per current project style, or restricted)
ALTER TABLE player_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON player_aliases
    FOR ALL USING (auth.role() = 'authenticated');
    
-- Add comment
COMMENT ON TABLE player_aliases IS 'Maps source-specific player names to canonical profile IDs';
