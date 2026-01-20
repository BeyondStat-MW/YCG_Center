
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectDaily() {
    console.log("--- Daily Stats Inspection ---");

    const { data: stats, error } = await supabase
        .from("mv_daily_stats")
        .select("*")
        .limit(5);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Sample Data:", JSON.stringify(stats, null, 2));
    }
}

inspectDaily();
