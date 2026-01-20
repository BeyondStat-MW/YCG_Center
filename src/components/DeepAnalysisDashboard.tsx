'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
    Users, BarChart2, TrendingUp, ScatterChart as ScatterIcon, Layers,
    Database, Check, PieChart, ArrowLeftRight, Trophy, Search, Loader2, ChevronRight, X
} from 'lucide-react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, Title, Tooltip, Legend, Filler, ArcElement
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { METRIC_CONFIG, TIER_METRICS, REVERSE_METRICS } from '@/utils/metricConfig';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement);

type Measurement = {
    id: string;
    recorded_at: string;
    test_type: string;
    metrics: any;
    profiles?: { name: string; id: string; };
    player_id?: string;
};

type Profile = { id: string; name: string; };

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#64748B'];

export default function DeepAnalysisDashboard({ measurements, initialProfiles = [] }: { measurements: Measurement[], initialProfiles?: Profile[] }) {
    const chartRef = useRef<any>(null);

    // State
    const [activeTab, setActiveTab] = useState<'trend' | 'report' | 'compare'>('trend');
    const [allProfiles, setAllProfiles] = useState<Profile[]>(initialProfiles);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [testType, setTestType] = useState<string>('');
    const [xAxisKey, setXAxisKey] = useState<string>('date');
    const [yAxisKey, setYAxisKey] = useState<string>('');
    const [chartType, setChartType] = useState<'line' | 'bar' | 'scatter' | 'area'>('line');
    const [preDate, setPreDate] = useState<string>('');
    const [postDate, setPostDate] = useState<string>('');
    const [compareMetric, setCompareMetric] = useState<string>('');
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    // Dynamic Metric Configuration State
    const [metricMap, setMetricMap] = useState<Record<string, { label: string; visible: boolean }>>({});

    useEffect(() => {
        setIsMounted(true);

        // Fetch Profiles
        if (initialProfiles.length === 0) {
            setLoadingProfiles(true);
            fetch('/api/profiles').then(r => r.json()).then(d => {
                if (d.profiles) setAllProfiles(d.profiles);
            }).finally(() => setLoadingProfiles(false));
        }

        // Fetch Metric Configs
        fetch('/api/metric-configs')
            .then(r => r.json())
            .then(d => {
                if (d.configs) {
                    const map: Record<string, { label: string; visible: boolean }> = {};
                    d.configs.forEach((c: any) => {
                        // Store using raw metric_key. 
                        // Note: If duplicates exist (same key, different category), last one wins in this simple map.
                        // Ideally we filtered by category, but for now this enables the user request.
                        map[c.metric_key] = {
                            label: c.display_name || c.metric_key,
                            visible: c.visible ?? true
                        };
                    });
                    setMetricMap(map);
                }
            })
            .catch(err => console.error("Failed to load metric configs", err));
    }, [initialProfiles]);

    // Discovery: Available test types, metrics, and dates
    const discovery = useMemo(() => {
        const types: Record<string, Set<string>> = {};
        const dates = new Set<string>();

        measurements.forEach(m => {
            try { dates.add(new Date(m.recorded_at).toISOString().split('T')[0]); } catch { }
            const typeName = m.test_type || m.metrics?.testType;
            if (!typeName) return;
            if (!types[typeName]) types[typeName] = new Set();

            // Collect ALL numeric keys from metrics
            const flat = { ...m.metrics };
            Object.keys(flat).forEach(k => {
                if (typeof flat[k] === 'number') {
                    // Check logic:
                    // 1. If in DB config: obey 'visible' flag.
                    // 2. If NOT in DB config: show it (allow discovery of new metrics).
                    // 3. Fallback: If static config has it, use that? (Optional, but DB is source of truth now)

                    const config = metricMap[k];
                    // If config exists, check visibility. If no config, assume visible (show all found).
                    const isVisible = config ? config.visible : true;

                    if (isVisible) {
                        types[typeName].add(k);
                    }
                }
            });
        });

        return {
            types: Object.keys(types).sort(),
            metrics: types,
            availableDates: Array.from(dates).sort().reverse()
        };
    }, [measurements, metricMap]);

    // Helper: Get clean display name
    const getLabel = (key: string) => {
        if (metricMap[key]) return metricMap[key].label;
        return METRIC_CONFIG[key] || key; // Fallback to static or raw key
    };

    // Helper: Extract metric value
    const getValue = (m: Measurement, key: string): number | null => {
        const val = m.metrics?.[key];
        return typeof val === 'number' ? val : null;
    };

    // Get filtered player list
    const filteredPlayers = useMemo(() => {
        return allProfiles.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [allProfiles, searchQuery]);

    // =====================
    // TREND CHART DATA
    // =====================
    const { chartData, stats } = useMemo(() => {
        if (activeTab !== 'trend' || !testType || !yAxisKey || selectedPlayerIds.length === 0) {
            return { chartData: null, stats: null };
        }

        const datasets: any[] = [];
        const allPoints: { x: number; y: number }[] = [];

        selectedPlayerIds.forEach((pid, idx) => {
            const player = allProfiles.find(p => p.id === pid);
            const pName = player?.name || 'Unknown';

            // Filter measurements for this player and test type
            const pMs = measurements.filter(m =>
                (m.player_id === pid || m.profiles?.id === pid) &&
                (m.test_type === testType || m.metrics?.testType === testType)
            );

            const points = pMs.map(m => {
                const yVal = getValue(m, yAxisKey);
                if (yVal === null) return null;

                let xVal: any;
                if (xAxisKey === 'date') {
                    xVal = new Date(m.recorded_at).getTime();
                } else {
                    const xv = getValue(m, xAxisKey);
                    if (xv === null) return null;
                    xVal = xv;
                }
                return { x: xVal, y: yVal, rawDate: m.recorded_at, name: pName };
            }).filter(Boolean).sort((a: any, b: any) => a.x - b.x);

            if (points.length > 0) {
                points.forEach(p => allPoints.push(p as any));
                datasets.push({
                    label: pName,
                    data: points,
                    borderColor: COLORS[idx % COLORS.length],
                    backgroundColor: COLORS[idx % COLORS.length] + '80',
                    pointRadius: 4, borderWidth: 2,
                    fill: chartType === 'area',
                    tension: 0.3
                });
            }
        });

        // Correlation (only when X is not date)
        let calculatedStats = null;
        if (xAxisKey !== 'date' && allPoints.length > 2) {
            const n = allPoints.length;
            const sumX = allPoints.reduce((a, p) => a + p.x, 0);
            const sumY = allPoints.reduce((a, p) => a + p.y, 0);
            const sumXY = allPoints.reduce((a, p) => a + p.x * p.y, 0);
            const sumX2 = allPoints.reduce((a, p) => a + p.x * p.x, 0);
            const sumY2 = allPoints.reduce((a, p) => a + p.y * p.y, 0);
            const num = n * sumXY - sumX * sumY;
            const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
            const r = den === 0 ? 0 : num / den;
            calculatedStats = { r, r2: r * r };
        }

        return { chartData: { datasets }, stats: calculatedStats };
    }, [activeTab, measurements, selectedPlayerIds, testType, xAxisKey, yAxisKey, chartType, allProfiles]);

    // =====================
    // PHYSICAL REPORT DATA
    // =====================
    const reportData = useMemo(() => {
        if (activeTab !== 'report') return null;

        const scores: { name: string; power: number; strength: number; speed: number; total: number; tier: string }[] = [];

        allProfiles.forEach(p => {
            const pMs = measurements.filter(m => m.player_id === p.id || m.profiles?.id === p.id);
            if (pMs.length === 0) return;

            let powerMax = 0, strengthMax = 0, speedMin = 999;

            pMs.forEach(m => {
                // Power metrics (higher is better)
                TIER_METRICS.POWER.forEach(k => {
                    const v = getValue(m, k);
                    if (v !== null && v > powerMax) powerMax = v;
                });
                // Strength metrics (higher is better)
                TIER_METRICS.STRENGTH.forEach(k => {
                    const v = getValue(m, k);
                    if (v !== null && v > strengthMax) strengthMax = v;
                });
                // Speed metrics (lower is better for time)
                TIER_METRICS.SPEED.slice(0, 2).forEach(k => {
                    const v = getValue(m, k);
                    if (v !== null && v > 0 && v < speedMin) speedMin = v;
                });
                // Peak Velocity (higher is better)
                const pv = getValue(m, 'runningSummaryFields_velocityFields_peakVelocityMetersPerSecond');
                if (pv !== null && pv > powerMax) powerMax = Math.max(powerMax, pv * 3); // Scale velocity
            });

            if (powerMax === 0 && strengthMax === 0 && speedMin === 999) return;

            scores.push({
                name: p.name,
                power: powerMax,
                strength: strengthMax,
                speed: speedMin === 999 ? 0 : (10 - speedMin) * 10, // Invert: lower time = higher score
                total: 0, tier: 'C'
            });
        });

        if (scores.length === 0) return { list: [], counts: { S: 0, A: 0, B: 0, C: 0 } };

        // Normalize
        const maxPower = Math.max(...scores.map(s => s.power)) || 1;
        const maxStrength = Math.max(...scores.map(s => s.strength)) || 1;
        const maxSpeed = Math.max(...scores.map(s => s.speed)) || 1;

        scores.forEach(s => {
            const pNorm = (s.power / maxPower) * 35;
            const strNorm = (s.strength / maxStrength) * 35;
            const spNorm = (s.speed / maxSpeed) * 30;
            s.total = pNorm + strNorm + spNorm;

            if (s.total >= 80) s.tier = 'S';
            else if (s.total >= 60) s.tier = 'A';
            else if (s.total >= 40) s.tier = 'B';
            else s.tier = 'C';
        });

        scores.sort((a, b) => b.total - a.total);
        const counts = { S: 0, A: 0, B: 0, C: 0 };
        scores.forEach(s => counts[s.tier as keyof typeof counts]++);

        return { list: scores, counts };
    }, [activeTab, measurements, allProfiles]);

    // =====================
    // PRE-POST COMPARE DATA
    // =====================
    const compareData = useMemo(() => {
        if (activeTab !== 'compare' || !preDate || !postDate || !compareMetric) return null;

        const results: { name: string; pre: number; post: number; delta: number }[] = [];

        // Use selected players if any, otherwise all
        const targetIds = selectedPlayerIds.length > 0 ? selectedPlayerIds : allProfiles.map(p => p.id);

        targetIds.forEach(pid => {
            const player = allProfiles.find(p => p.id === pid);
            if (!player) return;

            const preMs = measurements.filter(m =>
                (m.player_id === pid || m.profiles?.id === pid) &&
                m.recorded_at.startsWith(preDate)
            );
            const postMs = measurements.filter(m =>
                (m.player_id === pid || m.profiles?.id === pid) &&
                m.recorded_at.startsWith(postDate)
            );

            // Find best value in each period
            let preVal: number | null = null;
            let postVal: number | null = null;

            preMs.forEach(m => {
                const v = getValue(m, compareMetric);
                if (v !== null) {
                    if (preVal === null || v > preVal) preVal = v;
                }
            });
            postMs.forEach(m => {
                const v = getValue(m, compareMetric);
                if (v !== null) {
                    if (postVal === null || v > postVal) postVal = v;
                }
            });

            if (preVal !== null && postVal !== null && preVal !== 0) {
                const delta = ((postVal - preVal) / Math.abs(preVal)) * 100;
                results.push({ name: player.name, pre: preVal, post: postVal, delta });
            }
        });

        // Sort by delta (improvement)
        const isReverse = REVERSE_METRICS.includes(compareMetric);
        return results.sort((a, b) => isReverse ? a.delta - b.delta : b.delta - a.delta);
    }, [activeTab, preDate, postDate, compareMetric, measurements, selectedPlayerIds, allProfiles]);

    if (!isMounted) return null;

    return (
        <div className="flex h-[calc(100vh-64px)] bg-slate-100 overflow-hidden font-sans -m-8 rounded-xl">
            {/* ===== SIDEBAR ===== */}
            <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col overflow-hidden shadow-lg`}>
                <div className="p-5 h-full flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Database className="text-indigo-600" size={20} />
                            <h2 className="text-base font-black text-slate-800">Deep Analysis</h2>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 lg:hidden"><X size={18} /></button>
                    </div>

                    {/* Player Search & List */}
                    <div className="flex-1 flex flex-col min-h-0 mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Players ({allProfiles.length})</span>
                            {selectedPlayerIds.length > 0 && (
                                <button onClick={() => setSelectedPlayerIds([])} className="text-[10px] text-red-500 font-bold">Clear ({selectedPlayerIds.length})</button>
                            )}
                        </div>
                        <div className="relative mb-2">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text" placeholder="Search players..."
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-lg text-sm outline-none border border-slate-200 focus:border-indigo-400"
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-0.5 max-h-48 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                            {loadingProfiles && <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></div>}
                            {filteredPlayers.slice(0, 100).map(p => {
                                const isSel = selectedPlayerIds.includes(p.id);
                                return (
                                    <button key={p.id} onClick={() => setSelectedPlayerIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-xs transition-all ${isSel ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'}`}>
                                        <span className="truncate">{p.name}</span>
                                        {isSel && <Check size={12} />}
                                    </button>
                                );
                            })}
                            {filteredPlayers.length > 100 && <div className="text-xs text-slate-400 py-2 text-center">...and {filteredPlayers.length - 100} more</div>}
                        </div>
                    </div>

                    <hr className="border-slate-100 my-2" />

                    {/* Tab-specific Controls */}
                    {activeTab === 'trend' && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Test Type</label>
                                <select value={testType} onChange={e => { setTestType(e.target.value); setYAxisKey(''); }}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-indigo-400">
                                    <option value="">Select...</option>
                                    {discovery.types.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            {testType && discovery.metrics[testType] && (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">X-Axis</label>
                                            <select value={xAxisKey} onChange={e => setXAxisKey(e.target.value)}
                                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none">
                                                <option value="date">Date</option>
                                                {Array.from(discovery.metrics[testType]).map(k => <option key={k} value={k}>{getLabel(k)}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-indigo-500 uppercase mb-1 block">Y-Axis *</label>
                                            <select value={yAxisKey} onChange={e => setYAxisKey(e.target.value)}
                                                className="w-full p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 outline-none">
                                                <option value="">Select Metric</option>
                                                {Array.from(discovery.metrics[testType]).map(k => <option key={k} value={k}>{getLabel(k)}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                                        {[{ id: 'line', icon: TrendingUp }, { id: 'bar', icon: BarChart2 }, { id: 'scatter', icon: ScatterIcon }, { id: 'area', icon: Layers }].map(opt => (
                                            <button key={opt.id} onClick={() => setChartType(opt.id as any)}
                                                className={`flex-1 flex justify-center py-1.5 rounded ${chartType === opt.id ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>
                                                <opt.icon size={14} />
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'compare' && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Pre Date</label>
                                    <select value={preDate} onChange={e => setPreDate(e.target.value)}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none">
                                        <option value="">Select...</option>
                                        {discovery.availableDates.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Post Date</label>
                                    <select value={postDate} onChange={e => setPostDate(e.target.value)}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none">
                                        <option value="">Select...</option>
                                        {discovery.availableDates.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-indigo-500 uppercase mb-1 block">Metric *</label>
                                <select value={compareMetric} onChange={e => setCompareMetric(e.target.value)}
                                    className="w-full p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-bold text-indigo-700 outline-none">
                                    <option value="">Select Metric...</option>
                                    {Object.entries(METRIC_CONFIG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTab === 'report' && (
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
                            <strong>Physical Report</strong> calculates player tiers (S/A/B/C) based on Power, Strength, and Speed metrics.
                        </div>
                    )}

                    {/* BeyondStat Logo */}
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-center">
                        <img src="/beyondstat-logo.png" alt="BeyondStat" className="h-8 opacity-70" />
                    </div>
                </div>
            </div>

            {/* ===== MAIN CONTENT ===== */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header Tabs */}
                <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0">
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-indigo-600 lg:hidden">
                        <Users size={20} />
                    </button>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {[
                            { id: 'trend', label: 'Trend Analysis', icon: TrendingUp },
                            { id: 'report', label: 'Physical Report', icon: Trophy },
                            { id: 'compare', label: 'Pre-Post Compare', icon: ArrowLeftRight },
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                <tab.icon size={14} /> {tab.label}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 p-5 overflow-y-auto bg-slate-100">
                    {/* TREND VIEW */}
                    {activeTab === 'trend' && (
                        <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                            {!chartData || chartData.datasets.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                    <TrendingUp size={40} className="mb-3 opacity-30" />
                                    <p className="text-sm font-bold">Select Players, Test Type, and Metric</p>
                                    <p className="text-xs mt-1">to visualize performance trends</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h2 className="text-lg font-black text-slate-800">{getLabel(yAxisKey)}</h2>
                                            <p className="text-xs text-slate-500">vs {xAxisKey === 'date' ? 'Time' : getLabel(xAxisKey)} • {selectedPlayerIds.length} players</p>
                                        </div>
                                        {stats && (
                                            <div className="bg-indigo-50 px-3 py-1.5 rounded-lg text-right">
                                                <div className="text-[10px] text-indigo-400 font-bold uppercase">Correlation</div>
                                                <div className="text-base font-black text-indigo-700">r = {stats.r.toFixed(3)}</div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 relative min-h-0">
                                        <Chart ref={chartRef} type={chartType === 'area' ? 'line' : chartType as any} data={chartData}
                                            options={{
                                                responsive: true, maintainAspectRatio: false,
                                                scales: {
                                                    x: xAxisKey === 'date'
                                                        ? { type: 'linear', ticks: { callback: (v: any) => new Date(v).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) }, grid: { display: false } }
                                                        : { type: 'linear', grid: { color: '#F1F5F9' }, title: { display: true, text: getLabel(xAxisKey) } },
                                                    y: { grid: { color: '#F1F5F9' }, title: { display: true, text: getLabel(yAxisKey) } }
                                                },
                                                plugins: {
                                                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
                                                    tooltip: { backgroundColor: '#fff', titleColor: '#1e293b', bodyColor: '#475569', borderColor: '#e2e8f0', borderWidth: 1 }
                                                }
                                            }}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* REPORT VIEW */}
                    {activeTab === 'report' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-full">
                            {/* Tier Doughnut */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col items-center justify-center">
                                <h3 className="text-sm font-black text-slate-700 mb-4 self-start">Tier Distribution</h3>
                                {reportData && reportData.list.length > 0 ? (
                                    <div className="w-48 h-48">
                                        <Chart type="doughnut" data={{
                                            labels: ['S-Tier', 'A-Tier', 'B-Tier', 'C-Tier'],
                                            datasets: [{ data: [reportData.counts.S, reportData.counts.A, reportData.counts.B, reportData.counts.C], backgroundColor: ['#F59E0B', '#94A3B8', '#D97706', '#E2E8F0'], borderWidth: 0 }]
                                        }} options={{ plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 10 } } } } }} />
                                    </div>
                                ) : (
                                    <div className="text-slate-400 text-sm">No data</div>
                                )}
                            </div>

                            {/* Rankings Table */}
                            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 overflow-hidden flex flex-col">
                                <h3 className="text-sm font-black text-slate-700 mb-3">Player Rankings</h3>
                                <div className="flex-1 overflow-y-auto">
                                    {reportData && reportData.list.length > 0 ? (
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">#</th>
                                                    <th className="px-3 py-2 text-left">Player</th>
                                                    <th className="px-3 py-2 text-right">Power</th>
                                                    <th className="px-3 py-2 text-right">Strength</th>
                                                    <th className="px-3 py-2 text-right">Speed</th>
                                                    <th className="px-3 py-2 text-right">Score</th>
                                                    <th className="px-3 py-2 text-center">Tier</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {reportData.list.map((r, i) => (
                                                    <tr key={i} className="hover:bg-slate-50">
                                                        <td className="px-3 py-2 text-slate-400 font-medium">{i + 1}</td>
                                                        <td className="px-3 py-2 font-bold text-slate-700">{r.name}</td>
                                                        <td className="px-3 py-2 text-right text-slate-500">{r.power.toFixed(1)}</td>
                                                        <td className="px-3 py-2 text-right text-slate-500">{r.strength.toFixed(0)}</td>
                                                        <td className="px-3 py-2 text-right text-slate-500">{r.speed.toFixed(1)}</td>
                                                        <td className="px-3 py-2 text-right font-black text-indigo-600">{r.total.toFixed(0)}</td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${r.tier === 'S' ? 'bg-yellow-500' : r.tier === 'A' ? 'bg-slate-400' : r.tier === 'B' ? 'bg-orange-500' : 'bg-slate-300'}`}>{r.tier}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">No ranking data available</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* COMPARE VIEW */}
                    {activeTab === 'compare' && (
                        <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                            {!compareData || compareData.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                    <ArrowLeftRight size={40} className="mb-3 opacity-30" />
                                    <p className="text-sm font-bold">Select Pre/Post Dates and a Metric</p>
                                    <p className="text-xs mt-1">to compare performance changes</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4">
                                        <h2 className="text-lg font-black text-slate-800">{getLabel(compareMetric)} Change</h2>
                                        <p className="text-xs text-slate-500">{preDate} → {postDate} • {compareData.length} players</p>
                                    </div>
                                    <div className="flex-1 relative min-h-0">
                                        <Chart type="bar" data={{
                                            labels: compareData.map(d => d.name),
                                            datasets: [{
                                                label: '% Change',
                                                data: compareData.map(d => d.delta),
                                                backgroundColor: compareData.map(d => d.delta >= 0 ? '#10B981' : '#EF4444'),
                                                borderRadius: 4
                                            }]
                                        }} options={{
                                            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                                            scales: { x: { grid: { color: '#F1F5F9' } }, y: { grid: { display: false } } },
                                            plugins: { legend: { display: false } }
                                        }} />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
