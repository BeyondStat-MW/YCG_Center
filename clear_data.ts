
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearData() {
    console.log('🗑️ Clearing measurements...');
    // Assuming 'id' is bigint, we delete all robustly
    const { error: measError } = await supabase
        .from('measurements')
        .delete()
        .gt('id', 0);

    if (measError) {
        console.error('Error clearing measurements:', measError);
        return; // Stop if failed, to preserve referential integrity checks
    }
    else console.log('✅ Measurements cleared.');

    console.log('🗑️ Clearing profiles...');
    const { error: profError } = await supabase
        .from('profiles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all Profiles

    if (profError) console.error('Error clearing profiles:', profError);
    else console.log('✅ Profiles cleared.');
}

clearData();
