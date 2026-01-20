
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTestTypes() {
    console.log("--- Checking Test Types ---");
    const teamId = '37b06214-a6b5-4814-aee5-d3c42a2347cd';

    // Get distinct test_types
    const { data, error } = await supabase
        .from('measurements')
        .select('test_type')
        .eq('team_id', teamId);

    if (error) {
        console.error("Error:", error);
        return;
    }

    const uniqueTypes = [...new Set(data.map(d => d.test_type))];
    console.log("Unique Test Types found in DB:", uniqueTypes);

    // Check CMJ specifically
    const { count: cmjCount } = await supabase
        .from('measurements')
        .select('*', { count: 'exact' })
        .eq('team_id', teamId)
        .eq('test_type', 'CMJ'); // Code uses 'CMJ'

    console.log(`Rows with test_type='CMJ': ${cmjCount}`);

    // Check exact strings expected by leaderboard.ts
    // 'CMJ', 'NordBord', 'ForceFrame', 'SmartSpeed', 'Dynamo'

    // Also Check Profiles RLS vs Service Role
    const { count: profileCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
    console.log(`Service Role Profile Count: ${profileCount}`);
}

checkTestTypes();
