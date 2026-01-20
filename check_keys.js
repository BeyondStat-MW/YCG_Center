const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkKeys() {
    const devices = ['ForceDecks', 'NordBord', 'ForceFrame', 'SmartSpeed', 'DynaMo'];

    for (const dev of devices) {
        const { data } = await supabase.from('measurements')
            .select('metrics')
            .eq('test_type', dev)
            .limit(1);

        if (data && data.length > 0) {
            console.log(`\n--- ${dev} Keys ---`);
            const m = data[0].metrics;
            // Print top level keys
            console.log(Object.keys(m).filter(k => typeof m[k] !== 'object'));

            // If there's a 'results' or 'reps' array, print first item keys
            if (m.results && Array.isArray(m.results) && m.results.length > 0) {
                console.log('results[0] keys:', Object.keys(m.results[0]));
            }
            if (m.reps && Array.isArray(m.reps) && m.reps.length > 0) {
                console.log('reps[0] keys:', Object.keys(m.reps[0]));
            }
            // Check for specific keys we suspect
            console.log('Contains "Jump Height"?', JSON.stringify(m).includes('Jump Height'));
            console.log('Contains "Adduction"?', JSON.stringify(m).includes('Adduction'));
            console.log('Contains "Nordic"?', JSON.stringify(m).includes('Nordic'));
            console.log('Contains "Sprint"?', JSON.stringify(m).includes('Sprint'));
            console.log('Contains "Extension"?', JSON.stringify(m).includes('Extension'));
        }
    }
}

checkKeys();
