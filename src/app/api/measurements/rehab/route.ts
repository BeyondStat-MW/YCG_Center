import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    try {
        const { playerId, date, rehabData } = await request.json();

        const { data, error } = await supabaseAdmin
            .from('measurements')
            .insert([{
                player_id: playerId,
                team_id: '37b06214-a6b5-4814-aee5-d3c42a2347cd', // YU-PC default
                test_type: 'rehab',
                recorded_at: new Date(date).toISOString(),
                metrics: rehabData
            }])
            .select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
