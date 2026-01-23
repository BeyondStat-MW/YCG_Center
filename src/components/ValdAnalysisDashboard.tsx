'use client';

import { useMemo, useState, useEffect } from 'react';
import { Activity, TrendingUp, Scale, Zap, Target, Timer, Footprints, Ruler, Dumbbell } from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

type Measurement = {
    id: string;
    recorded_at: string;
    test_type: string;
    metrics: any;
};

// --- CONFIGURATION ---

const KNOWN_CONFIGS: any = {
    'CMJ': [
        { type: 'trend', title: 'Countermovement Jump', subtitle: 'Jump Height (Imp-Mom)', keys: ['JumpHeight(Imp-Mom)', 'Jump Height (Imp-Mom)', 'Jump Height'], unit: 'cm', icon: Activity },
        { type: 'trend', title: 'Countermovement Jump', subtitle: 'RSI-mod', keys: ['RSI-modified', 'rsiModified'], unit: 'm/s', icon: Zap },
    ],
    'SJ': [
        { type: 'trend', title: 'Squat Jump', subtitle: 'Jump Height (Imp-Mom)', keys: ['JumpHeight(Imp-Mom)', 'Jump Height (Imp-Mom)', 'Jump Height'], unit: 'cm', icon: Activity },
        { type: 'trend', title: 'Squat Jump', subtitle: 'RSI-mod', keys: ['RSI-modified', 'rsiModified'], unit: 'm/s', icon: Zap },
    ],
    'Hip AD/AB': [
        { type: 'asym', title: 'Hip Adduction', subtitle: 'Max Force', leftKeys: ['leftMaxForce', 'Max Force (Left)', 'innerLeftMaxForce'], rightKeys: ['rightMaxForce', 'Max Force (Right)', 'innerRightMaxForce'], unit: 'N', icon: Scale },
        { type: 'asym', title: 'Hip Abduction', subtitle: 'Max Force', leftKeys: ['abdLeftMaxForce', 'outerLeftMaxForce'], rightKeys: ['abdRightMaxForce', 'outerRightMaxForce'], unit: 'N', icon: Scale }
    ],
    'Sprint': [
        { type: 'trend', title: 'Sprint', subtitle: '10m Time', keys: ['splitOne', '0-10m'], unit: 's', icon: Timer },
        { type: 'trend', title: 'Sprint', subtitle: '20m Time', keys: ['totalTimeSeconds', 'time', 'Total Time', '0-20m'], unit: 's', icon: Timer },
        { type: 'trend', title: 'Sprint', subtitle: 'Max Velocity', keys: ['peakVelocityMetersPerSecond', 'maxVelocity'], unit: 'm/s', icon: Zap }
    ]
};

// Keywords to ignore when auto-detecting trend keys
const IGNORE_KEYS = ['id', 'test', 'date', 'profile', 'valid', 'notes', 'device', 'version', 'pct', 'count', 'idx', 'impulse', 'repetition', 'weight', 'duration', 'mass', 'bmi', 'timestamp'];

export default function ValdAnalysisDashboard({ measurements }: { measurements: Measurement[] }) {
    const [metricConfigs, setMetricConfigs] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('ForceDecks');

    useEffect(() => {
        fetch('/api/metric-configs')
            .then(res => res.json())
            .then(data => setMetricConfigs(data.configs || []))
            .catch(err => console.error(err));
    }, []);

    const getConfiguredName = (key: string, device: string, defaultName: string) => {
        if (!metricConfigs.length) return defaultName;
        // Try to find exact match first
        let match = metricConfigs.find(c => c.metric_key === key && (c.device === device || c.test_category === device));
        // If not found, try lax match if device is generic
        if (!match) match = metricConfigs.find(c => c.metric_key === key);

        return match ? match.display_name : defaultName;
    };

    const cards = useMemo(() => {
        const generatedCards: any[] = [];

        // 1. Group Measurements strictly by Test Name
        const groups: Record<string, Measurement[]> = {};

        measurements.forEach(m => {
            let key = m.test_type;
            const subName = m.metrics?.testTypeName || m.metrics?.test_name || m.metrics?.testType;
            const lowerSub = subName ? subName.toLowerCase() : '';

            if (lowerSub === 'sj' || lowerSub === 'squat jump') {
                key = 'SJ';
            } else if (lowerSub === 'cmj' || lowerSub === 'countermovement jump') {
                key = 'CMJ';
            } else if (subName && m.test_type !== 'SmartSpeed') {
                key = `${m.test_type}:${subName.replace('/', '_')}`;
            }

            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
        });

        Object.entries(groups).forEach(([groupKey, groupMs]) => {
            const sortedMs = groupMs.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

            // Normalize category for DB lookup (matches display name logic)
            const displayTitle = groupKey.includes(':') ? groupKey.split(':')[1].replace(/_/g, '/') : groupKey;

            let configs: any[] = [];
            for (const [cfgKey, cfgList] of Object.entries(KNOWN_CONFIGS)) {
                if (groupKey.includes(cfgKey)) {
                    configs = cfgList as any[];
                    break;
                }
            }

            if (configs.length > 0) {
                configs.forEach((cfg: any) => {
                    const cardData = extractCardData(cfg, sortedMs);
                    if (cardData) {
                        // Apply Configured Name
                        // We don't know exactly which key matched in extractCardData without modifying it, 
                        // but we can check cfg.keys for any match in configs
                        let foundName = cfg.subtitle;
                        if (cfg.keys) {
                            for (const k of cfg.keys) {
                                const name = getConfiguredName(k, groupKey, '');
                                if (name) { foundName = name; break; }
                            }
                        }
                        generatedCards.push({ ...cardData, subtitle: foundName, id: `${groupKey}-${cfg.subtitle}`, testCategory: displayTitle });
                    }
                });
                return;
            }

            // ForceDecks: 정의된 카드(CMJ, SJ) 외에는 자동 생성 차단
            const FD_KEYWORDS = ['CMJ', 'SJ', 'Jump', 'Hop', 'Land', 'Iso', 'IMTP'];
            if (FD_KEYWORDS.some(k => groupKey.includes(k))) {
                return;
            }

            const latestM = sortedMs[sortedMs.length - 1];
            // @ts-ignore
            const metrics = { ...latestM.metrics, ...(latestM.metrics?.results || {}), ...(latestM.metrics?.resultFields || {}), ...(latestM.metrics?.gateSummaryFields || {}) };


            const baseIcon = getIconForType(groupKey);

            const numericKeys = Object.keys(metrics).filter(k => typeof metrics[k] === 'number' && !IGNORE_KEYS.some(ig => k.toLowerCase().includes(ig)));
            const leftKey = numericKeys.find(k => k.toLowerCase().includes('left'));

            if (leftKey) {
                let rightKey = leftKey.replace('Left', 'Right').replace('left', 'right');
                if (metrics[rightKey] === undefined) {
                    rightKey = numericKeys.find(k => k.toLowerCase().includes('right') && Math.abs(k.length - leftKey.length) < 5) || '';
                }

                if (rightKey && metrics[rightKey] !== undefined) {
                    const autoCfg = { type: 'asym', title: displayTitle, subtitle: cleanKeyName(leftKey).replace('Left', '').trim() || 'Metric', leftKeys: [leftKey], rightKeys: [rightKey], unit: guessUnit(leftKey), icon: baseIcon };
                    const cardData = extractCardData(autoCfg, sortedMs);
                    if (cardData) {
                        const configuredSub = getConfiguredName(leftKey, groupKey, autoCfg.subtitle);
                        generatedCards.push({ ...cardData, subtitle: configuredSub, id: `${groupKey}-auto-asym`, testCategory: displayTitle });
                    }
                    return;
                }
            }

            const valueKey = numericKeys.find(k => !IGNORE_KEYS.some(ig => k.toLowerCase().includes(ig)) && !k.toLowerCase().includes('difference') && !k.toLowerCase().includes('left') && !k.toLowerCase().includes('right'));

            if (valueKey) {
                const autoCfg = { type: 'trend', title: displayTitle, subtitle: cleanKeyName(valueKey), keys: [valueKey], unit: guessUnit(valueKey), icon: baseIcon };
                const cardData = extractCardData(autoCfg, sortedMs);
                if (cardData) {
                    const configuredSub = getConfiguredName(valueKey, groupKey, autoCfg.subtitle);
                    generatedCards.push({ ...cardData, subtitle: configuredSub, id: `${groupKey}-auto-trend`, testCategory: displayTitle });
                }
            }
        });



        return generatedCards;
    }, [measurements, metricConfigs]);

    // 2. Group Cards by Device Category
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const deviceGroups = useMemo(() => {
        const groups: Record<string, any[]> = {
            'NordBord': [],
            'ForceFrame': [],
            'ForceDecks': [],
            'SmartSpeed': [],
            'DynaMo': [],
            'Manual': []
        };
        const EXPLICIT_MAPPING: Record<string, string[]> = {
            'DynaMo': ['Dorsiflexion (ROM)', 'Dorsiflexion (Strength)', 'Eversion (ROM)', 'Eversion (Strength)', 'Extension (ROM)', 'Extension (Strength)', 'External Rotation (ROM)', 'Flexion (ROM)', 'Flexion (Strength)', 'Internal Rotation (ROM)', 'Inversion (ROM)', 'Inversion (Strength)', 'Plantar Flexion (ROM)', 'Plantar Flexion (Strength)', 'Toe Extension (Strength)'],
            'ForceDecks': ['ABCMJ', 'CMJ', 'CMRJ', 'DJ', 'HJ', 'ISOSQT', 'LAH', 'LCMJ', 'LSJ', 'QSB', 'RSAIP', 'RSHIP', 'RSKIP', 'SJ', 'SLCMRJ', 'SLDJ', 'SLHAR', 'SLHJ', 'SLJ', 'SLLAH', 'SLROSB', 'SLSB'],
            'ForceFrame': ['Ankle IN/EV', 'Hip AD/AB', 'Hip Extension', 'Hip Flexion', 'Hip IR/ER', 'Knee Extension', 'Shoulder Extension', 'Shoulder Flexion', 'Shoulder IR/ER', 'hip flexion'],
            'NordBord': ['ISO 30', 'ISO 60', 'ISO Prone', 'Nordic'],
            'SmartSpeed': ['10m Sprint', '20m Sprint', '20m(10-10) Interval (YCG)', '30m Repeat Sprint Ability Test', '5-0-5 Drill', 'L-Drill', 'Pro Agility Drill 5-10-5', 'Y-Agility (1-1-2)'],
            'Manual': ['Manual']
        };
        const explicitMap = new Map<string, string>();
        Object.entries(EXPLICIT_MAPPING).forEach(([dev, tests]) => tests.forEach(t => explicitMap.set(normalize(t), dev)));

        const deviceMap = new Map<string, string>();
        metricConfigs.forEach(c => {
            if (c.test_category && c.device) deviceMap.set(normalize(c.test_category), c.device);
            if (c.test_type && c.device) deviceMap.set(normalize(c.test_type), c.device);
        });

        cards.forEach((card: any) => {
            let device = '';
            const normCat = normalize(card.testCategory || '');
            const normTitle = normalize(card.title || '');
            if (explicitMap.has(normCat)) device = explicitMap.get(normCat)!;
            else if (explicitMap.has(normTitle)) device = explicitMap.get(normTitle)!;
            else if (deviceMap.has(normCat)) device = deviceMap.get(normCat)!;
            else if (deviceMap.has(normTitle)) device = deviceMap.get(normTitle)!;

            if (device && groups[device]) { groups[device].push(card); return; }

            const combined = `${card.title} ${card.subtitle}`.toLowerCase();
            if (combined.includes('manual')) groups['Manual'].push(card);
            else if (combined.includes('nordbord') || combined.includes('nordic') || combined.includes('hamstring') || combined.includes('razor') || combined.includes('prone')) groups['NordBord'].push(card);
            else if (combined.includes('forceframe') || combined.includes('hip') || combined.includes('adduct') || combined.includes('abduct') || combined.includes('shoulder') || combined.includes('groin') || combined.includes('knee flex')) groups['ForceFrame'].push(card);
            else if (combined.includes('dynamo') || combined.includes('grip') || combined.includes('valddynamo') || combined.includes('rom') || combined.includes('range of motion') || combined.includes('knee ext')) groups['DynaMo'].push(card);
            else if (combined.includes('smartspeed') || combined.includes('sprint') || combined.includes('speed') || combined.includes('agility')) groups['SmartSpeed'].push(card);
            else groups['ForceDecks'].push(card);
        });
        return groups;
    }, [cards, metricConfigs]);

    if (!cards.length) return <div className="p-8 text-center text-slate-400" > No analysis data available.</div>;

    const DEVICE_SECTIONS = [
        { key: 'ForceDecks', label: 'ForceDecks', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
        { key: 'NordBord', label: 'NordBord', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { key: 'ForceFrame', label: 'ForceFrame', icon: Scale, color: 'text-orange-600', bg: 'bg-orange-50' },
        { key: 'SmartSpeed', label: 'SmartSpeed', icon: Timer, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { key: 'DynaMo', label: 'DynaMo', icon: Ruler, color: 'text-purple-600', bg: 'bg-purple-50' },
        { key: 'Manual', label: 'Manual', icon: Dumbbell, color: 'text-slate-600', bg: 'bg-slate-50' }
    ];

    const activeSection = DEVICE_SECTIONS.find(s => s.key === activeTab) || DEVICE_SECTIONS[0];
    const sectionCards = deviceGroups[activeTab] || [];

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
                {DEVICE_SECTIONS.map(section => (
                    <button
                        key={section.key}
                        onClick={() => setActiveTab(section.key)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === section.key
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                            }`}
                    >
                        <section.icon size={16} className={activeTab === section.key ? section.color : ''} />
                        {section.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-[#F8FAFC] p-8 rounded-3xl border border-slate-200 shadow-sm min-h-[400px]">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-6">
                    <div className={`p-2 rounded-lg ${activeSection.bg} ${activeSection.color} shadow-sm`}>
                        <activeSection.icon size={20} />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">{activeSection.label} Analysis</h2>
                    <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-full border border-slate-100">{sectionCards.length} Charts</span>
                </div>

                {sectionCards.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {sectionCards.map((card: any) => (
                            <ValdCard key={card.id} card={card} />
                        ))}
                    </div>
                ) : (
                    <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 gap-4 border-2 border-dashed border-slate-200 rounded-2xl">
                        <activeSection.icon size={32} className="text-slate-200" />
                        <p className="font-medium">No data available for {activeSection.label}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- HELPER FUNCTIONS ---

const extractCardData = (cfg: any, sortedMs: Measurement[]) => {
    const fmt = (d: string) => new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\./g, '.').slice(0, -1).trim();

    if (cfg.type === 'trend') {
        const history = sortedMs.map(m => {
            let val = 0;
            // @ts-ignore
            const metrics = { ...m.metrics, ...(m.metrics?.results || {}), ...(m.metrics?.resultFields || {}), ...(m.metrics?.gateSummaryFields || {}) };
            for (const k of cfg.keys || []) {
                if (metrics[k] !== undefined && metrics[k] !== null) { val = Number(metrics[k]); break; }
            }
            return { date: fmt(m.recorded_at), rawDate: m.recorded_at, value: val };
        }).filter(h => !isNaN(h.value) && h.value !== 0);

        if (history.length === 0) return null;
        const latest = history[history.length - 1];
        return { ...cfg, data: latest.value, history: history.slice(-12), date: latest.rawDate };
    } else {
        const history = sortedMs.map(m => {
            let l = 0, r = 0;
            // @ts-ignore
            const metrics = { ...m.metrics, ...(m.metrics?.results || {}), ...(m.metrics?.resultFields || {}), ...(m.metrics?.gateSummaryFields || {}) };
            for (const k of cfg.leftKeys || []) if (metrics[k] !== undefined) { l = Number(metrics[k]); break; }
            for (const k of cfg.rightKeys || []) if (metrics[k] !== undefined) { r = Number(metrics[k]); break; }

            if (l > 0 && r > 0) return { date: fmt(m.recorded_at), rawDate: m.recorded_at, left: l, right: r };
            return null;
        }).filter(item => item !== null) as any[];

        if (history.length === 0) return null;
        const latest = history[history.length - 1];
        return { ...cfg, left: latest.left, right: latest.right, date: latest.rawDate, history: history.slice(-12) };
    }
};

const getIconForType = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('jump')) return Activity;
    if (t.includes('force') || t.includes('iso')) return Scale;
    if (t.includes('sprint') || t.includes('speed') || t.includes('agility')) return Timer;
    if (t.includes('nord')) return TrendingUp;
    if (t.includes('hop')) return Footprints;
    if (t.includes('rom') || t.includes('dorsiflexion')) return Ruler;
    return Activity;
};

const cleanKeyName = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/[_\.]/g, ' ').replace(/\(.*\)/g, '').trim();
};

const guessUnit = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('force') || k.includes('peak')) return 'N';
    if (k.includes('time')) return 's';
    if (k.includes('height')) return 'cm';
    if (k.includes('dist')) return 'm';
    if (k.includes('velocity') || k.includes('speed')) return 'm/s';
    if (k.includes('angle') || k.includes('rom')) return '°';
    return '';
};


// --- CARD COMPONENT ---

const ValdCard = ({ card }: { card: any }) => {
    const Icon = card.icon;
    const dateStr = card.date ? new Date(card.date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '.').slice(0, -1) : '-';

    // Trend Card - Single Line
    if (card.type === 'trend') {
        const lastVal = card.data;
        const vals = card.history.map((h: any) => h.value);
        const min = Math.min(...vals) * 0.95;
        const max = Math.max(...vals) * 1.05;

        const maxValInHistory = Math.max(...vals);

        let pctChange = 0;
        if (card.history.length > 1) {
            const first = card.history[0].value;
            if (first !== 0) {
                pctChange = ((lastVal - first) / first) * 100;
            }
        }

        return (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all flex flex-col justify-between h-full group relative">
                <div className="absolute top-4 right-4 text-[10px] font-black text-slate-300 bg-slate-50 px-2 py-1 rounded-md">{dateStr}</div>
                <div>
                    <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 bg-slate-50 rounded-lg text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors"><Icon size={24} /></div>
                        <div className="pr-12">
                            <h3 className="font-bold text-slate-900 leading-tight">{card.title}</h3>
                            <p className="text-xs text-slate-500 font-medium">{card.subtitle}</p>
                        </div>
                    </div>
                    <div className="flex items-end justify-between mb-4">
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-800 tracking-tight">{lastVal.toFixed(1)}</span>
                            <span className="text-xs font-bold text-slate-400">{card.unit}</span>
                        </div>
                        {card.history.length > 1 && (
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Max: {maxValInHistory.toFixed(1)}</span>
                                <div className={`px-2 py-1 text-[10px] font-black rounded border flex items-center gap-1 ${pctChange >= 0 ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                    {pctChange >= 0 ? '↑' : '↓'} {Math.abs(pctChange).toFixed(1)}% (vs First)
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="h-24 w-full">
                    <Line
                        data={{
                            labels: card.history.map((h: any) => h.date),
                            datasets: [{
                                data: card.history.map((h: any) => h.value),
                                borderColor: '#3B82F6',
                                borderWidth: 3,
                                pointRadius: 3,
                                pointBackgroundColor: '#3B82F6',
                                tension: 0.3
                            }]
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: { padding: 10 },
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    callbacks: { label: (ctx) => `${Number(ctx.parsed.y).toFixed(1)} ${card.unit}` }
                                }
                            },
                            scales: {
                                x: { display: false },
                                y: { display: false, min, max }
                            }
                        }}
                    />
                </div>
            </div>
        );
    }

    // Asymmetry Card - Double Line
    const diff = Math.abs(card.left - card.right);
    const maxVal = Math.max(card.left, card.right);
    const asym = maxVal > 0 ? (diff / maxVal) * 100 : 0;
    const isLeftDom = card.left > card.right;
    const asymPercent = asym.toFixed(1);

    const vals = card.history.flatMap((h: any) => [h.left, h.right]);
    const min = Math.min(...vals) * 0.95;
    const max = Math.max(...vals) * 1.05;

    let leftPctChange = 0;
    let rightPctChange = 0;
    if (card.history.length > 1) {
        const prev = card.history[card.history.length - 2];
        leftPctChange = ((card.left - prev.left) / prev.left) * 100;
        rightPctChange = ((card.right - prev.right) / prev.right) * 100;
    }

    return (

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all h-full group relative flex flex-col overflow-hidden">
            <div className="absolute top-4 right-4 text-[10px] font-black text-slate-300 bg-slate-50 px-2 py-1 rounded-md">{dateStr}</div>

            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 bg-slate-50 rounded-lg text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <Icon size={20} />
                </div>
                <div className="pr-12">
                    <h3 className="font-bold text-slate-900 leading-tight text-sm">{card.title}</h3>
                    <p className="text-[11px] text-slate-500 font-medium">{card.subtitle}</p>
                </div>
            </div>

            {/* Stats Row (Above Chart) */}
            <div className="grid grid-cols-2 gap-4 mb-4 px-1">
                <div className="relative pl-3 border-l-2 border-blue-500">
                    <span className="text-[10px] font-bold text-blue-500 block mb-0.5 uppercase tracking-wider">Left</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-800">{card.left.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-400">{card.unit}</span>
                    </div>
                    {card.history.length > 1 && (
                        <div className={`text-[9px] font-bold flex items-center gap-1 ${leftPctChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {leftPctChange >= 0 ? '↑' : '↓'} {Math.abs(leftPctChange).toFixed(1)}%
                        </div>
                    )}
                </div>
                <div className="relative pl-3 border-l-2 border-orange-500">
                    <span className="text-[10px] font-bold text-orange-500 block mb-0.5 uppercase tracking-wider">Right</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-800">{card.right.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-400">{card.unit}</span>
                    </div>
                    {card.history.length > 1 && (
                        <div className={`text-[9px] font-bold flex items-center gap-1 ${rightPctChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {rightPctChange >= 0 ? '↑' : '↓'} {Math.abs(rightPctChange).toFixed(1)}%
                        </div>
                    )}
                </div>
            </div>

            {/* Chart Row (Full Width) */}
            <div className="flex-1 w-full min-h-[160px] relative">
                <Line
                    data={{
                        labels: card.history.map((h: any) => h.date),
                        datasets: [
                            { label: 'Left', data: card.history.map((h: any) => h.left), borderColor: '#3B82F6', borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#3B82F6', tension: 0.3 },
                            { label: 'Right', data: card.history.map((h: any) => h.right), borderColor: '#F97316', borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#F97316', tension: 0.3 }
                        ]
                    }}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: { top: 10, bottom: 10, left: 0, right: 0 } },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                                callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} ${card.unit}` }
                            }
                        },
                        scales: {
                            x: { display: false },
                            y: { display: false, min: min * 0.9, max: max * 1.1 }
                        }
                    }}
                />
            </div>

            {/* Asym Bar Graph (Footer) */}
            <div className="mt-4 flex flex-col gap-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span>Left Dom.</span>
                    <span className={`${asym > 10 ? 'text-rose-500' : 'text-slate-600'}`}>Asym: {asymPercent}%</span>
                    <span>Right Dom.</span>
                </div>
                <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    {/* Center Marker */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-slate-300 -ml-[1px] z-10"></div>

                    {/* Bar */}
                    <div
                        className={`absolute top-0 bottom-0 transition-all duration-500 ${isLeftDom ? 'bg-blue-500 right-1/2 rounded-l-full' : 'bg-orange-500 left-1/2 rounded-r-full'}`}
                        style={{ width: `${Math.min(asym, 50)}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
