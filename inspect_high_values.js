const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectHighValues() {
    // Fetch ForceDecks measurements with high jump values
    const { data: measurements } = await supabase
        .from('measurements')
        .select('id, recorded_at, metrics')
        .eq('test_type', 'ForceDecks')
        .limit(100);

    if (measurements) {
        // Filter in JS because JSONB filtering is tricky with dynamic keys
        const suspicious = measurements.filter(m => {
            const h1 = Number(m.metrics?.['Jump Height (Imp-Mom)']);
            const h2 = Number(m.metrics?.['JumpHeight(Imp-Mom)']);
            return (h1 > 100) || (h2 > 100);
        });

        console.log(`Found ${suspicious.length} suspicious records > 100cm.`);

        if (suspicious.length > 0) {
            console.log("\n--- Suspicious Record Sample ---");
            const s = suspicious[0];
            console.log("ID:", s.id);
            console.log("Recorded At:", s.recorded_at);
            console.log("Metrics Sample:", JSON.stringify(s.metrics, null, 2));
        }
    }
}

inspectHighValues();
