
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRecentData() {
    console.log("--- Checking Recent Data (Since 2026-01-15) ---");

    const { data, error } = await supabase
        .from('measurements')
        .select('test_type, recorded_at')
        .gte('recorded_at', '2026-01-15T00:00:00Z')
        .order('recorded_at', { ascending: false });

    if (error) {
        console.error("Error fetching measurements:", error);
        return;
    }

    console.log(`Total Recent Records: ${data.length}`);

    // Group by test_type
    const counts: Record<string, number> = {};
    const dates: Record<string, Set<string>> = {};

    data.forEach((row: any) => {
        const type = row.test_type || 'Unknown';
        counts[type] = (counts[type] || 0) + 1;

        if (!dates[type]) dates[type] = new Set();
        dates[type].add(row.recorded_at.split('T')[0]); // 날짜만 저장
    });

    console.log("\nCounts by Test Type:");
    Object.entries(counts).forEach(([type, count]) => {
        console.log(`- ${type}: ${count} records (Dates: ${Array.from(dates[type]).sort().join(', ')})`);
    });

    // Check specific ForceFrame/NordBord keywords if missing
    const missingTypes = ['NordBord', 'ForceFrame', 'ForceDecks'];
    missingTypes.forEach(t => {
        if (!counts[t]) console.log(`\n[WARNING] No data found for ${t}`);
    });
}

checkRecentData();
