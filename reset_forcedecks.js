const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetForceDecks() {
    console.log("⚠️ Deleting ALL ForceDecks measurements for clean re-sync...");

    // Safety check just in case
    const { count } = await supabase.from('measurements').select('*', { count: 'exact', head: true }).eq('test_type', 'ForceDecks');
    console.log(`Found ${count} ForceDecks records.`);

    if (count > 0) {
        const { error } = await supabase
            .from('measurements')
            .delete()
            .eq('test_type', 'ForceDecks');

        if (error) console.error("Deletion Failed:", error);
        else console.log("✅ Successfully deleted all ForceDecks measurements.");
    } else {
        console.log("No records to delete.");
    }
}

resetForceDecks();
