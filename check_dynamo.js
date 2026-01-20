const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDynamo() {
    // Find a Strength test
    const { data } = await supabase.from('measurements')
        .select('metrics')
        .eq('test_type', 'DynaMo')
        .ilike('metrics->>testCategory', 'Strength') // specific filter if possible, or just fetch
        .limit(5);

    if (data && data.length > 0) {
        console.log("Dynamo Strength Sample:");
        console.log(JSON.stringify(data[0].metrics, null, 2));
    } else {
        console.log("No Dynamo Strength tests found with testCategory=Strength. Fetching any Dynamo...");
        const { data: anyData } = await supabase.from('measurements').select('metrics').eq('test_type', 'DynaMo').limit(3);
        console.log(JSON.stringify(anyData, null, 2));
    }
}
checkDynamo();
