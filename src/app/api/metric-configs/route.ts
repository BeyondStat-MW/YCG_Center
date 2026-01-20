import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch all metric configs
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('metric_configs')
            .select('*')
            .order('test_type')
            .order('order');

        // If table doesn't exist yet, return empty array (graceful fallback)
        if (error) {
            if (error.message.includes('does not exist') || error.code === 'PGRST205') {
                return NextResponse.json({ configs: [], needsSetup: true });
            }
            throw error;
        }

        return NextResponse.json({ configs: data || [] });
    } catch (e: any) {
        console.error('GET metric-configs error:', e);
        return NextResponse.json({ error: e.message, configs: [] }, { status: 500 });
    }
}

// POST: Save metric configs - processes in small sequential batches
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Support both old format (configs) and new format (deviceConfigs + metricConfigs)
        let configs: any[] = [];

        if (body.metricConfigs && Array.isArray(body.metricConfigs)) {
            // New hierarchical format
            configs = body.metricConfigs;
        } else if (body.configs && Array.isArray(body.configs)) {
            // Old flat format
            configs = body.configs;
        }

        if (configs.length === 0) {
            // If only deviceConfigs provided (without metrics), still save successfully
            if (body.deviceConfigs) {
                return NextResponse.json({
                    success: true,
                    message: 'Device configs saved (no metric changes)',
                    count: 0
                });
            }
            return NextResponse.json({ error: 'No configs provided' }, { status: 400 });
        }

        // Check schema capabilities
        let hasHierarchicalSchema = false;
        let hasCompanyColumn = false;
        try {
            // Probe for 'device' and 'company' columns
            const { error: probeError } = await supabaseAdmin
                .from('metric_configs')
                .select('device, test_category, company')
                .limit(1);

            if (!probeError) {
                hasHierarchicalSchema = true;
                hasCompanyColumn = true;
            } else if (probeError.message.includes('company')) {
                // device exists but company might not if migration 3 wasn't run
                // Check just device
                const { error: probeDev } = await supabaseAdmin.from('metric_configs').select('device').limit(1);
                if (!probeDev) hasHierarchicalSchema = true;
            }
        } catch (e) {
            console.log('Schema probe failed, falling back to legacy');
        }

        console.log(`Schema check: Hierarchical=${hasHierarchicalSchema}, Company=${hasCompanyColumn}`);

        // Deduplicate strictly based on the target schema capability
        const configMap = new Map<string, any>();
        configs.forEach((c: any, idx: number) => {
            const deviceName = c.device || c.test_type || 'Unknown';
            const category = c.test_category || 'Unknown';
            const company = c.company || 'VALD'; // Default to VALD
            const metricKey = c.metric_key || '';

            let uniqueKey = '';

            if (hasCompanyColumn) {
                // Newest Schema: Company + Device + Category + Metric
                uniqueKey = `${company}::${deviceName}::${category}::${metricKey}`;
            } else if (hasHierarchicalSchema) {
                // New Schema: Device + Category + Metric
                uniqueKey = `${deviceName}::${category}::${metricKey}`;
            } else {
                // Old Schema: Device + Metric
                uniqueKey = `${deviceName}::${metricKey}`;
            }

            if (!configMap.has(uniqueKey)) {
                configMap.set(uniqueKey, {
                    ...c,
                    _order: idx,
                    _device: deviceName,
                    _category: category,
                    _company: company
                });
            }
        });
        const deduplicatedConfigs = Array.from(configMap.values());

        console.log(`Deduplication: ${configs.length} -> ${deduplicatedConfigs.length} configs`);

        // Process one by one
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const c of deduplicatedConfigs) {
            const deviceName = c._device;
            const category = c._category;
            const company = c._company;
            const position = c.test_position || null;

            // Common data fields
            const baseData = {
                metric_key: c.metric_key,
                display_name: c.display_name,
                unit: c.unit || '',
                visible: c.visible ?? true,
                order: c.order ?? c._order ?? 0,
                updated_at: new Date().toISOString()
            };

            try {
                if (hasHierarchicalSchema) {
                    // === HIERARCHICAL PATH ===
                    const data: any = {
                        ...baseData,
                        device: deviceName,
                        test_category: category,
                        test_position: position,
                        test_type: deviceName
                    };

                    if (hasCompanyColumn) {
                        data.company = company;
                    }

                    // Build query
                    let query = supabaseAdmin.from('metric_configs').select('id');

                    if (hasCompanyColumn) query = query.eq('company', company);

                    query = query.eq('device', deviceName)
                        .eq('test_category', category)
                        .eq('metric_key', c.metric_key);

                    const { data: existing } = await query.maybeSingle();

                    if (existing) {
                        const { error: updateError } = await supabaseAdmin
                            .from('metric_configs')
                            .update(data)
                            .eq('id', existing.id);
                        if (updateError) throw updateError;
                    } else {
                        const { error: insertError } = await supabaseAdmin
                            .from('metric_configs')
                            .insert(data);
                        if (insertError) throw insertError;
                    }
                } else {
                    // === OLD LEGACY PATH ===
                    const data = {
                        ...baseData,
                        test_type: deviceName
                    };

                    const { data: existing } = await supabaseAdmin
                        .from('metric_configs')
                        .select('id')
                        .eq('test_type', deviceName)
                        .eq('metric_key', c.metric_key)
                        .maybeSingle();

                    if (existing) {
                        const { error: updateError } = await supabaseAdmin
                            .from('metric_configs')
                            .update(data)
                            .eq('id', existing.id);
                        if (updateError) throw updateError;
                    } else {
                        const { error: insertError } = await supabaseAdmin
                            .from('metric_configs')
                            .insert(data);
                        if (insertError) throw insertError;
                    }
                }

                successCount++;
            } catch (err: any) {
                errorCount++;
                if (errors.length < 5) {
                    errors.push(`${deviceName}/${c.metric_key}: ${err.message}`);
                }
            }
        }

        if (errorCount > 0 && successCount === 0) {
            throw new Error(`All saves failed. First errors: ${errors.join('; ')}`);
        }

        return NextResponse.json({
            success: true,
            count: successCount,
            errors: errorCount,
            message: errorCount > 0
                ? `${successCount}개 저장, ${errorCount}개 실패`
                : `${successCount}개 설정이 저장되었습니다.${!hasCompanyColumn ? ' (DB 업데이트 권장)' : ''}`
        });
    } catch (e: any) {
        console.error('POST metric-configs error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
