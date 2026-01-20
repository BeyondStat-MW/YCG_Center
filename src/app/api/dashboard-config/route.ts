
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('player_id');

    if (!playerId) {
        return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('player_dashboard_configs')
            .select('*')
            .eq('player_id', playerId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
            throw error;
        }

        return NextResponse.json(data || null);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { player_id, config } = body;

        if (!player_id || !config) {
            return NextResponse.json({ error: 'Player ID and config are required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('player_dashboard_configs')
            .upsert({
                player_id,
                config,
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) throw error;

        return NextResponse.json(data[0]);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
