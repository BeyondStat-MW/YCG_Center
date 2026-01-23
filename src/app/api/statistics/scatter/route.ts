
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const targetLevel = searchParams.get('level'); // Optional filtering

        // 1. Fetch Profiles
        let query = supabaseAdmin.from('profiles').select('id, name, level');
        if (targetLevel) {
            query = query.eq('level', targetLevel);
        }
        const { data: profiles, error: profileError } = await query;
        if (profileError) throw profileError;

        const profilesMap = new Map<string, { name: string, level: string }>();
        profiles.forEach(p => {
            profilesMap.set(p.id, { name: p.name, level: p.level || 'Unknown' });
        });

        // 2. Fetch Measurements
        // We need fields to extract SJ, CMJ, Hip Add, Hip Abd
        // To avoid fetching everything, we can try to filter, but metrics is JSONB.
        // It's safer to fetch relevant test types.
        const { data: measurements, error: measureError } = await supabaseAdmin
            .from('measurements')
            .select('player_id, test_type, metrics, recorded_at')
            .in('test_type', ['ForceDecks', 'ForceFrame', 'NordBord']) // NordBord barely needed but good to have context
            .order('recorded_at', { ascending: true }); // Process in order

        if (measureError) throw measureError;

        // 3. Aggregate per player
        // We want one data point per player: Their "representative" Stats.
        // Usually MAX is good for athletes.
        const playerStats = new Map<string, {
            id: string;
            name: string;
            level: string;
            max_sj: number;
            max_cmj: number;
            max_add: number;
            max_abd: number;
        }>();

        // Initialize players
        profilesMap.forEach((v, k) => {
            playerStats.set(k, {
                id: k,
                name: v.name,
                level: v.level,
                max_sj: 0,
                max_cmj: 0,
                max_add: 0,
                max_abd: 0
            });
        });

        const extractValue = (m: any, keys: string[]) => {
            // ... (Same logic as page.tsx essentially)
            let met = m.metrics;
            // if string parse
            if (typeof met === 'string') { try { met = JSON.parse(met); } catch { return 0; } }
            // search keys
            const candidates = [met, met?.results, met?.resultFields];
            for (const c of candidates) {
                if (!c) continue;
                for (const k of keys) {
                    if (typeof c[k] === 'number' && c[k] > 0) return c[k];
                }
            }
            return 0;
        };

        const keys_JumpHeight = ['Jump Height (Imp-Mom)', 'Jump Height (Imp-Mom) [cm]', 'JumpHeight(Imp-Mom)', 'Jump Height', 'jumpHeight'];
        const keys_AddL = ['Inner Left Max Force (N)', 'Inner Left Max Force', 'innerLeftMaxForce', 'Left Max Force (N)', 'leftMaxForce'];
        const keys_AddR = ['Inner Right Max Force (N)', 'Inner Right Max Force', 'innerRightMaxForce', 'Right Max Force (N)', 'rightMaxForce'];
        const keys_AbdL = ['Outer Left Max Force (N)', 'Outer Left Max Force', 'outerLeftMaxForce', 'Abduction Left Max Force (N)', 'abdLeftMaxForce', 'Left Max Force (N)', 'leftMaxForce'];
        const keys_AbdR = ['Outer Right Max Force (N)', 'Outer Right Max Force', 'outerRightMaxForce', 'Abduction Right Max Force (N)', 'abdRightMaxForce', 'Right Max Force (N)', 'rightMaxForce'];

        const checkTestName = (m: any, target: string) => {
            const type = m.test_type || '';
            let met = m.metrics;
            if (typeof met === 'string') { try { met = JSON.parse(met); } catch { } }
            const sub = met?.testTypeName || met?.test_name || met?.testType || '';
            const combined = (type + ' ' + sub).toLowerCase();
            return combined.includes(target.toLowerCase());
        };

        measurements.forEach(m => {
            const pStats = playerStats.get(m.player_id);
            if (!pStats) return; // Player filtered out by level maybe? Or profile missing

            // 1. Jump
            if (m.test_type === 'ForceDecks') {
                const val = extractValue(m, keys_JumpHeight);
                if (val > 0) {
                    if (checkTestName(m, 'SJ') || checkTestName(m, 'Squat Jump')) {
                        if (val > pStats.max_sj) pStats.max_sj = val;
                    } else if (checkTestName(m, 'CMJ') || checkTestName(m, 'Countermovement')) {
                        if (val > pStats.max_cmj) pStats.max_cmj = val;
                    }
                }
            }

            // 2. Hip (ForceFrame)
            if (m.test_type === 'ForceFrame') {
                const isAdd = checkTestName(m, 'Adduction') || checkTestName(m, 'Hip AD');
                const isAbd = checkTestName(m, 'Abduction') || checkTestName(m, 'Hip AB') || checkTestName(m, 'Abductor');

                // If generic 'Hip' or neither explicit, try to infer from keys existence? 
                // ForceFrame usually has explicit test types or distinct metric keys (inner vs outer).
                // Let's rely on keys if test name is ambiguous, but usually keys are distinct.

                // Calculate Add Average
                const addL = extractValue(m, keys_AddL);
                const addR = extractValue(m, keys_AddR);
                if (addL > 0 && addR > 0) {
                    // Check if this test is actually Adduction just to be safe, or if keys are unique enough (Inner vs Outer)
                    const avg = (addL + addR) / 2;
                    if (avg > pStats.max_add) pStats.max_add = avg;
                }

                const abdL = extractValue(m, keys_AbdL);
                const abdR = extractValue(m, keys_AbdR);
                if (abdL > 0 && abdR > 0) {
                    const avg = (abdL + abdR) / 2;
                    if (avg > pStats.max_abd) pStats.max_abd = avg;
                }
            }
        });

        // Convert map to array and filter out empty data
        const data = Array.from(playerStats.values()).filter(p =>
            (p.max_sj > 0 && p.max_cmj > 0) || (p.max_add > 0 && p.max_abd > 0)
        );

        return NextResponse.json(data);

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
