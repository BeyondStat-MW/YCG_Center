
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    // Create Admin Client (Service Role)
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Disable caching for this route
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    // 1. Stats (Total counts)
    const { count: pOption } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true });
    const { count: mOption } = await supabaseAdmin.from('measurements')
        .select('*', { count: 'exact', head: true });

    // 2. Fetch All Measurements with Pagination
    // Supabase bas API row limit (default 1000). We must loop to get all data.

    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;

    // Base Query Builder
    // NOTE: We cannot reuse the same query builder object in a loop easily because calling .range() modifies it.
    // We should build the query inside the loop or clone it? 
    // Easier strategy: Just valid fetch loop logic.

    const playerId = searchParams.get('player_id');

    // Set baseline to Korea Standard Time (UTC+9)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);

    let filterDate: string | null = null;

    if (period === '30d') {
        const d = new Date(kstNow.getTime());
        d.setUTCDate(d.getUTCDate() - 30);
        d.setUTCHours(0, 0, 0, 0); // Start of the day in KST
        // Convert back to UTC for DB query
        filterDate = new Date(d.getTime() - kstOffset).toISOString();
    } else if (period === 'season') {
        const d = new Date(kstNow.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
        // Convert back to UTC for DB query
        filterDate = new Date(d.getTime() - kstOffset).toISOString();
    } else if (period === 'all') {
        filterDate = null;
    }

    try {
        while (true) {
            let query = supabaseAdmin
                .from('measurements')
                .select('*, profiles(*)')
                .order('recorded_at', { ascending: false });

            if (filterDate) {
                query = query.gte('recorded_at', filterDate);
            }
            if (playerId) {
                query = query.eq('player_id', playerId);
            }

            // Pagination Range
            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data, error } = await query.range(from, to);

            if (error) throw error;
            if (!data || data.length === 0) break;

            allData = allData.concat(data);

            if (data.length < pageSize) break; // End of data
            page++;

            // Safety break just in case of infinite loop
            if (page > 100) break; // Max 100k records
        }

        return NextResponse.json({
            stats: {
                totalPlayers: pOption || 0,
                totalTests: mOption || 0,
                avgCMJ: 45.2, // Placeholder
                utilization: 84
            },
            measurements: allData
        }, { headers });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
