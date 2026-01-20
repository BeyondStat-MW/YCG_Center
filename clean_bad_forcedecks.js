const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanBadData() {
    // 1. Fetch ForceDecks data
    // Pagination might be needed if there are many, but let's start with a chunk
    const { data: measurements, error } = await supabase
        .from('measurements')
        .select('id, metrics')
        .eq('test_type', 'ForceDecks')
        .limit(10000); // Fetch a large batch

    if (error) { console.error(error); return; }

    const toDelete = [];

    measurements.forEach(m => {
        const metrics = m.metrics;
        if (!metrics) return;

        // Keys to check based on previous inspection
        // Key 1: RSI (usually "RSI (Jump Height/Contact Time)")
        // Key 2: Bad Jump Height (usually "jumpHeight_cm_")

        const rsiVal = metrics["RSI (Jump Height/Contact Time)"] || metrics["RSI(JumpHeight/ContactTime)"];
        const heightVal = metrics["jumpHeight_cm_"] || metrics["Jump Height [cm]"];

        // Check if they exist and are strictly equal (and not 0/null)
        if (rsiVal && heightVal && Number(rsiVal) === Number(heightVal) && Number(rsiVal) > 50) {
            // Also confirm it's suspiciously high to avoid coincidentally equal low values? 
            // The user said "completely equal".
            // Adding > 50 safety just in case, though RSI=Height=209 is definitely the target.

            console.log(`Found Bad Record ID: ${m.id}`);
            console.log(`  RSI: ${rsiVal} == Height: ${heightVal}`);
            toDelete.push(m.id);
        }
    });

    console.log(`\nFound ${toDelete.length} records to delete.`);

    if (toDelete.length > 0) {
        const { error: delError } = await supabase
            .from('measurements')
            .delete()
            .in('id', toDelete);

        if (delError) console.error("Deletion Error:", delError);
        else console.log("Successfully deleted records.");
    }
}

cleanBadData();
