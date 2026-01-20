
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugLeaderboard() {
    console.log("--- Debugging Leaderboard Query ---");
    const teamId = '37b06214-a6b5-4814-aee5-d3c42a2347cd';

    // 1. Check Raw Measurements for CMJ
    const { count: rawCount, error: rawError } = await supabase
        .from('measurements')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('test_type', 'CMJ');

    console.log(`Raw CMJ Rows: ${rawCount}`);
    if (rawError) console.error("Raw Error:", rawError);

    // 2. Check measurement example
    const { data: sample } = await supabase
        .from('measurements')
        .select('player_id')
        .eq('team_id', teamId)
        .eq('test_type', 'CMJ')
        .limit(1);

    if (sample && sample.length > 0) {
        console.log(`Sample Player ID from Measurement: ${sample[0].player_id}`);

        // 3. Check if this player exists in profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('id', sample[0].player_id);

        console.log("Matching Profile:", profile);
    } else {
        console.log("No CMJ measurements found to sample.");
    }

    // 4. Run the EXACT Join Query from leaderboard.ts
    console.log("--- Running JOIN Query ---");
    const { data: joinData, error: joinError } = await supabase
        .from('measurements')
        .select(`
            player_id,
            recorded_at,
            metrics,
            profiles!inner(name)
        `)
        .eq('team_id', teamId)
        .eq('test_type', 'CMJ')
        .limit(5);

    if (joinError) {
        console.error("JOIN Query Failed:", joinError);
    } else {
        console.log(`JOIN Query found ${joinData?.length} rows.`);
        if (joinData && joinData.length > 0) {
            console.log("Sample Row:", JSON.stringify(joinData[0], null, 2));
        }
    }
}

debugLeaderboard();
