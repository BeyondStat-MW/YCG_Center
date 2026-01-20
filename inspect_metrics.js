const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectMeasurements() {
    // Check test_type distribution
    const { data: types, error } = await supabase.from('measurements').select('test_type, metrics').limit(20);

    if (error) { console.error(error); return; }

    // Group types
    const counts = {};
    types.forEach(t => {
        counts[t.test_type] = (counts[t.test_type] || 0) + 1;
    });
    console.log("Test Types sample:", counts);

    // Inspect Metrics Structure for each device target
    const targetDevices = ['ForceDecks', 'NordBord', 'ForceFrame', 'SmartSpeed', 'DynaMo'];

    for (const dev of targetDevices) {
        // Find one sample
        const sample = types.find(t => t.test_type === dev || t.test_type?.toLowerCase() === dev.toLowerCase());
        if (sample) {
            console.log(`\nSample Metrics for ${dev}:`, JSON.stringify(sample.metrics, null, 2));
        } else {
            console.log(`\nNo sample found for ${dev} in first 20. Fetching specific...`);
            const { data: specific } = await supabase.from('measurements').select('metrics').eq('test_type', dev).limit(1);
            if (specific && specific.length > 0) {
                console.log(`Found specific:`, JSON.stringify(specific[0].metrics, null, 2));
            } else {
                console.log(`Still no data for ${dev}`);
            }
        }
    }
}

inspectMeasurements();
