import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { TeamStats, DailyStats } from "@/lib/types/database";
import { Card, Text, Metric, Title, Badge, AreaChart, BarList } from "@tremor/react";
import {
    Users,
    Activity,
    Zap,
    Layers,
    Calendar,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import { getDeviceLeaderboards } from "@/app/actions/leaderboard";
import { cn } from "@/lib/utils";
import { DashboardDateRangePicker } from "@/components/DashboardDateRangePicker";

import { getTeamConfig } from "@/lib/config";
import { notFound } from "next/navigation";

export default async function DashboardPage({
    params,
    searchParams,
}: {
    params: Promise<{ team_id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { team_id } = await params;
    const { from, to } = await searchParams;
    const teamConfig = await getTeamConfig(team_id);

    if (!teamConfig) {
        return notFound();
    }

    const team_uuid = teamConfig.id;
    const portalTitle = teamConfig.theme_config?.portal_title || teamConfig.name;
    const adminSupabase = createAdminClient();

    // 1. Fetch Data
    const { count: livePlayerCount } = await adminSupabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team_uuid);

    const { data: teamStats } = await adminSupabase
        .from("mv_team_stats")
        .select("*")
        .eq("team_id", team_uuid)
        .single();

    // mv_daily_stats removed to bypass staleness. 
    // We calculate stats dynamically from measurements.

    // 2. Fetch Filtered Players for Table
    const { data: playerProfiles } = await adminSupabase
        .from('profiles')
        .select(`id, name`)
        .eq('team_id', team_uuid)
        .limit(10);

    // 3. Fetch Raw Measurements for accurate Device Usage
    // Recursive fetch to bypass 1000 row limit safely
    let allMeasurements: any[] = [];
    let fetchError = null;
    let fromIndex = 0;
    const batchSize = 1000;
    const safetyLimit = 30000; // Prevent infinite loops

    try {
        while (true) {
            const { data, error } = await adminSupabase
                .from('measurements')
                .select('test_type, metrics, recorded_at')
                .eq('team_id', team_uuid)
                .order('recorded_at', { ascending: true })
                .range(fromIndex, fromIndex + batchSize - 1);

            if (error) {
                fetchError = error;
                break;
            }
            if (!data || data.length === 0) break;

            allMeasurements = [...allMeasurements, ...data];

            if (data.length < batchSize) break;
            if (allMeasurements.length >= safetyLimit) break;

            fromIndex += batchSize;
        }
    } catch (e) {
        console.error("Fetch Loop Error:", e);
    }

    const measurements = allMeasurements;

    // --- Date Parsing & Filtering ---
    const defaultFrom = new Date('2023-01-01');
    const defaultTo = new Date(); // Today

    const fromDate = from ? new Date(from as string) : defaultFrom;
    const toDate = to ? new Date(to as string) : defaultTo;


    // Inclusive range timestamps
    const filterStart = fromDate.getTime();
    const filterEnd = toDate.getTime() + (24 * 60 * 60 * 1000);

    // Filter Raw Measurements (exclude SLROSB and date range)
    const filteredMeasurements = measurements.filter(m => {
        const d = new Date(m.recorded_at).getTime();
        const inRange = d >= filterStart && d < filterEnd;
        const notSLROSB = m.test_type !== 'SLROSB';
        return inRange && notSLROSB;
    });

    // --- Dynamic Daily Stats Calculation ---
    // Group filtered measurements by date and device for the chart
    const dailyStatsMap: Record<string, Record<string, number>> = {};
    const deviceTypeMappingGeneric: Record<string, string> = {
        'CMJ': 'ForceDecks', 'SJ': 'ForceDecks', 'ABCMJ': 'ForceDecks', 'LSJ': 'ForceDecks', 'HJ': 'ForceDecks',
        'NordBord': 'NordBord', 'ForceFrame': 'ForceFrame', 'SmartSpeed': 'SmartSpeed', 'DynaMo': 'DynaMo'
    };

    filteredMeasurements.forEach(m => {
        const d = new Date(m.recorded_at);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const sortableDate = `${yyyy}-${mm}-${dd}`;

        const device = deviceTypeMappingGeneric[m.test_type] || m.test_type;

        if (!dailyStatsMap[sortableDate]) dailyStatsMap[sortableDate] = {};
        if (!dailyStatsMap[sortableDate][device]) dailyStatsMap[sortableDate][device] = 0;
        dailyStatsMap[sortableDate][device]++;
    });

    const allDates = Object.keys(dailyStatsMap).sort();
    const categories = Array.from(new Set(filteredMeasurements.map(m => deviceTypeMappingGeneric[m.test_type] || m.test_type)));

    const stackedTrendData = allDates.map(date => {
        // date is YYYY-MM-DD
        const [y, m, d] = date.split('-');
        // Use local date construction to avoid timezone shifts
        const dLocal = new Date(Number(y), Number(m) - 1, Number(d));

        const dataPoint: any = { date: dLocal.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
        const dayStats = dailyStatsMap[date];

        categories.forEach(device => {
            const val = dayStats[device] || 0;
            dataPoint[device] = val;
        });
        return dataPoint;
    });

    // KPI: Tests (Period)
    const testsTestsInPeriod = filteredMeasurements.length;

    // KPI: Utilization / Active Players
    // Placeholder 0 until player_id is available
    const activePlayersInPeriod = 0;

    const utilDays = Math.max(1, Math.ceil((filterEnd - filterStart) / (1000 * 60 * 60 * 24)));
    const utilization = livePlayerCount ? Math.round((activePlayersInPeriod / (livePlayerCount * utilDays)) * 100) : 0;
    const displayUtilization = utilization || 0;

    const totalPlayers = livePlayerCount || 0;
    const avgCmj = teamStats?.avg_cmj_height || 45.2;

    // --- Chart Data Processing ---

    // 1. Accurate Tests per Device (from measurements table)
    const deviceTypeMapping: Record<string, string> = {
        'CMJ': 'ForceDecks',
        'SJ': 'ForceDecks',
        'ABCMJ': 'ForceDecks',
        'LSJ': 'ForceDecks',
        'HJ': 'ForceDecks'
    };

    const testsPerDeviceMap = filteredMeasurements.reduce((acc, curr) => {
        const device = deviceTypeMapping[curr.test_type] || curr.test_type;
        acc[device] = (acc[device] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const testsPerDevice = Object.entries(testsPerDeviceMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a: any, b: any) => b.value - a.value);

    // 2. Daily Usage Chart Data (Already Done above: stackedTrendData)

    const colors = ["indigo", "rose", "amber", "emerald", "cyan", "slate"];

    return (
        <div className="flex-1 bg-white overflow-y-auto">
            <div className="max-w-[1600px] mx-auto p-8 space-y-10 animate-in fade-in duration-500">

                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Center Overview</h1>
                        <p className="text-zinc-500 text-sm font-medium">Operational Status & Real-time Data</p>
                    </div>
                    <div>
                        <DashboardDateRangePicker />
                    </div>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard
                        title="Total Players"
                        value={totalPlayers.toLocaleString()}
                        icon={Users}
                        color="blue"
                        trend="0"
                    />
                    <KPICard
                        title="Tests (Period)"
                        value={testsTestsInPeriod.toLocaleString()}
                        icon={Activity}
                        color="purple"
                        trend="-"
                    />
                    <KPICard
                        title="Avg CMJ"
                        value={avgCmj.toFixed(1)}
                        unit="cm"
                        icon={Zap}
                        color="amber"
                        trend="+2.1%"
                        trendPositive={true}
                    />
                    <KPICard
                        title="Utilization"
                        value={displayUtilization.toString()}
                        unit="%"
                        icon={Layers}
                        color="emerald"
                        trend="+5.2%"
                        trendPositive={true}
                    />
                </div>

                {/* Middle Row: Trend & Usage */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <Card className="bg-white shadow-sm rounded-xl ring-1 ring-zinc-100 p-8 min-h-[450px] flex flex-col lg:col-span-8">
                        <div className="flex items-center justify-between mb-8">
                            <Title className="text-lg font-bold text-zinc-900">Total Activity</Title>
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                Trends (Selected Period)
                            </span>
                        </div>
                        <div className="flex-1">
                            <AreaChart
                                className="h-72 mt-4"
                                data={stackedTrendData}
                                index="date"
                                categories={categories}
                                colors={colors as any}
                                showLegend={true}
                                showGridLines={false}
                                curveType="monotone"
                                startEndOnly={true}
                            />
                        </div>
                    </Card>

                    <Card className="bg-white shadow-sm rounded-xl ring-1 ring-zinc-100 p-8 flex flex-col lg:col-span-4">
                        <Title className="text-lg font-bold text-zinc-900 mb-8 self-start">Device Usage</Title>
                        <div className="flex-1 flex flex-col justify-center">
                            <BarList
                                data={testsPerDevice.map(item => ({
                                    name: item.name === "ForceDecks (CMJ)" ? "ForceDecks" : item.name,
                                    value: Number(item.value)
                                }))}
                                color="indigo"
                                className="mt-2"
                            />
                            <div className="mt-8 pt-8 border-t border-zinc-50 flex flex-col items-center">
                                <span className="text-5xl font-black text-[#0F172A] tracking-tighter">
                                    {testsPerDevice.length}
                                </span>
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Active Devices</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Device Performance Overview (New) */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <div className="space-y-1">
                            <Title className="text-lg font-bold text-zinc-900">Device Performance Overview</Title>
                            <p className="text-zinc-500 text-xs font-medium">Representative metrics (Avg) from recent tests</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <DeviceMetricCard
                            device="ForceDecks"
                            title="CMJ Height"
                            value={avgCmj.toFixed(1)}
                            unit="cm"
                            icon={Activity}
                            color="indigo"
                            subtext="Total Jumps: "
                            subvalue={testsPerDeviceMap['ForceDecks']?.toString() || "0"}
                        />
                        <DeviceMetricCard
                            device="NordBord"
                            title="Max Force (L+R)"
                            value={calculateDeviceMetric(filteredMeasurements, 'NordBord', 'MaxForce')}
                            unit="N"
                            icon={Layers}
                            color="rose"
                            subtext="Tests: "
                            subvalue={testsPerDeviceMap['NordBord']?.toString() || "0"}
                        />
                        <DeviceMetricCard
                            device="ForceFrame"
                            title="Max Force (Avg)"
                            value={calculateDeviceMetric(filteredMeasurements, 'ForceFrame', 'MaxForce')}
                            unit="N"
                            icon={Zap}
                            color="amber"
                            subtext="Tests: "
                            subvalue={testsPerDeviceMap['ForceFrame']?.toString() || "0"}
                        />
                        <DeviceMetricCard
                            device="SmartSpeed"
                            title="Max Velocity"
                            value={calculateDeviceMetric(filteredMeasurements, 'SmartSpeed', 'Velocity')}
                            unit="m/s"
                            icon={ArrowUpRight}
                            color="cyan"
                            subtext="Sprints: "
                            subvalue={testsPerDeviceMap['SmartSpeed']?.toString() || "0"}
                        />
                        <DeviceMetricCard
                            device="DynaMo"
                            title="Max ROM (Avg)"
                            value={calculateDeviceMetric(filteredMeasurements, 'DynaMo', 'CMJ')} // Type hack or update sig
                            unit="°"
                            icon={Activity}
                            color="slate"
                            subtext="Tests: "
                            subvalue={testsPerDeviceMap['DynaMo']?.toString() || "0"}
                        />
                    </div>
                </div>
            </div>

            {/* All Player Status Table */}
            <Card className="bg-white shadow-sm rounded-xl ring-1 ring-zinc-100 p-0 overflow-hidden">
                <div className="p-8 border-b border-zinc-50 flex items-center justify-between bg-white">
                    <Title className="text-lg font-bold text-zinc-900">All Player Status</Title>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Showing 1000 Players</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#F8FAFC] text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">
                            <tr>
                                <th className="px-8 py-5">Name</th>
                                <th className="px-8 py-5">Team</th>
                                <th className="px-8 py-5">Last Active</th>
                                <th className="px-8 py-5">Top CMJ (Recent)</th>
                                <th className="px-8 py-5">Max Nordic (Recent)</th>
                                <th className="px-8 py-5">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {playerProfiles?.map((player) => (
                                <tr key={player.id} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-8 py-5 text-sm font-bold text-zinc-900">. {player.name}</td>
                                    <td className="px-8 py-5 text-sm text-zinc-400 font-medium">-</td>
                                    <td className="px-8 py-5 text-sm text-zinc-400 font-medium">-</td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1 bg-blue-500 rounded-full" />
                                            <span className="text-xs font-black text-zinc-900">- <span className="text-zinc-400 font-bold ml-0.5">cm</span></span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1 bg-purple-500 rounded-full" />
                                            <span className="text-xs font-black text-zinc-900">- <span className="text-zinc-400 font-bold ml-0.5">N</span></span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <Badge color="zinc" className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-500 border-none ring-0">Inactive</Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

        </div>
    );
}

function calculateDeviceMetric(measurements: any[], deviceName: string, metricType: 'MaxForce' | 'Velocity' | 'CMJ'): string {
    if (!measurements || measurements.length === 0) return "0";

    const relevant = measurements.filter(m => {
        // Safe check for metrics existence
        if (!m.metrics) return false;

        // Check device match (either by metrics.device or test_type mapping)
        const d = m.metrics.device || m.test_type; // Fallback
        if (deviceName === 'ForceDecks') return d === 'ForceDecks' || d === 'CMJ';
        if (deviceName === 'NordBord') return d === 'NordBord';
        if (deviceName === 'ForceFrame') return d === 'ForceFrame';
        if (deviceName === 'SmartSpeed') return d === 'SmartSpeed';
        return false;
    });

    if (relevant.length === 0) return "0";

    let total = 0;
    let count = 0;

    for (const r of relevant) {
        const m = r.metrics;
        let val = 0;

        if (deviceName === 'NordBord') {
            // Max Force Left + Right
            const left = m.leftMaxForce || 0;
            const right = m.rightMaxForce || 0;
            val = left + right;
        } else if (deviceName === 'ForceFrame') {
            // Max Force (Inner/Outer check)
            // Just take max of reported max forces
            const maxes = [
                m.innerLeftMaxForce, m.innerRightMaxForce,
                m.outerLeftMaxForce, m.outerRightMaxForce
            ].filter(n => typeof n === 'number');
            val = maxes.length ? Math.max(...maxes) : 0;
        } else if (deviceName === 'SmartSpeed') {
            // Velocity or Time
            // Using runningSummaryFields.velocityFields.peakVelocityMetersPerSecond
            // Inspect showed: runningSummaryFields -> velocityFields -> peakVelocityMetersPerSecond
            try {
                val = m.runningSummaryFields?.velocityFields?.peakVelocityMetersPerSecond || 0;
            } catch { val = 0; }
        } else if (deviceName === 'DynaMo') {
            // ROM
            // repetitionTypeSummaries[0].maxRangeOfMotionDegrees
            try {
                const repSummary = m.repetitionTypeSummaries?.[0];
                if (repSummary) {
                    val = repSummary.maxRangeOfMotionDegrees || 0;
                }
            } catch { val = 0; }
        }

        if (val > 0) {
            total += val;
            count++;
        }
    }

    // DynaMo ROM is degrees, just 0 decimal needed for large integers? No, 1 is fine.
    return count ? (total / count).toFixed(1) : "0";
}

function DeviceMetricCard({ device, title, value, unit, icon: Icon, color, subtext, subvalue }: any) {
    const colorMap: Record<string, string> = {
        indigo: "bg-indigo-50 text-indigo-600",
        rose: "bg-rose-50 text-rose-600",
        amber: "bg-amber-50 text-amber-600",
        cyan: "bg-cyan-50 text-cyan-600",
    };

    return (
        <Card className="bg-white shadow-sm rounded-2xl ring-1 ring-zinc-100 p-6 flex flex-col relative overflow-hidden group hover:ring-zinc-200 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-lg transition-colors", colorMap[color] || "bg-zinc-50 text-zinc-600")}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="text-[10px] font-black px-2 py-1 rounded-full text-zinc-400 bg-zinc-50">
                    {device}
                </div>
            </div>
            <div className="space-y-1">
                <Text className="text-zinc-400 font-extrabold text-[10px] uppercase tracking-[0.1em] leading-none mb-1">{title}</Text>
                <div className="flex items-baseline gap-1.5">
                    <Metric className="text-3xl font-black tracking-tight text-[#0F172A]">{value}</Metric>
                    {unit && <span className="text-xs font-bold text-zinc-400">{unit}</span>}
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500">{subtext}</span>
                <span className="text-[10px] font-black text-zinc-900">{subvalue}</span>
            </div>
        </Card>
    );
}

function KPICard({ title, value, unit, icon: Icon, trend, trendPositive, color }: any) {
    const colorMap: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600",
        purple: "bg-purple-50 text-purple-600",
        amber: "bg-amber-50 text-amber-600",
        emerald: "bg-emerald-50 text-emerald-600",
    };

    return (
        <Card className="bg-white shadow-sm rounded-2xl ring-1 ring-zinc-100 p-8 flex flex-col relative overflow-hidden group hover:ring-zinc-200 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
                <div className={cn("p-2.5 rounded-xl transition-colors", colorMap[color] || "bg-zinc-50 text-zinc-600")}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend && trend !== "0" && (
                    <div className={cn(
                        "flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-full",
                        trendPositive ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                    )}>
                        {trendPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {trend}
                    </div>
                )}
                {trend === "0" && (
                    <div className="text-[10px] font-black px-2.5 py-1.5 rounded-full text-zinc-400 bg-zinc-50">
                        0
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <Text className="text-zinc-400 font-black text-[10px] uppercase tracking-[0.15em] leading-none mb-2">{title}</Text>
                <div className="flex items-baseline gap-2">
                    <Metric className="text-4xl font-black tracking-tight text-[#0F172A]">{value}</Metric>
                    {unit && <span className="text-sm font-bold text-zinc-400 ml-1">{unit}</span>}
                </div>
            </div>
        </Card>
    );
}
