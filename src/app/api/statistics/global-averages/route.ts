
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const IGNORE_KEYS = ['id', 'test', 'date', 'profile', 'valid', 'notes', 'device', 'version', 'pct', 'count', 'idx', 'impulse', 'repetition', 'weight', 'duration', 'mass', 'bmi', 'timestamp', 'tenant', 'recording', 'parameter', 'attribute', 'uuid'];

export async function GET(request: Request) {
    // 캐싱 헤더 설정 (1시간 동안 유효, 백그라운드에서 갱신)
    const headers = new Headers();
    headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

    try {
        // 1. Fetch Profiles to map ID -> Level (최소한의 컬럼만 조회)
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, level');

        if (profileError) throw profileError;

        const levelMap = new Map<string, string>();
        profiles.forEach(p => {
            if (p.level) levelMap.set(p.id, p.level);
        });

        // 2. Fetch All Measurements (컬럼 필터링 및 페이지네이션 최적화)
        let measurements: any[] = [];
        let page = 0;
        const PAGE_SIZE = 1000;

        while (true) {
            const { data, error } = await supabaseAdmin
                .from('measurements')
                .select('player_id, test_type, metrics')
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (error) throw error;
            if (!data || data.length === 0) break;

            measurements.push(...data);
            if (data.length < PAGE_SIZE) break;
            page++;

            // 안전장치: 너무 많은 데이터가 쌓일 경우 중단 (성능 보호)
            if (page > 50) break;
        }

        // 3. Aggregate Data
        const aggregations: Record<string, Record<string, Record<string, { values: number[] }>>> = {};

        measurements.forEach(m => {
            const level = levelMap.get(m.player_id) || 'Unknown';
            let testType = m.test_type;
            if (!testType) return;

            let flatMetrics = { ...m.metrics, ...(m.metrics?.results || {}), ...(m.metrics?.resultFields || {}) };

            if (testType === 'Manual') {
                if (flatMetrics.metric_name && flatMetrics.value !== undefined) {
                    const metricName = String(flatMetrics.metric_name);
                    const val = Number(flatMetrics.value);
                    if (!isNaN(val)) flatMetrics = { [metricName]: val };
                    else return;
                } else return;
            }

            let subTestName = '';
            if (testType === 'ForceDecks') {
                const testName = flatMetrics.testTypeName || flatMetrics.test_name || flatMetrics.testType || '';
                if (testName.includes('SJ') || testName.includes('Squat Jump')) subTestName = 'SJ';
                else if (testName.includes('CMJ') || testName.includes('Countermovement')) subTestName = 'CMJ';
                else if (testName.includes('HJ') || testName.includes('Hop')) subTestName = 'HJ';
                else if (testName.includes('Drop') || testName.includes('DJ')) subTestName = 'DJ';
            }

            const groupKey = subTestName ? `${testType}_${subTestName}` : testType;

            Object.keys(flatMetrics).forEach(key => {
                const val = flatMetrics[key];
                if (typeof val !== 'number') return;
                if (IGNORE_KEYS.some(ig => key.toLowerCase().includes(ig))) return;

                const addToLevel = (group: string, lvl: string) => {
                    if (!aggregations[group]) aggregations[group] = {};
                    if (!aggregations[group][key]) aggregations[group][key] = {};
                    if (!aggregations[group][key][lvl]) aggregations[group][key][lvl] = { values: [] };
                    aggregations[group][key][lvl].values.push(val);
                };

                addToLevel(groupKey, level);
                addToLevel(groupKey, 'ALL');
                if (groupKey !== testType) {
                    addToLevel(testType, level);
                    addToLevel(testType, 'ALL');
                }
            });
        });

        // 4. Calculate Statistics
        const stats: Record<string, Record<string, Record<string, { mean: number, std: number, min: number, max: number, count: number }>>> = {};

        Object.keys(aggregations).forEach(testType => {
            stats[testType] = {};
            Object.keys(aggregations[testType]).forEach(metric => {
                stats[testType][metric] = {};
                Object.keys(aggregations[testType][metric]).forEach(lvl => {
                    const { values } = aggregations[testType][metric][lvl];
                    const count = values.length;
                    if (count === 0) return;

                    const mean = values.reduce((a, b) => a + b, 0) / count;
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
                    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count;
                    const std = Math.sqrt(variance);

                    stats[testType][metric][lvl] = {
                        mean: parseFloat(mean.toFixed(2)),
                        std: parseFloat(std.toFixed(2)),
                        min: parseFloat(min.toFixed(2)),
                        max: parseFloat(max.toFixed(2)),
                        count
                    };
                });
            });
        });

        return NextResponse.json(stats, { headers });
    } catch (e: any) {
        console.error("Aggregation Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
