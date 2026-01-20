
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkCounts() {
    console.log("--- Checking Database Counts ---");

    // 1. Profiles
    const { count: profileCount, error: profileError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    if (profileError) console.error("Profile Error:", profileError);
    console.log(`Total Profiles: ${profileCount}`);

    // 2. Measurements
    const { count: measurementCount, error: measurementError } = await supabase
        .from('measurements')
        .select('*', { count: 'exact', head: true });

    if (measurementError) console.error("Measurement Error:", measurementError);
    console.log(`Total Measurements: ${measurementCount}`);

    // 3. MV Team Stats (for specific team)
    const teamId = '37b06214-a6b5-4814-aee5-d3c42a2347cd';
    const { data: mvStats, error: mvError } = await supabase
        .from('mv_team_stats')
        .select('*')
        .eq('team_id', teamId);

    if (mvError) console.error("MV Error:", mvError);
    console.log(`MV Team Stats for ${teamId}:`, mvStats);

    // 4. Check if there are profiles NOT in this team
    const { count: teamProfileCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

    console.log(`Profiles in Target Team (${teamId}): ${teamProfileCount}`);
}

checkCounts();
