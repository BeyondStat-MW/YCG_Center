
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const IGNORE_KEYS = ['id', 'test', 'date', 'profile', 'valid', 'notes', 'device', 'version', 'pct', 'count', 'idx', 'impulse', 'repetition', 'weight', 'duration', 'mass', 'bmi', 'timestamp', 'tenant', 'recording', 'parameter', 'attribute', 'uuid'];

export async function GET(request: Request) {
    try {
        // 1. Fetch Profiles to map ID -> Level
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, level');

        if (profileError) throw profileError;

        const levelMap = new Map<string, string>();
        profiles.forEach(p => {
            if (p.level) levelMap.set(p.id, p.level);
        });

        // 2. Fetch All Measurements (with pagination to bypass 1000 limit)
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
        }

        // 3. Aggregate Data - now with values array for std calculation
        // Structure: { [testType]: { [metricKey]: { [level]: { values: number[] } } } }
        const aggregations: Record<string, Record<string, Record<string, { values: number[] }>>> = {};

        measurements.forEach(m => {
            const level = levelMap.get(m.player_id) || 'Unknown';
            let testType = m.test_type; // Use raw test_type for grouping
            if (!testType) return;

            // Normalize metrics from different structures (flat or nested)
            // @ts-ignore
            let flatMetrics = { ...m.metrics, ...(m.metrics?.results || {}), ...(m.metrics?.resultFields || {}) };

            // Special handling for Manual data: { metric_name, value } structure
            if (testType === 'Manual') {
                if (flatMetrics.metric_name && flatMetrics.value !== undefined) {
                    const metricName = String(flatMetrics.metric_name);
                    const val = Number(flatMetrics.value);
                    if (!isNaN(val)) {
                        // Create a synthetic metric entry with metric_name as key
                        flatMetrics = { [metricName]: val };
                    } else {
                        return; // Skip if value is not a number
                    }
                } else {
                    return; // Skip Manual entries without proper structure
                }
            }

            // For ForceDecks, get the sub-test name (SJ, CMJ, HJ, etc.)
            let subTestName = '';
            if (testType === 'ForceDecks') {
                const testName = flatMetrics.testTypeName || flatMetrics.test_name || flatMetrics.testType || '';
                if (testName.includes('SJ') || testName.includes('Squat Jump')) {
                    subTestName = 'SJ';
                } else if (testName.includes('CMJ') || testName.includes('Countermovement')) {
                    subTestName = 'CMJ';
                } else if (testName.includes('HJ') || testName.includes('Hop')) {
                    subTestName = 'HJ';
                } else if (testName.includes('Drop') || testName.includes('DJ')) {
                    subTestName = 'DJ';
                }
            }

            // Use combined key for ForceDecks with sub-test
            const groupKey = subTestName ? `${testType}_${subTestName}` : testType;

            Object.keys(flatMetrics).forEach(key => {
                const val = flatMetrics[key];
                if (typeof val !== 'number') return;

                // Simple filter for relevant metrics (skip IDs, timestamps, etc.)
                if (IGNORE_KEYS.some(ig => key.toLowerCase().includes(ig))) return;

                // Helper to add value to level
                const addToLevel = (group: string, lvl: string) => {
                    if (!aggregations[group]) aggregations[group] = {};
                    if (!aggregations[group][key]) aggregations[group][key] = {};
                    if (!aggregations[group][key][lvl]) aggregations[group][key][lvl] = { values: [] };
                    aggregations[group][key][lvl].values.push(val);
                };

                // Add to specific group (ForceDecks_SJ, ForceDecks_CMJ, etc.)
                addToLevel(groupKey, level);
                addToLevel(groupKey, 'ALL');

                // Also add to general device group for backward compatibility
                if (groupKey !== testType) {
                    addToLevel(testType, level);
                    addToLevel(testType, 'ALL');
                }
            });
        });

        // 4. Calculate Statistics (mean, std, min, max)
        const stats: Record<string, Record<string, Record<string, { mean: number, std: number, min: number, max: number, count: number }>>> = {};

        Object.keys(aggregations).forEach(testType => {
            stats[testType] = {};
            Object.keys(aggregations[testType]).forEach(metric => {
                stats[testType][metric] = {};
                Object.keys(aggregations[testType][metric]).forEach(lvl => {
                    const { values } = aggregations[testType][metric][lvl];
                    const count = values.length;
                    if (count === 0) {
                        stats[testType][metric][lvl] = { mean: 0, std: 0, min: 0, max: 0, count: 0 };
                        return;
                    }

                    const mean = values.reduce((a, b) => a + b, 0) / count;
                    const min = Math.min(...values);
                    const max = Math.max(...values);

                    // Calculate standard deviation
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

        return NextResponse.json(stats);
    } catch (e: any) {
        console.error("Aggregation Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
