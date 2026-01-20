
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select(`
                *,
                player_aliases (
                    source,
                    alias_name
                )
            `)
            .order('name');

        if (profileError) throw profileError;

        // Fetch latest measurement dates
        // Note: For optimal performance with large datasets, this should be a DB view or RPC.
        // For current scale, fetching id/date columns is acceptable.
        const { data: measurements, error: measurementError } = await supabaseAdmin
            .from('measurements')
            .select('player_id, recorded_at, test_type')
            .order('recorded_at', { ascending: false })
            .limit(100000); // Fetch practically all records to ensure no data loss

        if (measurementError) {
            console.error('Error fetching measurements:', measurementError);
            // Proceed with profiles only if measurements fail, but log it.
            return NextResponse.json(profiles);
        }

        // Map player_id -> latest date & test types
        const latestDates: Record<string, string> = {};
        const playerTestTypes: Record<string, Set<string>> = {};

        measurements?.forEach((m: any) => {
            if (m.player_id) {
                // Latest Date
                if (m.recorded_at) {
                    if (!latestDates[m.player_id] || new Date(m.recorded_at) > new Date(latestDates[m.player_id])) {
                        latestDates[m.player_id] = m.recorded_at;
                    }
                }
                // Test Types
                if (m.test_type) {
                    if (!playerTestTypes[m.player_id]) playerTestTypes[m.player_id] = new Set();
                    playerTestTypes[m.player_id].add(m.test_type);
                }
            }
        });

        // Merge
        const enrichedProfiles = profiles.map(p => ({
            ...p,
            last_test_date: latestDates[p.id] || null,
            test_types: playerTestTypes[p.id] ? Array.from(playerTestTypes[p.id]) : []
        }));

        return NextResponse.json(enrichedProfiles);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // Strip joined fields (player_aliases) and system fields (created_at) that shouldn't be updated directly or cause errors
        const { id, player_aliases, created_at, last_test_date, ...updateData } = body;

        if (id) {
            // Update
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .update(updateData)
                .eq('id', id)
                .select();
            if (error) throw error;
            return NextResponse.json(data[0]);
        } else {
            // Create
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .insert([{ ...updateData, team_id: '37b06214-a6b5-4814-aee5-d3c42a2347cd' }])
                .select();
            if (error) throw error;
            return NextResponse.json(data[0]);
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
