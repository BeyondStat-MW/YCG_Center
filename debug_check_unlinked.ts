
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUnlinkedParams() {
    console.log("--- Checking Unlinked Measurements (Latest 20) ---");

    const holderId = 'b2335ee5-858e-4a5d-880f-b73b4a81d43d';

    const { data, error } = await supabase
        .from('measurements')
        .select('*')
        .eq('player_id', holderId)
        .order('recorded_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${data.length} unlinked records.`);

    data.forEach((m: any) => {
        const metrics = m.metrics || {};
        const pid = metrics.profileId || 'NoPID';
        const tDate = m.recorded_at;
        const type = m.test_type;
        console.log(`[${tDate}] Type: ${type}, PID: ${pid}`);
    });
}

checkUnlinkedParams();
