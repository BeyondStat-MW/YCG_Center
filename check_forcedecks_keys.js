const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkForceDecks() {
    // Fetch ForceDecks measurements with their metrics to find the specific Jump Height key and any validity flags
    const { data } = await supabase.from('measurements')
        .select('metrics')
        .eq('test_type', 'ForceDecks')
        .limit(10);

    if (data && data.length > 0) {
        console.log("--- ForceDecks Keys Sample ---");
        // Print all keys that look like Jump Height or have status info
        data.forEach((d, i) => {
            console.log(`\nSample ${i + 1}:`);
            const keys = Object.keys(d.metrics);
            const jumpKeys = keys.filter(k => k.toLowerCase().includes('jump') && k.toLowerCase().includes('height'));
            const statusKeys = keys.filter(k => k.toLowerCase().includes('status') || k.toLowerCase().includes('valid') || k.toLowerCase().includes('error'));

            console.log('Jump Height Keys:', jumpKeys.map(k => `${k}: ${d.metrics[k]}`));
            console.log('Status/Valid Keys:', statusKeys.map(k => `${k}: ${d.metrics[k]}`));

            // Check specific requested metric
            const impMom = keys.find(k => k.toLowerCase().includes('imp') && k.toLowerCase().includes('mom'));
            if (impMom) console.log(`Found Imp-Mom key: ${impMom}: ${d.metrics[impMom]}`);
        });
    }
}

checkForceDecks();
