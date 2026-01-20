-- Remove Foreign Key Constraint from profiles.id to auth.users.id
-- This allows creating profiles from Vald that don't have a corresponding supabase auth user.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Also check if there is a constraint on team_id if strictly enforced, but that should be fine as we insert teams.
