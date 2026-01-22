"use server";

import { createAdminClient } from "@/lib/supabase-admin";

// Imports...

export type LeaderboardEntry = {
    player_id: string;
    name: string;
    level?: string;
    date: string;
    metrics: Record<string, string | number | null>;
};

export type DeviceData = {
    device: string;
    players: LeaderboardEntry[];
};

export async function getDeviceLeaderboards(team_id: string): Promise<DeviceData[]> {
    // Bypass RLS for data fetching in this server action
    const supabase = createAdminClient();

    // 1. ForceDecks (CMJ)
    const { data: cmjData } = await supabase
        .from('measurements')
        .select(`
            player_id,
            recorded_at,
            metrics,
            profiles!inner(name, level)
        `)
        .eq('team_id', team_id)
        .eq('test_type', 'CMJ')
        .order('recorded_at', { ascending: false });

    const uniqueCmj = processLatest(cmjData || [], ['CMJ_Height']);

    // 2. NordBord
    const { data: nbData } = await supabase
        .from('measurements')
        .select(`
            player_id, recorded_at, metrics, profiles!inner(name, level)
        `)
        .eq('team_id', team_id)
        .eq('test_type', 'NordBord')
        .order('recorded_at', { ascending: false });

    const uniqueNb = processLatest(nbData || [], ['Nordbord_MaxForce']);

    // 3. ForceFrame
    const { data: ffData } = await supabase
        .from('measurements')
        .select(`
            player_id, recorded_at, metrics, profiles!inner(name, level)
        `)
        .eq('team_id', team_id)
        .eq('test_type', 'ForceFrame')
        .order('recorded_at', { ascending: false });

    const uniqueFf = processLatest(ffData || [], ['Adductor_MaxForce']);

    // 4. SmartSpeed
    const { data: ssData } = await supabase
        .from('measurements')
        .select(`
            player_id, recorded_at, metrics, profiles!inner(name, level)
        `)
        .eq('team_id', team_id)
        .eq('test_type', 'SmartSpeed')
        .order('recorded_at', { ascending: false });

    const uniqueSs = processLatest(ssData || [], ['Sprint_10m']);

    // 5. Dynamo
    const { data: dynamoData } = await supabase
        .from('measurements')
        .select(`
            player_id, recorded_at, metrics, profiles!inner(name, level)
        `)
        .eq('team_id', team_id)
        .eq('test_type', 'Dynamo')
        .order('recorded_at', { ascending: false });

    const uniqueDynamo = processLatest(dynamoData || [], ['Grip_Force']);

    return [
        { device: "ForceDecks", players: uniqueCmj },
        { device: "NordBord", players: uniqueNb },
        { device: "ForceFrame", players: uniqueFf },
        { device: "SmartSpeed", players: uniqueSs },
        { device: "Dynamo", players: uniqueDynamo }
    ];
}

// Helper to deduplicate by player_id and extract metrics
function processLatest(data: any[], keys: string[]): LeaderboardEntry[] {
    if (!data) return [];

    const seen = new Set();
    const result: LeaderboardEntry[] = [];

    for (const row of data) {
        if (seen.has(row.player_id)) continue;
        seen.add(row.player_id);

        const metrics: Record<string, any> = {};
        keys.forEach(k => {
            // Use 'metrics' column instead of 'data'
            // row.metrics is likely the JSON object
            const val = row.metrics?.[k] ?? row.metrics?.[k.toLowerCase()] ?? null;

            // Format numbers nicely
            if (typeof val === 'number') {
                metrics[k] = Number.isInteger(val) ? val : val.toFixed(2);
            } else {
                metrics[k] = val;
            }
        });

        result.push({
            player_id: row.player_id,
            name: row.profiles?.name || "Unknown",
            level: row.profiles?.level || "Unknown",
            date: new Date(row.recorded_at).toLocaleDateString(),
            metrics
        });
    }
    return result;
}
