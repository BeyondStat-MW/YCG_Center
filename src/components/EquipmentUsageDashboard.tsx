'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, Label, AreaChart, Area
} from 'recharts';
import { Users, Activity, Award, Gauge, ArrowUpRight } from 'lucide-react';
import { clsx } from 'clsx';

const DEVICE_COLORS: Record<string, string> = {
    'ForceDecks': '#3b82f6',      // Blue
    'NordBord': '#10b981',         // Emerald
    'ForceFrame': '#f59e0b',       // Amber
    'SmartSpeed': '#ef4444',       // Red
    'DynaMo': '#8b5cf6',           // Violet
    'default': '#6b7280'           // Gray
};

// Test types to exclude from dashboard
const EXCLUDED_TEST_TYPES = ['rehab', 'Unknown'];

// Helper to check if a test is one of our target devices
const isTargetDevice = (type: string) => {
    return ['ForceDecks', 'NordBord', 'ForceFrame', 'SmartSpeed', 'DynaMo'].some(t =>
        type?.toLowerCase().includes(t.toLowerCase())
    );
};

interface Measurement {
    id: string;
    player_id: string;
    test_type: string;
    test_date?: string;     // Legacy support
    recorded_at?: string;   // Actual DB column
    metrics: Record<string, any>;
    profiles?: {
        name?: string;
        first_name?: string;
        last_name?: string;
        display_name?: string;
        level?: string;
    };
}

interface EquipmentUsageDashboardProps {
    measurements: Measurement[];
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value, name }: any) => {
    if (percent < 0.05) return null; // Don't show for very small slices

    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor={x > cx ? 'start' : 'end'}
            dominantBaseline="central"
            className="text-[10px] font-bold"
            style={{ textShadow: '0px 0px 2px rgba(0,0,0,0.5)' }}
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export default function EquipmentUsageDashboard({ measurements }: EquipmentUsageDashboardProps) {
    const [period, setPeriod] = useState<'1d' | '1w' | '1m' | '1y' | 'all'>('1m');
    const [selectedLevel, setSelectedLevel] = useState('all');

    // 1. Filter Measurements by Time & Type
    const filteredMeasurements = useMemo(() => {
        const now = new Date();
        const cutoff = new Date(now);

        // Reset hours for accurate daily comparison
        now.setHours(23, 59, 59, 999);

        if (period === '1d') cutoff.setDate(now.getDate() - 1);
        else if (period === '1w') cutoff.setDate(now.getDate() - 7);
        else if (period === '1m') cutoff.setMonth(now.getMonth() - 1);
        else if (period === '1y') cutoff.setFullYear(now.getFullYear() - 1);
        else cutoff.setFullYear(1900);

        return measurements.filter(m => {
            // Type Filter
            if (EXCLUDED_TEST_TYPES.includes(m.test_type)) return false;

            // Time Filter
            const dateStr = m.recorded_at || m.test_date;
            if (!dateStr) return false;

            const mDate = new Date(dateStr);
            return mDate >= cutoff && mDate <= now;
        });
    }, [measurements, period]);

    // 2. Calculate device usage statistics
    const deviceStats = useMemo(() => {
        const stats: Record<string, number> = {};
        filteredMeasurements.forEach(m => {
            const device = m.test_type || 'Others';
            stats[device] = (stats[device] || 0) + 1;
        });
        return Object.entries(stats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredMeasurements]);

    // 3. Calculate daily statistics for Stacked Area Chart (FIXED SORTING)
    const dailyTrendData = useMemo(() => {
        const stats: Record<string, Record<string, number>> = {};
        const allDevices = new Set<string>();

        filteredMeasurements.forEach(m => {
            const dateStr = m.recorded_at || m.test_date;
            if (!dateStr) return;

            // Use ISO string YYYY-MM-DD for correct sorting key
            const isoDate = new Date(dateStr).toISOString().split('T')[0];

            const device = m.test_type || 'Others';
            allDevices.add(device);

            if (!stats[isoDate]) stats[isoDate] = {};
            stats[isoDate][device] = (stats[isoDate][device] || 0) + 1;
        });

        // Sort by ISO Date string (Chronologically)
        const sortedDates = Object.keys(stats).sort();

        return sortedDates.map(isoDate => {
            const dateObj = new Date(isoDate);
            // Display format: YY.MM.DD
            const displayDate = `${dateObj.getFullYear().toString().slice(2)}.${(dateObj.getMonth() + 1).toString().padStart(2, '0')}.${dateObj.getDate().toString().padStart(2, '0')}`;

            const entry: any = { date: displayDate, _sortKey: isoDate }; // sorted by array order anyway
            allDevices.forEach(dev => {
                entry[dev] = stats[isoDate][dev] || 0;
            });
            return entry;
        });
    }, [filteredMeasurements]);

    const levels = useMemo(() => {
        const set = new Set<string>();
        measurements.forEach(m => {
            if (m.profiles?.level) set.add(m.profiles.level);
        });
        return Array.from(set).sort();
    }, [measurements]);

    // 4. Calculate Top 10 Performance Metrics (FIXED KEYS)
    const topPerformers = useMemo(() => {
        const deviceBests: Record<string, Record<string, { name: string, score: number, date: string, level?: string }>> = {};

        filteredMeasurements.forEach(m => {
            // Level Filter for Leaderboard Only
            if (selectedLevel !== 'all' && m.profiles?.level !== selectedLevel) return;

            const device = m.test_type;
            const pid = m.player_id;
            if (!pid || !device) return;

            const pName = m.profiles?.name || m.profiles?.display_name || 'Unknown';
            const pLevel = m.profiles?.level;

            let score = 0;
            let isLowerBetter = false;
            const dateStr = m.recorded_at || m.test_date || '';

            if (device === 'ForceDecks') {
                // User Requirement: Strictly CMJ only.
                const typeName = m.metrics?.testType;
                if (typeName !== 'CMJ') return;

                // CMJ Height - Prioritize Imp-Mom
                score = Number(
                    m.metrics?.['Jump Height (Imp-Mom)'] ||
                    m.metrics?.['JumpHeight(Imp-Mom)'] ||
                    m.metrics?.jumpHeight_cm_ ||
                    m.metrics?.['Jump Height [cm]'] ||
                    0
                );

                // Outlier Filter (Strict < 100cm)
                if (score > 100) score = 0;

            } else if (device === 'NordBord') {
                // Nordic Max Force Avg
                const left = Number(m.metrics?.leftMaxForce || 0);
                const right = Number(m.metrics?.rightMaxForce || 0);
                score = (left + right) / 2;
            } else if (device === 'ForceFrame') {
                // Hip Adduction: Use inner forces
                // Filter specifically for Adduction tests if possible, or assume all ForceFrame here are relevant?
                // Providing best effort extraction:
                const innerDesc = m.metrics?.testTypeName || '';
                if (innerDesc.includes('Adduction') || innerDesc.includes('AD') || true) { // Broaden for now
                    const left = Number(m.metrics?.innerLeftMaxForce || m.metrics?.leftMaxForce || 0);
                    const right = Number(m.metrics?.innerRightMaxForce || m.metrics?.rightMaxForce || 0);
                    score = (left + right) / 2;
                }
            } else if (device === 'SmartSpeed') {
                // 10m Sprint Logic: 
                // 1. '10m Sprint' -> Use bestSplit or total time
                // 2. '20m Sprint' -> Use 10m split (cumulativeOne)
                const testName = m.metrics?.testName || m.metrics?.testTypeName || '';

                if (testName.includes('10m Sprint') || testName === '10m') {
                    // Try to find the time.
                    // Note: metrics structure varies. Deep search logic in Python was complex.
                    // Here we try common paths.
                    const rs = m.metrics?.runningSummaryFields;
                    const run = Array.isArray(rs) ? rs[0] : rs;

                    score = Number(
                        run?.gateSummaryFields?.cumulativeOne ||
                        run?.bestSplitSeconds ||
                        m.metrics?.time ||
                        999
                    );
                } else if (testName.includes('20m Sprint')) {
                    const rs = m.metrics?.runningSummaryFields;
                    const run = Array.isArray(rs) ? rs[0] : rs;
                    // Use 10m split
                    score = Number(run?.gateSummaryFields?.cumulativeOne || 999);
                } else {
                    score = 999; // Not a target sprint test
                }

                if (score === 0) score = 999;
            } else if (device === 'DynaMo') {
                const movement = m.metrics?.movement || '';
                if (movement.includes('Extension')) {
                    let force = Number(m.metrics?.peakForce || m.metrics?.maxForce || 0);

                    // Fallback to Repetition Summaries
                    if (!force && Array.isArray(m.metrics?.repetitionTypeSummaries)) {
                        m.metrics.repetitionTypeSummaries.forEach((s: any) => {
                            const f = Number(s?.maxForceNewtons || 0);
                            if (f > force) force = f;
                        });
                    }
                    score = force;
                }
            }

            if (score === 0 || isNaN(score) || score === 999) return;

            // Initialize Group
            if (!deviceBests[device]) deviceBests[device] = {};

            // Update Best
            const currentBest = deviceBests[device][pid];
            if (!currentBest) {
                deviceBests[device][pid] = { name: pName, score, date: dateStr, level: pLevel };
            } else {
                if (isLowerBetter) {
                    if (score < currentBest.score) deviceBests[device][pid] = { name: pName, score, date: dateStr, level: pLevel };
                } else {
                    if (score > currentBest.score) deviceBests[device][pid] = { name: pName, score, date: dateStr, level: pLevel };
                }
            }
        });

        const result: Record<string, { name: string, score: number, unit: string, level?: string }[]> = {};

        ['ForceDecks', 'NordBord', 'ForceFrame', 'SmartSpeed', 'DynaMo'].forEach(dev => {
            let unit = '';
            let isLowerBetter = false;

            if (dev === 'ForceDecks') unit = 'cm';
            if (dev === 'NordBord') unit = 'N';
            if (dev === 'ForceFrame') unit = 'N';
            if (dev === 'SmartSpeed') { unit = 's'; isLowerBetter = true; }
            if (dev === 'DynaMo') unit = 'N';

            const players = deviceBests[dev] || {};
            const sorted = Object.values(players).sort((a, b) => {
                return isLowerBetter ? a.score - b.score : b.score - a.score;
            });

            result[dev] = sorted.slice(0, 10).map(p => ({ ...p, unit }));
        });

        return result;
    }, [filteredMeasurements, selectedLevel]);


    // KPI Helpers
    const totalCount = filteredMeasurements.length;

    // Unique Players: Use Set of player_id
    const uniquePlayers = new Set(filteredMeasurements.map(m => m.player_id).filter(Boolean)).size;

    const topDevice = deviceStats[0];
    const deviceNames = Object.keys(DEVICE_COLORS).filter(k => k !== 'default');

    // Utilization Rate: (Days with at least one measurement / Total Days in Period range) * 100
    // If period is 'all', use range from first to last measurement
    const utilization = useMemo(() => {
        const activeDays = new Set(filteredMeasurements.map(m => (m.recorded_at || m.test_date)?.split('T')[0])).size;

        let totalDays = 30; // default
        const now = new Date();
        if (period === '1d') totalDays = 1;
        else if (period === '1w') totalDays = 7;
        else if (period === '1m') totalDays = 30;
        else if (period === '1y') totalDays = 365;
        else {
            // For All Time, use difference between min and max date
            if (filteredMeasurements.length > 0) {
                // Sort by date to be sure
                const dates = filteredMeasurements
                    .map(m => new Date(m.recorded_at || m.test_date || '').getTime())
                    .filter(d => !isNaN(d))
                    .sort((a, b) => a - b);
                if (dates.length > 1) {
                    const diffTime = Math.abs(dates[dates.length - 1] - dates[0]);
                    totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                }
            }
        }

        if (totalDays === 0) return 0;
        return Math.min(Math.round((activeDays / totalDays) * 100), 100);
    }, [filteredMeasurements, period]);

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">센터 통합 현황</h1>
                    <p className="text-sm text-slate-500 mt-1">전체 현황 및 실시간 데이터</p>
                </div>

                {/* Global Filter */}
                <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                    {['1d', '1w', '1m', '1y', 'all'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p as any)}
                            className={clsx(
                                "px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                                period === p
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                            )}
                        >
                            {p === '1d' ? '1일' : p === '1w' ? '1주일' : p === '1m' ? '1개월' : p === '1y' ? '1년' : '전체'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="활동 선수" value={uniquePlayers} unit="명" icon={Users} color="blue" />
                <KPICard title="누적 측정" value={totalCount} unit="회" icon={Activity} color="amber" />
                <KPICard title="최다 측정 장비" value={topDevice?.name || '-'} unit={topDevice ? `(${topDevice.value}회)` : ''} icon={Award} color="emerald" />
                <KPICard title="장비 가동률" value={utilization} unit="%" icon={Gauge} color="violet" />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Trend */}
                <Card className="bg-white border-none shadow-sm lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-slate-800">장비별 측정 일별 추이</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    {deviceNames.map(dev => (
                                        <Area
                                            key={dev}
                                            type="monotone"
                                            dataKey={dev}
                                            stackId="1"
                                            stroke={DEVICE_COLORS[dev]}
                                            fill={DEVICE_COLORS[dev]}
                                            fillOpacity={0.6}
                                        />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Device Share */}
                <Card className="bg-white border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-slate-800">장비별 비중</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={deviceStats}
                                        innerRadius={35}
                                        outerRadius={60}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={renderCustomizedLabel}
                                        labelLine={false}
                                    >
                                        {deviceStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={DEVICE_COLORS[entry.name] || DEVICE_COLORS.default} />
                                        ))}
                                        <Label
                                            position="center"
                                            content={({ viewBox }) => {
                                                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                                    return (
                                                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                                            <tspan x={viewBox.cx} y={viewBox.cy} className="text-xl font-bold fill-slate-800">{totalCount}</tspan>
                                                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 16} className="text-[10px] fill-slate-400">Total</tspan>
                                                        </text>
                                                    );
                                                }
                                            }}
                                        />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 space-y-2">
                            {deviceStats.map(d => (
                                <div key={d.name} className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ background: DEVICE_COLORS[d.name] || DEVICE_COLORS.default }} />
                                        <span className="text-slate-600">{d.name}</span>
                                    </div>
                                    <span className="font-bold text-slate-900">{d.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Top 10 Section */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Award className="text-amber-500" size={20} />
                        장비별 퍼포먼스 Top 10
                    </h3>

                    {/* Level Filter */}
                    <div className="flex items-center p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                        {['all', ...levels].map((level) => (
                            <button
                                key={level}
                                onClick={() => setSelectedLevel(level)}
                                className={clsx(
                                    "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                                    selectedLevel === level
                                        ? "bg-slate-900 text-white"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                )}
                            >
                                {level === 'all' ? '전체' : level}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {['ForceDecks', 'NordBord', 'ForceFrame', 'SmartSpeed', 'DynaMo'].map(dev => (
                        <Card key={dev} className="bg-white border-none shadow-sm overflow-hidden flex flex-col">
                            <div className={`h-1 w-full`} style={{ background: DEVICE_COLORS[dev] || DEVICE_COLORS.default }} />
                            <CardHeader className="py-3 px-4 border-b border-slate-50">
                                <CardTitle className="text-sm font-bold text-slate-800 flex justify-between items-center">
                                    {dev}
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                        {dev === 'ForceDecks' ? 'CMJ Height'
                                            : dev === 'SmartSpeed' ? '10m Sprint'
                                                : dev === 'NordBord' ? 'Nordic MaxForce'
                                                    : dev === 'ForceFrame' ? 'Hip Adduction'
                                                        : 'Knee Extension'}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[300px]">
                                {topPerformers[dev]?.length > 0 ? (
                                    <div className="divide-y divide-slate-50">
                                        {topPerformers[dev].map((p, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className={clsx(
                                                        "w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold",
                                                        idx === 0 ? "bg-amber-100 text-amber-600"
                                                            : idx === 1 ? "bg-slate-200 text-slate-600"
                                                                : idx === 2 ? "bg-orange-100 text-orange-600"
                                                                    : "bg-transparent text-slate-400"
                                                    )}>
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-xs font-medium text-slate-700">{p.name}</span>
                                                </div>
                                                <span className="text-xs font-bold text-blue-600">
                                                    {dev === 'SmartSpeed' && p.score === 999 ? '-' : p.score.toFixed(dev === 'SmartSpeed' ? 3 : 1)}
                                                    <span className="text-[9px] text-slate-400 ml-0.5">{p.unit}</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-xs text-slate-300">데이터 없음</div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, unit, icon: Icon, color }: any) {
    const colorClasses: any = {
        blue: 'bg-blue-100 text-blue-600',
        amber: 'bg-amber-100 text-amber-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        violet: 'bg-violet-100 text-violet-600',
    };

    return (
        <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${colorClasses[color] || 'bg-slate-100 text-slate-600'}`}>
                        <Icon size={18} />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
                </div>
                <div className="flex items-baseline gap-1">
                    <h3 className="text-2xl font-black text-slate-900">{value?.toLocaleString()}</h3>
                    <span className="text-xs font-medium text-slate-400">{unit}</span>
                </div>
            </CardContent>
        </Card>
    );
}

