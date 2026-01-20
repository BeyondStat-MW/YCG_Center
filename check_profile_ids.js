const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProfileIds() {
    // Check recent measurements
    const { data, error } = await supabase
        .from('measurements')
        .select('id, test_type, recorded_at, profile_id, metrics')
        .order('recorded_at', { ascending: false })
        .limit(20);

    if (error) { console.error(error); return; }

    console.log("Recent 20 Measurements check:");
    let nullProfileCount = 0;
    data.forEach(m => {
        const hasProfileId = !!m.profile_id;
        if (!hasProfileId) nullProfileCount++;

        console.log(`[${m.test_type}] Date: ${m.recorded_at}, ProfileID: ${m.profile_id}, Metrics.Name: ${m.metrics?.athleteName || m.metrics?.profileName}`);
    });

    console.log(`\nNull Profile IDs in recent 20: ${nullProfileCount}`);
}

checkProfileIds();
