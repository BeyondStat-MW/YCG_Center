const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
    // 1. Fetch raw measurements count
    const { count, error: cErr } = await supabase.from('measurements').select('*', { count: 'exact', head: true });
    console.log("Total Raw Measurements in DB:", count);

    // 2. Fetch sample measurements like the API does
    // API usually does: SELECT *, profiles (...)
    const { data, error } = await supabase
        .from('measurements')
        .select(`
            id,
            test_type,
            test_date,
            metrics,
            profile_id
        `)
        .limit(20);

    if (error) { console.error(error); return; }

    console.log("\nSample Data (First 3):");
    data.slice(0, 3).forEach(m => {
        console.log({
            id: m.id,
            test_type: m.test_type,
            test_date: m.test_date,
            isValidDate: !isNaN(new Date(m.test_date).getTime())
        });
    });

    // 3. Check Test Types
    const types = new Set(data.map(m => m.test_type));
    console.log("\nTest Types found in sample:", Array.from(types));
}

checkData();
