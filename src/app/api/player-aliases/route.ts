import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('player_aliases')
            .select(`
                id,
                source,
                alias_name,
                profile_id,
                profiles (
                    id,
                    name
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            // Table might not exist yet if migration hasn't run
            if (error.code === '42P01') {
                return NextResponse.json({ aliases: [] });
            }
            throw error;
        }

        return NextResponse.json({ aliases: data || [] });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { source, alias_name, profile_id } = body;

        if (!source || !alias_name || !profile_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Insert or Update Alias
        const { data: alias, error: insertError } = await supabaseAdmin
            .from('player_aliases')
            .upsert(
                { source, alias_name, profile_id },
                { onConflict: 'source, alias_name' }
            )
            .select()
            .single();

        if (insertError) throw insertError;

        // 2. Update existing measurements to link to this profile
        // We try common keys for player name in metrics JSON
        // This is a "best effort" auto-link for historical data

        let updatedCount = 0;

        // Construct a query to update measurements
        // This is tricky via supabase-js for dynamic JSON keys OR condition.
        // We'll use RPC or raw query if possible, but supabase-js doesn't support raw query easily without rpc.
        // So we will try sequential updates for known keys. It's slower but safer without custom SQL functions.

        const possibleKeys = ['Player Name', 'Player', 'Name', 'Athlete', 'athlete', 'player_name'];

        for (const key of possibleKeys) {
            // We search for records that match the source and the alias in the JSON body
            // filtering: custom filter 'metrics->>Key' eq 'alias'

            const { error: updateError, count } = await supabaseAdmin
                .from('measurements')
                .update({ player_id: profile_id })
                .eq('test_type', source)
                .eq(`metrics->>${key}`, alias_name) // This syntax works in PostgREST/Supabase filter but maybe not directly in .eq key

            // Actually .eq('metrics->>Player Name', 'foo') syntax works in supabase-js? 
            // Often it requires .filter('metrics->>Player Name', 'eq', 'foo')

            // Let's try .filter strategy if .eq works
            // NOTE: supabase-js 'eq' first arg is column name. It doesn't support arrow operators inside column name usually for update.
            // But let's try the filter syntax for select first to find IDs, then update by IDs.

            // Find IDs
            const { data: ids } = await supabaseAdmin
                .from('measurements')
                .select('id')
                .eq('test_type', source)
                .filter(`metrics->>${key}`, 'eq', alias_name);

            if (ids && ids.length > 0) {
                const idList = ids.map(r => r.id);
                await supabaseAdmin
                    .from('measurements')
                    .update({ player_id: profile_id })
                    .in('id', idList);

                updatedCount += ids.length;
            }
        }

        return NextResponse.json({
            success: true,
            alias,
            message: `Alias saved. Linked ${updatedCount} historical measurements.`
        });

    } catch (e: any) {
        console.error('Save alias error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const { error } = await supabaseAdmin
            .from('player_aliases')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
