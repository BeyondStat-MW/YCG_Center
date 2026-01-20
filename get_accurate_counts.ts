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

async function getAccurateCounts() {
    const adminSupabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
    );
    const teamId = '37b06214-a6b5-4814-aee5-d3c42a2347cd';

    console.log(`--- Accurate Measurement Counts for ${teamId} ---`);

    const { data: rawRows, error } = await adminSupabase
        .from("measurements")
        .select("test_type")
        .eq("team_id", teamId);

    if (error) {
        console.error("Error:", error);
        return;
    }

    const counts = rawRows.reduce((acc: any, curr: any) => {
        const type = curr.test_type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    console.table(counts);
}

getAccurateCounts();
