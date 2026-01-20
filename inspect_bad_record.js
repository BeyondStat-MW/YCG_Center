const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectBadRecord() {
    // We search for a record where RSI is high, as we suspect this is the one
    const { data } = await supabase.from('measurements')
        .select('metrics')
        .eq('test_type', 'ForceDecks')
        .limit(1000);

    if (data) {
        const target = data.find(m => {
            const rsi = m.metrics?.["RSI (Jump Height/Contact Time)"];
            return rsi > 200;
        });

        if (target) {
            console.log("Found Target Record Keys:");
            console.log(Object.keys(target.metrics).sort());

            // value check
            console.log("Values:");
            const keys = Object.keys(target.metrics);
            keys.forEach(k => {
                if (String(target.metrics[k]).includes('209')) {
                    console.log(`MATCH 209: ${k} = ${target.metrics[k]}`);
                }
            });
        } else {
            console.log("No record with RSI > 200 found in first 1000.");
        }
    }
}

inspectBadRecord();
