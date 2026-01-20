import { createClient } from "@supabase/supabase-js";
import fs from 'fs';
import path from 'path';

function getEnv() {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env: Record<string, string> = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
    return env;
}

const env = getEnv();

async function checkAndRefresh() {
    const adminSupabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        }
    );
    const teamId = '37b06214-a6b5-4814-aee5-d3c42a2347cd';

    console.log("Refreshing Materialized Views via RPC...");
    const { error: refreshError } = await adminSupabase.rpc('refresh_stats');

    if (refreshError) {
        console.error("RPC Error (Attempting manual refresh):", refreshError);
        // If RPC fails (e.g. not concurrently-able or not defined), we'll have to rely on the current data or another method.
    } else {
        console.log("Refresh successful!\n");
    }

    console.log(`Checking UPDATED data for Team ID: ${teamId}...`);

    const { data, error } = await adminSupabase
        .from("mv_daily_stats")
        .select("device_type, test_count, test_date")
        .eq("team_id", teamId);

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    const aggregated = data.reduce((acc: any, curr: any) => {
        if (!acc[curr.device_type]) acc[curr.device_type] = 0;
        acc[curr.device_type] += curr.test_count;
        return acc;
    }, {} as Record<string, number>);

    console.log("\n--- UPDATED Aggregated Test Counts (View) ---");
    console.table(aggregated);

    console.log("\n--- Raw Measurements Aggregate (Direct) ---");
    const { data: rawCount } = await adminSupabase
        .from("measurements")
        .select("test_type")
        .eq("team_id", teamId);

    if (rawCount) {
        const rawAggregated = rawCount.reduce((acc: any, curr: any) => {
            const type = curr.test_type;
            if (!acc[type]) acc[type] = 0;
            acc[type] += 1;
            return acc;
        }, {} as Record<string, number>);
        console.table(rawAggregated);
    }
}

checkAndRefresh();
