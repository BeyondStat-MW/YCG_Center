const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deepDiveMetrics() {
    const devices = ['ForceFrame', 'SmartSpeed', 'DynaMo'];

    for (const dev of devices) {
        console.log(`\n\n--- Deep Dive: ${dev} ---`);
        const { data } = await supabase.from('measurements')
            .select('metrics')
            .eq('test_type', dev)
            .limit(3);

        if (data && data.length > 0) {
            data.forEach((d, i) => {
                console.log(`Sample ${i + 1}:`);
                console.log(JSON.stringify(d.metrics, null, 2).substring(0, 1000)); // First 1000 chars
            });
        }
    }
}

deepDiveMetrics();
