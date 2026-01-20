
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Use Service Role to bypass RLS for admin export
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch enabled metrics
    const { data, error } = await supabase
        .from('metric_configs')
        .select('device, test_category, display_name, metric_key, unit')
        .eq('visible', true)
        .order('device', { ascending: true })
        .order('test_category', { ascending: true })
        .order('display_name', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
        return NextResponse.json({ error: "No enabled metrics found." }, { status: 404 });
    }

    // 2. Convert to CSV manually to avoid dependencies
    const headers = ['Device', 'Test Category', 'Display Name', 'Metric Key', 'Unit'];
    const csvRows = [headers.join(',')];

    for (const row of data) {
        const values = [
            row.device,
            row.test_category,
            row.display_name,
            row.metric_key,
            row.unit
        ].map(val => {
            const s = String(val || '').replace(/"/g, '""'); // Escape double quotes
            return `"${s}"`; // Wrap in quotes
        });
        csvRows.push(values.join(','));
    }

    // Add Byte Order Mark for Excel
    const csvString = '\uFEFF' + csvRows.join('\n');

    // 3. Return response
    return new NextResponse(csvString, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="beyondstat_enabled_metrics.csv"'
        }
    });
}
