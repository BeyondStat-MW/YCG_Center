
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,
                matrix[j - 1][i] + 1,
                matrix[j - 1][i - 1] + indicator
            );
        }
    }
    return matrix[b.length][a.length];
}

// Normalize name for comparison
function normalizeName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z가-힣0-9]/g, '');
}

// Calculate similarity score (0-100)
function calculateSimilarity(name1: string, name2: string): number {
    const n1 = normalizeName(name1);
    const n2 = normalizeName(name2);

    // Exact match after normalization
    if (n1 === n2) return 100;

    // Check if one contains the other (partial match)
    if (n1.includes(n2) || n2.includes(n1)) {
        return 90;
    }

    // Levenshtein distance based similarity
    const maxLen = Math.max(n1.length, n2.length);
    if (maxLen === 0) return 0;

    const distance = levenshteinDistance(n1, n2);
    const similarity = ((maxLen - distance) / maxLen) * 100;

    return Math.round(similarity);
}

export async function GET() {
    try {
        // 1. Get all linked vald_ids
        const { data: profiles } = await supabaseAdmin.from('profiles').select('id, name, vald_id');
        const linkedIds = new Set(profiles?.filter(p => p.vald_id).map(p => p.vald_id));
        const unlinkedProfiles = profiles?.filter(p => !p.vald_id) || [];

        // 2. Get unique unlinked VALD profiles from measurements
        const { data: rawMeasurements } = await supabaseAdmin
            .from('measurements')
            .select('metrics')
            .order('recorded_at', { ascending: false })
            .limit(2000);

        const valdProfilesMap = new Map();
        rawMeasurements?.forEach(m => {
            const vid = m.metrics?.profileId || m.metrics?.athleteId;
            const vname = m.metrics?.profileName || m.metrics?.athleteName;

            if (vid && vname && !linkedIds.has(vid) && !valdProfilesMap.has(vid)) {
                valdProfilesMap.set(vid, {
                    vald_id: vid,
                    vald_name: vname
                });
            }
        });

        const valdProfiles = Array.from(valdProfilesMap.values());

        // 3. Compute potential matches
        const matches: any[] = [];

        for (const vald of valdProfiles) {
            let bestMatch: any = null;
            let bestScore = 0;

            for (const profile of unlinkedProfiles) {
                const score = calculateSimilarity(vald.vald_name, profile.name);

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = {
                        vald_id: vald.vald_id,
                        vald_name: vald.vald_name,
                        player_id: profile.id,
                        player_name: profile.name,
                        similarity: score,
                        auto_match: score >= 80 // Auto-match threshold
                    };
                }
            }

            if (bestMatch && bestScore >= 50) {
                matches.push(bestMatch);
            }
        }

        // Sort by similarity descending
        matches.sort((a, b) => b.similarity - a.similarity);

        return NextResponse.json({
            matches,
            stats: {
                unlinked_vald_count: valdProfiles.length,
                unlinked_player_count: unlinkedProfiles.length,
                auto_matchable: matches.filter(m => m.auto_match).length,
                suggested_matches: matches.length
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { matches } = await request.json();
        const results: any[] = [];

        for (const match of matches) {
            const { vald_id, player_id } = match;

            const { data, error } = await supabaseAdmin
                .from('profiles')
                .update({ vald_id })
                .eq('id', player_id)
                .select();

            if (data) {
                // Update measurements for this match
                await supabaseAdmin
                    .from('measurements')
                    .update({ player_id: player_id })
                    .filter('metrics->>profileId', 'eq', vald_id);
            }

            if (error) {
                results.push({ player_id, success: false, error: error.message });
            } else {
                results.push({ player_id, success: true, player: data[0] });
            }
        }

        const successCount = results.filter(r => r.success).length;

        return NextResponse.json({
            success: true,
            matched: successCount,
            failed: results.length - successCount,
            results
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
