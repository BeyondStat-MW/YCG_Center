
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
    try {
        // 1. Fetch Key Stats
        // Total Profiles
        const { count: profileCount, error: countError } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        // Recent Measurements (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: recentTestCount, error: testError } = await supabaseAdmin
            .from('measurements')
            .select('*', { count: 'exact', head: true })
            .gte('recorded_at', thirtyDaysAgo.toISOString());

        // 2. Fetch Recent Activity Feed (Limit 10)
        // We need player names, so we might need to join manually or use Supabase resource embedding if set up.
        // Given the schema, let's fetch profiles and recent measurements separately and join.

        const { data: recentMeasurements, error: rmError } = await supabaseAdmin
            .from('measurements')
            .select('*')
            .order('recorded_at', { ascending: false })
            .limit(20);

        // 2.5 Usage by Type & Latest Data Aggregation
        // We fetch a larger batch of just test_type and recorded_at to aggregate distribution
        const { data: usageData, error: usageError } = await supabaseAdmin
            .from('measurements')
            .select('test_type, recorded_at')
            .order('recorded_at', { ascending: false })
            .limit(2000); // Sample size for distribution

        const typeCounts: Record<string, number> = {};
        let latestRec = usageData?.[0]?.recorded_at || null;

        usageData?.forEach(m => {
            const type = m.test_type || 'Unknown';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        const usageByType = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

        // 3. Fetch All Profiles for Table (with latest stats)
        // This is "heavy" for a real app, but fine for <1000 users. 
        // Optimization: In real prod, use a Materialized View.
        const { data: profiles, error: pError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .order('name');

        if (pError || rmError) {
            throw new Error("Failed to fetch data");
        }

        // --- Data Aggregation ---

        // Map Profile ID -> Name
        const profileMap = new Map(profiles?.map(p => [p.id, p]));

        // Enrich Recent Activity
        const activityFeed = recentMeasurements?.map(m => ({
            ...m,
            player_name: profileMap.get(m.player_id)?.name || 'Unknown'
        }));

        // Build Player Status Table (Latest metrics per player)
        // We need latest CMJ / Nordic for each player. 
        // Ideally we'd fetch "Distinct on (player_id, test_type)" from DB, but let's approximate by fetching a larger recent batch 
        // OR just fetching all measurements (might be too big).
        // Let's stick to a simpler approach: Just list profiles for now, 
        // and maybe fetch latest stats in a separate efficient query if possible.
        // FOR NOW: We will return the profiles list and let the frontend show basic info, 
        // or we fetch the last measurement for each player (N+1 problem).
        // BETTER: Fetch last 1000 measurements and aggregate in memory.

        const { data: bulkMeasurements } = await supabaseAdmin
            .from('measurements')
            .select('*')
            .order('recorded_at', { ascending: false })
            .limit(2000); // Reasonable limit for now

        const playerStats = profiles?.map(p => {
            // Find latest CMJ
            const pMeasurements = bulkMeasurements?.filter(m => m.player_id === p.id) || [];
            const cmj = pMeasurements.find(m => m.test_type === 'CMJ');
            const nordic = pMeasurements.find(m => m.test_type === 'Nordbord');

            return {
                id: p.id,
                name: p.name,
                team: p.team_id || '-',
                last_active: pMeasurements[0]?.recorded_at || '-',
                cmj_max: cmj?.metrics?.CMJ_Height || '-',
                nordic_max: nordic?.metrics?.Max_Force_Both_Legs_N || '-'
            };
        });

        return NextResponse.json({
            stats: {
                total_profiles: profileCount || 0,
                recent_tests: recentTestCount || 0,
                usage_by_type: usageByType,
                latest_recorded_at: latestRec
            },
            activity: activityFeed,
            players: playerStats
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
