
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
    console.log('--- Teams ---');
    const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, slug');

    if (teamsError) {
        console.error('Teams Error:', teamsError);
        return;
    }

    for (const team of teams) {
        const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);

        if (error) console.error(`Error counting for ${team.slug}:`, error);
        else console.log(`${team.name} (${team.slug}): ${count} profiles`);
    }

    console.log('\n--- Global (Null Team) ---');
    const { count: nullTeamCount, error: nullError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('team_id', null);

    if (nullError) console.error('Error counting null team:', nullError);
    else console.log(`Profiles with NULL team_id: ${nullTeamCount}`);

    console.log('\n--- Total Profiles ---');
    const { count: total, error: totalError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
    console.log(`Total Profiles: ${total}`);
}

checkCounts();
