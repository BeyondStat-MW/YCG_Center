
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        // 1. Get all linked vald_ids
        const { data: linkedProfiles } = await supabaseAdmin.from('profiles').select('vald_id');
        const linkedIds = new Set(linkedProfiles?.map(p => p.vald_id).filter(Boolean));

        // 2. Get recent measurements to identify unlinked profiles
        const { data: rawMeasurements } = await supabaseAdmin
            .from('measurements')
            .select('test_type, recorded_at, metrics')
            .order('recorded_at', { ascending: false })
            .limit(1000);

        const unlinkedMap = new Map();
        rawMeasurements?.forEach(m => {
            const vid = m.metrics?.profileId || m.metrics?.athleteId;
            const vname = m.metrics?.profileName || m.metrics?.athleteName || 'Unknown';
            const device = m.test_type;

            if (vid && !linkedIds.has(vid)) {
                if (!unlinkedMap.has(vid)) {
                    // Extract summary from the latest test
                    let summary = '';
                    const meta = m.metrics || {};
                    const testName = meta.testTypeName || meta.testType || meta.testPositionName || 'Test';

                    if (device === 'NordBord') {
                        const l = meta.maxForceLeft || meta.maxForceL_N_ || 0;
                        const r = meta.maxForceRight || meta.maxForceR_N_ || 0;
                        const avg = (l + r) / 2;
                        summary = `${testName}: ${Math.round(avg)}N (평균)`;
                    } else if (device === 'ForceDecks') {
                        const jh = meta.jumpHeightCalculation || meta.jumpHeight_cm_ || 0;
                        if (jh > 0) {
                            summary = `${testName}: ${jh.toFixed(1)}cm`;
                        } else {
                            const pp = meta.concentricPeakPower || meta.peakPower_W_ || 0;
                            summary = `${testName}: ${Math.round(pp)}W`;
                        }
                    } else if (device === 'ForceFrame') {
                        const f = meta.maxForce || meta.peakForce_N_ || 0;
                        const l = meta.innerLeftMaxForce || 0;
                        const r = meta.innerRightMaxForce || 0;
                        const val = f > 0 ? f : (l + r) / 2;
                        summary = `${testName}: ${Math.round(val)}N`;
                    } else if (device === 'SmartSpeed') {
                        const t = meta.time || meta.time_s_ || 0;
                        summary = `${testName}: ${t.toFixed(3)}s`;
                    } else if (device === 'DynaMo') {
                        const f = meta.maximumForce || meta.maxForce_N_ || 0;
                        summary = `${testName}: ${Math.round(f)}N`;
                    } else {
                        summary = `${testName}: 측정 완료`;
                    }

                    unlinkedMap.set(vid, {
                        vald_id: vid,
                        vald_name: vname,
                        devices: new Set([device]),
                        test_count: 1,
                        latest_test: m.recorded_at,
                        summary_metrics: summary
                    });
                } else {
                    const existing = unlinkedMap.get(vid);
                    existing.devices.add(device);
                    existing.test_count += 1;
                }
            }
        });

        const unlinked = Array.from(unlinkedMap.values()).map(item => ({
            ...item,
            devices: Array.from(item.devices)
        }));

        return NextResponse.json({ unlinked });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { valdId, playerId } = await request.json();
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ vald_id: valdId })
            .eq('id', playerId)
            .select();

        if (error) throw error;

        // Optional: Trigger a background sync job for this specific player
        // For now, just return success

        // CRITICAL FIX: Also update the measurements table to link historical data immediately
        await supabaseAdmin
            .from('measurements')
            .update({ player_id: playerId })
            .filter('metrics->>profileId', 'eq', valdId);

        return NextResponse.json({ success: true, player: data[0] });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
