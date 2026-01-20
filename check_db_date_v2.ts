
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkID() {
    console.log("--- Checking for ID: 578ba5ac-8812-4bcf-b5bc-d4d5287fe83f ---");

    // Fetch recent 2000 records
    const { data, error } = await supabase
        .from('measurements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000);

    if (error) {
        console.error(error);
        return;
    }

    const targetId = '578ba5ac-8812-4bcf-b5bc-d4d5287fe83f';
    const found = data.find((row) => {
        const m = row.metrics;
        const tid = m.testId || m.id || m.recordingId;
        return tid === targetId;
    });

    if (found) {
        console.log("✅ FOUND IT!");
        console.log(found);
    } else {
        console.log("❌ Not found in recent 2000 records.");
    }
}

checkID();
