const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkImpMom() {
    const { data } = await supabase.from('measurements')
        .select('metrics')
        .eq('test_type', 'ForceDecks')
        .limit(20);

    if (data) {
        data.forEach((d, i) => {
            const keys = Object.keys(d.metrics);
            // Find keys containing 'imp' and 'mom' and 'jump'
            const matches = keys.filter(k =>
                k.toLowerCase().includes('imp') &&
                k.toLowerCase().includes('mom') &&
                k.toLowerCase().includes('jump')
            );

            if (matches.length > 0) {
                console.log(`Sample ${i}: Found Matches:`);
                matches.forEach(k => console.log(`  ${k}: ${d.metrics[k]}`));
            }
        });
    }
}

checkImpMom();
