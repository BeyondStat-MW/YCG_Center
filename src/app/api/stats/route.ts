import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const player_id = searchParams.get('player_id');
    const team_id = searchParams.get('team_id');

    // [CRITICAL SECURITY CHECK]
    // Middleware bypasses /api routes, so we MUST verify authentication here.
    const authToken = request.cookies.get('ycg_auth_token');
    if (!authToken || authToken.value !== 'authenticated') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create Admin Client (Service Role)
    // Only reachable if authenticated
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    try {
        if (type === 'team_daily') {
            console.log("Fetching Team Daily Stats...");
            // Fetch from Materialized View: mv_team_daily_stats
            let query = supabaseAdmin
                .from('mv_team_daily_stats')
                .select('*')
                .order('stat_date', { ascending: false });

            if (team_id) query = query.eq('team_id', team_id);

            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 3000));
            const { data, error } = await Promise.race([query, timeoutPromise]) as any;

            if (error) throw error;
            return NextResponse.json({ data }, { headers });
        }
        else if (type === 'player_season') {
            // Fetch from Materialized View: mv_player_season_stats
            let query = supabaseAdmin
                .from('mv_player_season_stats')
                .select('*');

            if (player_id) query = query.eq('player_id', player_id);
            if (team_id) query = query.eq('team_id', team_id);

            // Add 3s Timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Database Request Timeout')), 3000)
            );

            const { data, error } = await Promise.race([
                query,
                timeoutPromise
            ]) as any;

            if (error) throw error;
            return NextResponse.json({ data }, { headers });
        }
        else {
            return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
        }

    } catch (e: any) {
        // Fallback for when views don't exist yet (graceful degradation)
        console.error("Stats API Error:", e.message);
        return NextResponse.json({ error: e.message, fallback: true }, { status: 500 });
    }
}
