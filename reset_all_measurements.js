const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetAll() {
    console.log("⚠️ Deleting ALL measurements for clean re-sync...");

    // Safety check
    const { count } = await supabase.from('measurements').select('*', { count: 'exact', head: true });
    console.log(`Found ${count} total records.`);

    if (count > 0) {
        // We delete everything
        const { error } = await supabase
            .from('measurements')
            .delete()
            .gt('id', 0); // Delete all (ID > 0)

        if (error) console.error("Deletion Failed:", error);
        else console.log("✅ Successfully deleted all measurements.");
    } else {
        console.log("No records to delete.");
    }
}

resetAll();
