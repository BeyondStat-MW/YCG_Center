const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findExtremeValues() {
    let allData = [];
    const pageSize = 1000;

    // Fetch first 1000 ForceDecks
    const { data } = await supabase
        .from('measurements')
        .select('id, metrics')
        .eq('test_type', 'ForceDecks')
        .limit(pageSize);

    if (!data) return;

    let maxScore = 0;
    let maxRecord = null;

    data.forEach(m => {
        let val = 0;
        let source = '';

        if (m.metrics?.['Jump Height (Imp-Mom)']) { val = Number(m.metrics['Jump Height (Imp-Mom)']); source = 'Jump Height (Imp-Mom)'; }
        else if (m.metrics?.['JumpHeight(Imp-Mom)']) { val = Number(m.metrics['JumpHeight(Imp-Mom)']); source = 'JumpHeight(Imp-Mom)'; }
        else if (m.metrics?.jumpHeight_cm_) { val = Number(m.metrics.jumpHeight_cm_); source = 'jumpHeight_cm_'; }
        else if (m.metrics?.['Jump Height [cm]']) { val = Number(m.metrics['Jump Height [cm]']); source = 'Jump Height [cm]'; }

        if (val > 100) {
            console.log(`Found High Value: ${val} from key: ${source}`);
            console.log("Full Metrics Keys:", Object.keys(m.metrics));
        }

        if (val > maxScore) {
            maxScore = val;
            maxRecord = m;
        }
    });

    console.log(`Max Value Found: ${maxScore}`);
    if (maxRecord) {
        console.log("Record Keys:", Object.keys(maxRecord.metrics));
        console.log("Full Metrics:", JSON.stringify(maxRecord.metrics, null, 2));
    }
}

findExtremeValues();
