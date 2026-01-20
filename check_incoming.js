const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkIncomingData() {
    const { data } = await supabase.from('measurements')
        .select('metrics')
        .eq('test_type', 'ForceDecks')
        .order('recorded_at', { ascending: false }) // Newly inserted might have old dates, but let's check any
        .limit(1);

    if (data && data.length > 0) {
        const m = data[0];
        console.log("Checking sample record...");
        console.log("Date:", m.metrics?.testDateUtc || m.metrics?.utcRecorded);
        console.log(`Jump Height (Imp-Mom):`, m.metrics['Jump Height (Imp-Mom)'] || 'N/A');
        console.log(`jumpHeight_cm_:`, m.metrics['jumpHeight_cm_'] || 'N/A');
        console.log(`RSI:`, m.metrics['RSI (Jump Height/Contact Time)'] || 'N/A');
    }
}

checkIncomingData();
