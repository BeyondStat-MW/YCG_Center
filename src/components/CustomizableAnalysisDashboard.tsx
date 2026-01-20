'use client';

import { useState, useMemo, useEffect } from 'react';
import {
    Plus, X, Activity, Settings, ChevronDown, Edit2,
    Layout, Database, BarChart2, ArrowRight, ArrowLeft,
    Maximize2, Minimize2, Trash2, Move, Dumbbell, Settings2
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    Legend, ReferenceLine, ComposedChart
} from 'recharts';

// --- Types ---

type Measurement = {
    id: string;
    recorded_at: string;
    test_type: string;
    metrics: any;
};

type ChartType = 'line' | 'bar' | 'area' | 'composed';
type CardWidth = '1/3' | '1/2' | '2/3' | 'full';
type CardHeight = 'sm' | 'md' | 'lg';

interface CardConfig {
    id: string;
    title: string;
    layout: {
        width: CardWidth;
        height: CardHeight;
    };
    data: {
        testType: string;
        metrics: { key: string; color: string; label: string; axis: 'left' | 'right' }[];
        filters?: {
            startDate?: string;
            endDate?: string;
        };
    };
    visualization: {
        type: ChartType;
        showLegend: boolean;
        showTrendline: boolean;
        showDataPoints: boolean;
        comparisons: ('avg' | 'max')[];
        includeLevelAvg?: boolean;
        showAsymmetry?: boolean;
        yAxisDomain: [string | number, string | number];
        syncId?: string;
    };
}

// --- Utils ---

const WIDTH_MAP: Record<CardWidth, string> = {
    '1/3': 'col-span-12 lg:col-span-4',
    '1/2': 'col-span-12 lg:col-span-6',
    '2/3': 'col-span-12 lg:col-span-8',
    'full': 'col-span-12'
};

const HEIGHT_MAP: Record<CardHeight, string> = {
    'sm': 'h-[250px]',
    'md': 'h-[400px]',
    'lg': 'h-[550px]'
};

const COLORS = ['#3B82F6', '#F97316', '#10B981', '#6366F1', '#EC4899', '#8B5CF6'];

const SHORT_DATE_FORMAT = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
};

const IGNORE_KEYS = ['id', 'test', 'date', 'profile', 'valid', 'notes', 'device', 'version', 'pct', 'count', 'idx', 'impulse', 'repetition', 'weight', 'duration', 'mass', 'bmi', 'timestamp', 'tenant', 'recording', 'parameter', 'attribute', 'uuid'];

const DEVICE_TABS = [
    { id: 'ForceDecks', label: 'ForceDecks Analysis' },
    { id: 'NordBord', label: 'NordBord Analysis' },
    { id: 'ForceFrame', label: 'ForceFrame Analysis' },
    { id: 'SmartSpeed', label: 'SmartSpeed Analysis' },
    { id: 'DynaMo', label: 'DynaMo Analysis' },
    { id: 'Manual', label: 'Manual Analysis' },
];

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const EXPLICIT_MAPPING: Record<string, string[]> = {
    'DynaMo': ['Dorsiflexion (ROM)', 'Dorsiflexion (Strength)', 'Eversion (ROM)', 'Eversion (Strength)', 'Extension (ROM)', 'Extension (Strength)', 'External Rotation (ROM)', 'Flexion (ROM)', 'Flexion (Strength)', 'Internal Rotation (ROM)', 'Inversion (ROM)', 'Inversion (Strength)', 'Plantar Flexion (ROM)', 'Plantar Flexion (Strength)', 'Toe Extension (Strength)'],
    'ForceDecks': ['ABCMJ', 'CMJ', 'CMRJ', 'DJ', 'HJ', 'ISOSQT', 'LAH', 'LCMJ', 'LSJ', 'QSB', 'RSAIP', 'RSHIP', 'RSKIP', 'SJ', 'SLCMRJ', 'SLDJ', 'SLHAR', 'SLHJ', 'SLJ', 'SLLAH', 'SLROSB', 'SLSB'],
    'ForceFrame': ['Ankle IN/EV', 'Hip AD/AB', 'Hip Extension', 'Hip Flexion', 'Hip IR/ER', 'Knee Extension', 'Shoulder Extension', 'Shoulder Flexion', 'Shoulder IR/ER', 'hip flexion'],
    'NordBord': ['ISO 30', 'ISO 60', 'ISO Prone', 'Nordic'],
    'SmartSpeed': ['10m Sprint', '20m Sprint', '20m(10-10) Interval (YCG)', '30m Repeat Sprint Ability Test', '5-0-5 Drill', 'L-Drill', 'Pro Agility Drill 5-10-5', 'Y-Agility (1-1-2)'],
    'Manual': ['Manual']
};

const getDeviceForTestType = (testType: string, metricConfigs: any[]) => {
    const normType = normalize(testType);
    for (const [device, tests] of Object.entries(EXPLICIT_MAPPING)) {
        if (tests.some(t => normalize(t) === normType)) return device;
    }
    const match = metricConfigs.find(c => {
        if (c.test_category && normalize(c.test_category) === normType) return true;
        if (c.test_type && normalize(c.test_type) === normType) return true;
        return false;
    });
    if (match && match.device) return match.device;
    const lower = testType.toLowerCase();
    if (lower.includes('manual')) return 'Manual';
    if (lower.includes('nordbord') || lower.includes('nordic')) return 'NordBord';
    if (lower.includes('forceframe') || lower.includes('hip') || lower.includes('knee')) return 'ForceFrame';
    if (lower.includes('dynamo') || lower.includes('rom')) return 'DynaMo';
    if (lower.includes('smartspeed') || lower.includes('sprint')) return 'SmartSpeed';
    return 'ForceDecks';
};



// --- Main Component ---

export default function AdvancedCustomDashboard({ measurements, playerId, playerLevel }: { measurements: Measurement[], playerId: string, playerLevel?: string }) {
    const [cards, setCards] = useState<CardConfig[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [modalState, setModalState] = useState<{ open: boolean; editId?: string }>({ open: false });
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [globalStats, setGlobalStats] = useState<any>(null);
    const [activeDevice, setActiveDevice] = useState('ForceDecks');
    const [metricConfigs, setMetricConfigs] = useState<any[]>([]);
    const [hasUserConfig, setHasUserConfig] = useState(false);

    useEffect(() => {
        fetch('/api/statistics/global-averages')
            .then(res => res.json())
            .then(data => setGlobalStats(data))
            .catch(err => console.error("Failed to fetch global stats:", err));

        fetch('/api/metric-configs')
            .then(res => res.json())
            .then(data => setMetricConfigs(data.configs || []))
            .catch(err => console.error("Failed to fetch metric configs:", err));
    }, []);

    useEffect(() => {
        if (!playerId) return;
        const loadConfig = async () => {
            try {
                const res = await fetch(`/api/dashboard-config?player_id=${playerId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.config && data.config.length > 0) {
                        setCards(data.config);
                        setHasUserConfig(true);
                        setLastSaved(new Date(data.updated_at));
                    } else {
                        setHasUserConfig(false);
                    }
                } else {
                    setHasUserConfig(false);
                }
            } catch (e) {
                console.error("Failed to load dashboard config", e);
                setHasUserConfig(false);
            }
        };
        loadConfig();
    }, [playerId]);



    const saveDashboard = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/dashboard-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId, config: cards })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${res.status}`);
            }

            const data = await res.json();
            setLastSaved(new Date(data.updated_at));
            setHasUserConfig(true);
            setIsEditMode(false);
            alert("대시보드 설정이 저장되었습니다.");
        } catch (e: any) {
            console.error("Failed to save dashboard", e);
            alert(`저장에 실패했습니다: ${e.message}\n(데이터베이스 테이블이 생성되었는지 확인해주세요)`);
        } finally {
            setIsSaving(false);
        }
    };

    const discovery = useMemo(() => {
        const types: Record<string, Set<string>> = {};
        measurements.forEach(m => {
            const typeName = m.metrics?.testTypeName || m.metrics?.testType || m.test_type;
            if (!typeName) return;
            if (!types[typeName]) types[typeName] = new Set();
            // @ts-ignore
            const flatMetrics = { ...m.metrics, ...(m.metrics?.results || {}), ...(m.metrics?.resultFields || {}) };
            Object.keys(flatMetrics).forEach(key => {
                if (typeof flatMetrics[key] === 'number' && !IGNORE_KEYS.some(ig => key.toLowerCase().includes(ig))) {
                    types[typeName].add(key);
                }
            });
        });
        return {
            types: Object.keys(types).sort(),
            metrics: types
        };
    }, [measurements]);

    const addCard = (config: CardConfig) => {
        setCards([...cards, config]);
        setModalState({ open: false });
    };

    const updateCard = (id: string, updates: Partial<CardConfig>) => {
        setCards(cards.map(c => c.id === id ? { ...c, ...updates } : c));
        setModalState({ open: false });
    };

    const removeCard = (id: string) => {
        setCards(cards.filter(c => c.id !== id));
    };

    const moveCard = (id: string, direction: 'left' | 'right') => {
        const visibleCards = cards.filter(c => getDeviceForTestType(c.data.testType, metricConfigs) === activeDevice);
        const visibleIdx = visibleCards.findIndex(c => c.id === id);
        if (visibleIdx === -1) return;

        let targetId = null;
        if (direction === 'left' && visibleIdx > 0) {
            targetId = visibleCards[visibleIdx - 1].id;
        } else if (direction === 'right' && visibleIdx < visibleCards.length - 1) {
            targetId = visibleCards[visibleIdx + 1].id;
        }

        if (targetId) {
            const idx1 = cards.findIndex(c => c.id === id);
            const idx2 = cards.findIndex(c => c.id === targetId);
            const newCards = [...cards];
            [newCards[idx1], newCards[idx2]] = [newCards[idx2], newCards[idx1]];
            setCards(newCards);
        }
    };

    const editingCard = modalState.editId ? cards.find(c => c.id === modalState.editId) : undefined;
    const filteredCards = cards.filter(c => getDeviceForTestType(c.data.testType, metricConfigs) === activeDevice);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Settings2 size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">통합 성능 분석 & 커스텀 대시보드</h2>
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-slate-500 font-medium">자동 생성된 분석 카드를 확인하고, 원하는 분석 위젯을 추가하여 나만의 인사이트를 얻으세요.</p>
                            {lastSaved && <span className="text-xs text-slate-400">• 저장됨: {lastSaved.toLocaleTimeString()}</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isEditMode && (
                        <button
                            onClick={saveDashboard}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-green-200 disabled:opacity-50"
                        >
                            {isSaving ? '저장 중...' : '변경사항 저장'}
                        </button>
                    )}

                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${isEditMode
                            ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        {isEditMode ? <X size={18} /> : <Settings size={18} />}
                        {isEditMode ? '편집 취소/종료' : '대시보드 편집'}
                    </button>

                    <button
                        onClick={() => setModalState({ open: true })}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-shadow shadow-lg shadow-indigo-200 font-bold text-sm"
                    >
                        <Plus size={18} />
                        위젯 추가
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
                {DEVICE_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveDevice(tab.id)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeDevice === tab.id
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-12 gap-6 min-h-[400px]">
                {filteredCards.map((card, idx) => (
                    <div key={card.id} className={`${WIDTH_MAP[card.layout.width]} transition-all duration-300 relative group`}>
                        <AdvancedAnalysisCard card={card} measurements={measurements} globalStats={globalStats} playerLevel={playerLevel} />

                        {isEditMode && (
                            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] border-2 border-indigo-500 rounded-2xl z-20 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity animate-in fade-in">
                                <div className="bg-white p-2 rounded-xl shadow-xl flex items-center gap-1">
                                    <button
                                        onClick={() => moveCard(card.id, 'left')}
                                        disabled={idx === 0}
                                        className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                    <div className="w-px h-6 bg-slate-200"></div>
                                    <button
                                        onClick={() => setModalState({ open: true, editId: card.id })}
                                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg flex items-center gap-2 font-bold text-xs px-3"
                                    >
                                        <Edit2 size={16} /> 설정
                                    </button>
                                    <div className="w-px h-6 bg-slate-200"></div>
                                    <button
                                        onClick={() => removeCard(card.id)}
                                        className="p-2 hover:bg-red-50 text-red-500 rounded-lg"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <div className="w-px h-6 bg-slate-200"></div>
                                    <button
                                        onClick={() => moveCard(card.id, 'right')}
                                        disabled={idx === filteredCards.length - 1}
                                        className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30"
                                    >
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {filteredCards.length === 0 && (
                    <div className="col-span-12 h-[300px] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-4 bg-slate-50/50">
                        <div className="p-4 bg-white rounded-full shadow-sm">
                            <Layout size={32} className="text-slate-300" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-slate-600">위젯이 없습니다 ({activeDevice})</h3>
                            <p className="text-sm">우측 상단의 '위젯 추가' 버튼을 눌러 분석을 시작하거나, 다른 장비 탭을 선택하세요.</p>
                        </div>
                    </div>
                )}
            </div>

            {modalState.open && (
                <AdvancedConfigModal
                    isOpen={modalState.open}
                    onClose={() => setModalState({ open: false })}
                    onSave={(cfg) => modalState.editId ? updateCard(modalState.editId, cfg) : addCard({ ...cfg, id: `card-${Date.now()}` })}
                    initialData={editingCard}
                    discovery={discovery}
                    metricConfigs={metricConfigs}
                    activeDevice={activeDevice}
                />
            )}
        </div>
    );
}

// --- Card Component & Modal (Helper functions included from previous context, repeated here for completeness in write_to_file but abbreviated if exact same) ---
// I will include the full content of Card and Modal here to ensure the file is complete and correct.

const calculateLinearRegression = (data: any[], yKey: string) => {
    const n = data.length;
    if (n < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    data.forEach((point, i) => {
        const x = i;
        const y = Number(point[yKey]);
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map((point, i) => ({
        ...point,
        [`trend_${yKey}`]: slope * i + intercept
    }));
};

function AdvancedAnalysisCard({ card, measurements, globalStats, playerLevel }: { card: CardConfig, measurements: Measurement[], globalStats?: any, playerLevel?: string }) {
    const data = useMemo(() => {
        let filtered = measurements.filter(m => {
            const typeName = m.metrics?.testTypeName || m.metrics?.testType || m.test_type;
            if (typeName !== card.data.testType) return false;

            const d = new Date(m.recorded_at);
            if (card.data.filters?.startDate && d < new Date(card.data.filters.startDate)) return false;
            if (card.data.filters?.endDate && d > new Date(card.data.filters.endDate)) return false;

            return true;
        }).sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

        let mapped = filtered.map(m => {
            // @ts-ignore
            const flat = { ...m.metrics, ...(m.metrics?.results || {}), ...(m.metrics?.resultFields || {}) };
            const point: any = {
                date: SHORT_DATE_FORMAT(m.recorded_at),
                fullDate: m.recorded_at
            };
            card.data.metrics.forEach(metric => {
                point[metric.key] = Number(flat[metric.key] || 0);
            });
            return point;
        });

        if (card.visualization.showTrendline) {
            card.data.metrics.forEach(m => {
                const trendData = calculateLinearRegression(mapped, m.key);
                if (trendData) mapped = trendData;
            });
        }

        if (card.visualization.showAsymmetry && card.data.metrics.length >= 2) {
            const leftM = card.data.metrics[0];
            const rightM = card.data.metrics[1];

            mapped = mapped.map((d: any) => {
                const l = d[leftM.key] || 0;
                const r = d[rightM.key] || 0;
                const max = Math.max(Math.abs(l), Math.abs(r));
                const asym = max === 0 ? 0 : ((r - l) / max) * 100;
                return { ...d, asymmetry: asym, asymmetryAbs: Math.abs(asym) };
            });
        }

        return mapped;
    }, [card.data, card.visualization.showTrendline, card.visualization.showAsymmetry, measurements]);

    const stats = useMemo(() => {
        if (!data || data.length === 0) return {};
        const res: Record<string, { avg: number, max: number }> = {};
        card.data.metrics.forEach(m => {
            const values = data.map((d: any) => d[m.key] as number);
            const sum = values.reduce((a, b) => a + b, 0);
            res[m.key] = {
                avg: sum / values.length,
                max: Math.max(...values)
            };
        });
        return res;
    }, [data, card.data.metrics]);

    const ChartComponent = {
        'line': LineChart,
        'bar': BarChart,
        'area': AreaChart,
        'composed': ComposedChart
    }[card.visualization.type];

    const safeDomain = useMemo(() => {
        const d = card.visualization.yAxisDomain || ['auto', 'auto'];
        return [
            d[0] === 'auto' || d[0] === '' || isNaN(Number(d[0])) ? 'auto' : Number(d[0]),
            d[1] === 'auto' || d[1] === '' || isNaN(Number(d[1])) ? 'auto' : Number(d[1])
        ] as [number | 'auto', number | 'auto'];
    }, [card.visualization.yAxisDomain]);

    if (!data || data.length === 0) {
        return (
            <div className={`bg-white rounded-2xl border border-slate-200 ${HEIGHT_MAP[card.layout.height]} flex items-center justify-center text-slate-400 text-sm font-bold`}>
                데이터 없음 ({card.title})
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-6 ${HEIGHT_MAP[card.layout.height]} flex flex-col`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">{card.title}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{card.data.testType}</p>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ChartComponent data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: '#64748B' }}
                            axisLine={{ stroke: '#E2E8F0' }}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#64748B' }}
                            tickLine={false}
                            domain={safeDomain}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ stroke: '#CBD5E1', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        {card.visualization.showLegend && <Legend />}

                        {card.visualization.comparisons?.includes('avg') && card.data.metrics.map(m => (
                            <ReferenceLine key={`avg-${m.key}`} y={stats[m.key]?.avg} stroke={m.color} strokeDasharray="3 3" label={{ position: 'right', value: 'Avg', fill: m.color, fontSize: 10 }} />
                        ))}
                        {card.visualization.comparisons?.includes('max') && card.data.metrics.map(m => (
                            <ReferenceLine key={`max-${m.key}`} y={stats[m.key]?.max} stroke={m.color} strokeDasharray="5 5" label={{ position: 'right', value: 'Max', fill: m.color, fontSize: 10 }} />
                        ))}

                        {card.visualization.includeLevelAvg && globalStats && playerLevel && card.data.metrics.map(m => (
                            <ReferenceLine
                                key={`level-avg-${m.key}`}
                                y={globalStats[card.data.testType]?.[m.key]?.[playerLevel]}
                                stroke={m.color}
                                strokeWidth={2}
                                strokeDasharray="10 5"
                                // @ts-ignore
                                label={globalStats[card.data.testType]?.[m.key]?.[playerLevel] ? { position: 'insideRight', value: `Level Avg (${playerLevel})`, fill: m.color, fontSize: 10, fontWeight: 'bold' } : undefined}
                            />
                        ))}

                        {card.visualization.showAsymmetry && (
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#ef4444' }} axisLine={false} unit="%" domain={[-50, 50]} />
                        )}
                        {card.visualization.showAsymmetry && (
                            <Bar yAxisId="right" dataKey="asymmetry" name="L/R Asymmetry %" fill="#ef4444" fillOpacity={0.3} barSize={10} radius={[2, 2, 0, 0]} />
                        )}

                        {card.data.metrics.map((m, i) => {
                            const els = [];
                            if (card.visualization.showTrendline) {
                                els.push(
                                    <Line
                                        key={`trend-${m.key}`}
                                        type="monotone"
                                        dataKey={`trend_${m.key}`}
                                        stroke={m.color}
                                        strokeWidth={2}
                                        strokeDasharray="3 3"
                                        dot={false}
                                        name={`${m.label} (Trend)`}
                                        activeDot={false}
                                        strokeOpacity={0.6}
                                    />
                                );
                            }

                            if (card.visualization.type === 'line') {
                                els.push(<Line key={m.key} type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={3} dot={card.visualization.showDataPoints ? { r: 3, strokeWidth: 2, fill: '#fff' } : false} name={m.label} />);
                            } else if (card.visualization.type === 'bar') {
                                els.push(<Bar key={m.key} dataKey={m.key} fill={m.color} radius={[4, 4, 0, 0]} name={m.label} />);
                            } else if (card.visualization.type === 'area') {
                                els.push(<Area key={m.key} type="monotone" dataKey={m.key} fill={m.color} stroke={m.color} fillOpacity={0.2} name={m.label} />);
                            }
                            return els;
                        })}
                    </ChartComponent>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// Reuse existing Modal code exactly (omitted for brevity in prompt but MUST be here in file)
// ... I will paste the modal code from previous step to ensure it is there.

type DiscoveryData = {
    types: string[];
    metrics: Record<string, Set<string>>;
};

function AdvancedConfigModal({ isOpen, onClose, onSave, initialData, discovery, metricConfigs, activeDevice }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: CardConfig) => void;
    initialData?: CardConfig;
    discovery: DiscoveryData;
    metricConfigs: any[];
    activeDevice: string;
}) {
    const [tab, setTab] = useState<'data' | 'viz' | 'style'>('data');
    const [analysisType, setAnalysisType] = useState<'trend' | 'asymmetry'>(
        initialData?.visualization?.showAsymmetry ? 'asymmetry' : 'trend'
    );
    const [config, setConfig] = useState<Partial<CardConfig>>(initialData || {
        title: '새로운 분석',
        layout: { width: '1/3', height: 'md' },
        data: { testType: '', metrics: [], filters: {} },
        visualization: {
            type: 'line',
            showLegend: true,
            showTrendline: false,
            showDataPoints: true,
            comparisons: [],
            yAxisDomain: ['auto', 'auto']
        }
    });

    const filteredTestTypes = useMemo(() => {
        return discovery.types.filter(t => getDeviceForTestType(t, metricConfigs) === activeDevice);
    }, [discovery.types, activeDevice, metricConfigs]);

    useEffect(() => {
        if (!initialData && filteredTestTypes.length > 0 && !config.data?.testType) {
            updateConfig('data', 'testType', filteredTestTypes[0]);
        }
    }, [filteredTestTypes]);

    const updateConfig = (section: keyof CardConfig, key: string, value: any) => {
        setConfig(prev => ({
            ...prev,
            [section]: {
                // @ts-ignore
                ...prev[section],
                [key]: value
            }
        }));
    };

    const getConfiguredName = (key: string, testType: string) => {
        if (!metricConfigs || metricConfigs.length === 0) return key.replace(/([A-Z])/g, ' $1').trim();
        const match = metricConfigs.find(c =>
            c.metric_key === key &&
            (c.device === testType || c.test_category === testType || (testType === 'ForceDecks' && c.device === 'ForceDecks'))
        );
        return match ? match.display_name : key.replace(/([A-Z])/g, ' $1').trim();
    };

    const availableMetrics = config.data?.testType ? Array.from(discovery.metrics[config.data.testType] || []) : [];

    const addMetric = () => {
        const metrics = config.data?.metrics || [];
        const nextColor = COLORS[metrics.length % COLORS.length];
        updateConfig('data', 'metrics', [...metrics, { key: '', color: nextColor, label: '', axis: 'left' }]);
    };

    const setAsymmetryMetric = (side: 'left' | 'right', key: string) => {
        const currentMetrics = [...(config.data?.metrics || [])];
        const idx = side === 'left' ? 0 : 1;
        while (currentMetrics.length <= idx) {
            currentMetrics.push({ key: '', color: side === 'left' ? '#3B82F6' : '#F97316', label: side === 'left' ? 'Left' : 'Right', axis: 'left' });
        }
        currentMetrics[idx] = {
            ...currentMetrics[idx],
            key,
            label: getConfiguredName(key, config.data?.testType || '') || (side === 'left' ? 'Left' : 'Right')
        };
        updateConfig('data', 'metrics', currentMetrics);
        updateConfig('visualization', 'showAsymmetry', true);
        updateConfig('visualization', 'type', 'line');
    };

    const updateMetric = (idx: number, field: string, val: any) => {
        const metrics = [...(config.data?.metrics || [])];
        metrics[idx] = { ...metrics[idx], [field]: val };
        if (field === 'key' && !metrics[idx].label) {
            metrics[idx].label = getConfiguredName(val, config.data?.testType || '');
        }
        updateConfig('data', 'metrics', metrics);
    };

    const removeMetric = (idx: number) => {
        const metrics = [...(config.data?.metrics || [])];
        metrics.splice(idx, 1);
        updateConfig('data', 'metrics', metrics);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-slate-800">위젯 설정 ({activeDevice})</h3>
                        <p className="text-xs text-slate-500 font-medium">현재 선택된 장비에 대한 분석을 추가합니다.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <div className="flex gap-2 mb-8 bg-slate-50 p-1 rounded-xl">
                        {[{ id: 'data', label: '데이터' }, { id: 'viz', label: '차트 설정' }, { id: 'style', label: '스타일' }].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id as any)}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-6">
                        {tab === 'data' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm font-bold text-slate-500 mb-2 block">제목</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={config.title}
                                        onChange={e => setConfig(prev => ({ ...prev, title: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-500 mb-2 block">테스트 종류</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={config.data?.testType}
                                        onChange={e => {
                                            updateConfig('data', 'testType', e.target.value);
                                            updateConfig('data', 'metrics', []);
                                        }}
                                    >
                                        <option value="">선택하세요</option>
                                        {filteredTestTypes.map((t: string) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    {filteredTestTypes.length === 0 && (
                                        <p className="text-xs text-red-500 mt-2 font-medium">
                                            ⚠️ '{activeDevice}' 장비에 해당하는 데이터가 없습니다.
                                        </p>
                                    )}
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <label className="text-sm font-bold text-slate-500 mb-3 block">분석 유형</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="analysisType"
                                                checked={analysisType === 'trend'}
                                                onChange={() => {
                                                    setAnalysisType('trend');
                                                    updateConfig('visualization', 'showAsymmetry', false);
                                                }}
                                                className="w-4 h-4 text-blue-600"
                                            />
                                            <span className="font-bold text-slate-700">트렌드 (Trend)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="analysisType"
                                                checked={analysisType === 'asymmetry'}
                                                onChange={() => {
                                                    setAnalysisType('asymmetry');
                                                    updateConfig('visualization', 'showAsymmetry', true);
                                                }}
                                                className="w-4 h-4 text-blue-600"
                                            />
                                            <span className="font-bold text-slate-700">불균형 (Asymmetry)</span>
                                        </label>
                                    </div>
                                </div>

                                {analysisType === 'asymmetry' ? (
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-500 font-medium bg-blue-50 p-2 rounded-lg text-blue-600">
                                            ℹ️ 좌우 지표를 선택하면 자동으로 불균형(%)이 계산되어 표시됩니다.
                                        </p>
                                        <div>
                                            <label className="text-xs font-bold text-blue-500 mb-1 block">Left Metric</label>
                                            <select
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                                                value={config.data?.metrics?.[0]?.key || ''}
                                                onChange={e => setAsymmetryMetric('left', e.target.value)}
                                            >
                                                <option value="">Select Left Metric...</option>
                                                {availableMetrics.filter(m => m.toLowerCase().includes('left') || m.toLowerCase().includes('l_')).map(m => (
                                                    <option key={m} value={m}>{getConfiguredName(m, config.data?.testType || '')}</option>
                                                ))}
                                                <option disabled>--- Other Metrics ---</option>
                                                {availableMetrics.map(m => (
                                                    <option key={m} value={m}>{getConfiguredName(m, config.data?.testType || '')}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-orange-500 mb-1 block">Right Metric</label>
                                            <select
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                                                value={config.data?.metrics?.[1]?.key || ''}
                                                onChange={e => setAsymmetryMetric('right', e.target.value)}
                                            >
                                                <option value="">Select Right Metric...</option>
                                                {availableMetrics.filter(m => m.toLowerCase().includes('right') || m.toLowerCase().includes('r_')).map(m => (
                                                    <option key={m} value={m}>{getConfiguredName(m, config.data?.testType || '')}</option>
                                                ))}
                                                <option disabled>--- Other Metrics ---</option>
                                                {availableMetrics.map(m => (
                                                    <option key={m} value={m}>{getConfiguredName(m, config.data?.testType || '')}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-sm font-bold text-slate-500">지표 선택</label>
                                            <button onClick={addMetric} className="text-xs font-bold text-blue-500 hover:bg-blue-50 px-2 py-1 rounded">
                                                + 지표 추가
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {config.data?.metrics?.map((m: any, idx: number) => (
                                                <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                                                    <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: m.color }}></div>
                                                    <select
                                                        className="flex-1 bg-transparent text-sm font-semibold focus:outline-none"
                                                        value={m.key}
                                                        onChange={e => updateMetric(idx, 'key', e.target.value)}
                                                    >
                                                        <option value="">지표 선택...</option>
                                                        {availableMetrics.map((am: string) => <option key={am} value={am}>{getConfiguredName(am, config.data?.testType || '')}</option>)}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        placeholder="라벨"
                                                        className="w-24 bg-white px-2 py-1 text-xs rounded border border-slate-200"
                                                        value={m.label}
                                                        onChange={e => updateMetric(idx, 'label', e.target.value)}
                                                    />
                                                    <button onClick={() => removeMetric(idx)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded"><X size={14} /></button>
                                                </div>
                                            ))}
                                            {(!config.data?.metrics || config.data.metrics.length === 0) && (
                                                <p className="text-center text-xs text-slate-400 py-4">지표를 추가해주세요.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'viz' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm font-bold text-slate-500 mb-2 block">차트 종류</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['line', 'bar', 'area'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => updateConfig('visualization', 'type', type)}
                                                className={`py-3 rounded-xl border font-bold text-sm capitalize ${config.visualization?.type === type
                                                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.visualization?.showLegend}
                                            onChange={e => updateConfig('visualization', 'showLegend', e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        범례 표시 (Legend)
                                    </label>
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.visualization?.showDataPoints ?? true}
                                            onChange={e => updateConfig('visualization', 'showDataPoints', e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        데이터 포인트 표시 (Dots)
                                    </label>
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.visualization?.showTrendline}
                                            onChange={e => updateConfig('visualization', 'showTrendline', e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        추세선 표시 (Trendline)
                                    </label>
                                    <div>
                                        <label className="text-sm font-bold text-slate-500 mb-2 block mt-2">Y축 범위 (Y-Axis Domain)</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Min (Current: Auto)"
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 text-sm"
                                                    value={config.visualization?.yAxisDomain?.[0] === 'auto' ? '' : config.visualization?.yAxisDomain?.[0]}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        const currentDomain = config.visualization?.yAxisDomain || ['auto', 'auto'];
                                                        updateConfig('visualization', 'yAxisDomain', [val === '' ? 'auto' : val, currentDomain[1]]);
                                                    }}
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1">최소값 (비워두면 Auto)</p>
                                            </div>
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Max (Current: Auto)"
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 text-sm"
                                                    value={config.visualization?.yAxisDomain?.[1] === 'auto' ? '' : config.visualization?.yAxisDomain?.[1]}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        const currentDomain = config.visualization?.yAxisDomain || ['auto', 'auto'];
                                                        updateConfig('visualization', 'yAxisDomain', [currentDomain[0], val === '' ? 'auto' : val]);
                                                    }}
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1">최대값 (비워두면 Auto)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-slate-500 mb-2 block">비교/참조 (Comparison)</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={config.visualization?.comparisons?.includes('avg')}
                                                onChange={e => {
                                                    const cur = config.visualization?.comparisons || [];
                                                    updateConfig('visualization', 'comparisons', e.target.checked ? [...cur, 'avg'] : cur.filter(c => c !== 'avg'));
                                                }}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            평균값 표시 (Avg)
                                        </label>
                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={config.visualization?.comparisons?.includes('max')}
                                                onChange={e => {
                                                    const cur = config.visualization?.comparisons || [];
                                                    updateConfig('visualization', 'comparisons', e.target.checked ? [...cur, 'max'] : cur.filter(c => c !== 'max'));
                                                }}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            최대값 표시 (Max)
                                        </label>
                                    </div>
                                    <div className="mt-4 flex flex-col gap-2">
                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={config.visualization?.includeLevelAvg ?? false}
                                                onChange={e => updateConfig('visualization', 'includeLevelAvg', e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            비슷한 수준 평균 비교 (Level Avg)
                                        </label>
                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={config.visualization?.showAsymmetry ?? false}
                                                onChange={e => updateConfig('visualization', 'showAsymmetry', e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-300 text-red-500 focus:ring-red-500"
                                            />
                                            좌우 불균형 분석 (Asymmetry %)
                                            <span className="text-[10px] text-slate-400 font-normal ml-1">* Requires 2 metrics</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {tab === 'style' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm font-bold text-slate-500 mb-2 block">너비 (Width)</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['1/3', '1/2', '2/3', 'full'].map(w => (
                                            <button
                                                key={w}
                                                onClick={() => updateConfig('layout', 'width', w)}
                                                className={`py-2 rounded-lg border text-sm font-bold ${config.layout?.width === w
                                                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                                                    : 'border-slate-200 text-slate-500'
                                                    }`}
                                            >
                                                {w}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-500 mb-2 block">높이 (Height)</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['sm', 'md', 'lg'].map(h => (
                                            <button
                                                key={h}
                                                onClick={() => updateConfig('layout', 'height', h)}
                                                className={`py-2 rounded-lg border text-sm font-bold ${config.layout?.height === h
                                                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                                                    : 'border-slate-200 text-slate-500'
                                                    }`}
                                            >
                                                {h.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">
                        취소
                    </button>
                    <button
                        onClick={() => onSave(config as CardConfig)}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all transform active:scale-95"
                    >
                        저장하기
                    </button>
                </div>
            </div>
        </div>
    );
}
