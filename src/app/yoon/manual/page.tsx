
'use client';

import { useState, useEffect } from 'react';
import {
    Users, Edit3, Save, Search,
    CheckCircle2, History, Database,
    Dumbbell, Wind, Info, Activity,
    Clock, PlusCircle, X
} from 'lucide-react';
import { clsx } from 'clsx';

type Player = {
    id: string;
    name: string;
    position: string;
    birthdate: string;
    phone: string;
    event: string;
    level: string;
    height: number;
    weight: number;
    team: string;
    gender?: string;
    vald_id?: string;
};

export default function ManualEntryPage() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlayers();
    }, []);

    const fetchPlayers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/players');
            const data = await res.json();
            setPlayers(data || []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    return (
        <div className="w-full max-w-full space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[calc(100vh-160px)] flex flex-col">
                <ManualEntry players={players} />
            </div>
        </div>
    );
}

function ManualEntry({ players }: { players: Player[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [success, setSuccess] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'body' | 'stats' | 'rehab' | 'history'>('body');
    const [statsSubTab, setStatsSubTab] = useState<'ronpick' | 'high_altitude'>('ronpick');

    // Stats Data
    // Stats Data
    const [formData, setFormData] = useState({
        // Body
        height: '', weight: '', bodyFat: '', muscleMass: '',
        // Ronpick
        ron_shoulder: '', ron_bench: '', ron_latpulldown: '', ron_deadlift: '',
    });

    // High Altitude Data (Dynamic Metric x Protocol Matrix)
    const [haData, setHaData] = useState<Record<string, string>>({});

    const [intervals, setIntervals] = useState<{ id: string, name: string }[]>([]);

    const addInterval = () => setIntervals([...intervals, { id: Math.random().toString(36).substr(2, 9), name: '' }]);
    const removeInterval = (id: string) => {
        setIntervals(intervals.filter(i => i.id !== id));
        // Optional: Clean up haData for this id to prevent memory leaks if many created
        const newHaData = { ...haData };
        ['HRR', 'SPOC', 'SPO2'].forEach(m => delete newHaData[`${m}_${id}`]);
        setHaData(newHaData);
    };
    const updateIntervalName = (id: string, val: string) => {
        setIntervals(intervals.map(i => i.id === id ? { ...i, name: val } : i));
    };

    const updateHaValue = (metric: string, protocolId: string, val: string) => {
        setHaData(prev => ({ ...prev, [`${metric}_${protocolId}`]: val }));
    };

    // History Data
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [globalHistory, setGlobalHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (selectedPlayer && activeTab === 'history') {
            fetchHistory();
        } else if (!selectedPlayer) {
            fetchGlobalHistory();
        }
    }, [selectedPlayer, activeTab]);

    const fetchHistory = async () => {
        if (!selectedPlayer) return;
        setLoadingHistory(true);
        try {
            const res = await fetch(`/api/measurements?player_id=${selectedPlayer.id}&period=all`);
            const data = await res.json();
            setHistoryData(data.measurements || []);
        } catch (e) {
            console.error(e);
        }
        setLoadingHistory(false);
    };

    const fetchGlobalHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await fetch('/api/measurements?period=30d');
            const data = await res.json();

            // Format data for easier verification
            const formatted = (data.measurements || []).map((m: any) => {
                let displayMetric = m.metric;
                let displayValue = m.value;

                // If it's a rehab entry, it might have metrics object
                if (m.test_type === 'rehab' && m.metrics) {
                    displayMetric = 'Rehab Chart';
                    displayValue = m.metrics.diagnosis || '진단내용 포함';
                }

                return { ...m, displayMetric, displayValue };
            });

            setGlobalHistory(formatted.slice(0, 50));
        } catch (e) {
            console.error(e);
        }
        setLoadingHistory(false);
    };

    // Rehab Data
    const [rehabData, setRehabData] = useState({
        diagnosis: '', trainer: '윤청구', injuryDate: '', diagnosisDate: '', rehabDate: '', returnDate: '', programCount: '',
        injuryMechanism: '',
        problems: ['', '', '', '', '', ''],
        painVas: '', injuryHistory: '', painMovements: '', plan: '', etc: ''
    });

    const filteredPlayers = players.filter(p =>
        p.name !== '_UNLINKED_HOLDER_' &&
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePlayerSelect = (player: Player) => {
        setSelectedPlayer(player);
        setSearchTerm('');
        setFormData(prev => ({
            ...prev,
            height: player.height ? String(player.height) : '',
            weight: player.weight ? String(player.weight) : ''
        }));
    };

    const handleProblemChange = (idx: number, val: string) => {
        const newProb = [...rehabData.problems];
        newProb[idx] = val;
        setRehabData({ ...rehabData, problems: newProb });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlayer) return;

        setSaving(true);
        try {
            if (activeTab === 'body' || activeTab === 'stats') {
                const metrics = [
                    // Body Info
                    { metric: '신장', value: formData.height, unit: 'cm' },
                    { metric: '체중', value: formData.weight, unit: 'kg' },
                    { metric: '체지방량', value: formData.bodyFat, unit: 'kg' },
                    { metric: '근육량', value: formData.muscleMass, unit: 'kg' },
                    // Ronpick (1RM)
                    { metric: '1RM Shoulder', value: formData.ron_shoulder, unit: 'kg' },
                    { metric: '1RM Bench', value: formData.ron_bench, unit: 'kg' },
                    { metric: '1RM Latpull down', value: formData.ron_latpulldown, unit: 'kg' },
                    { metric: '1RM Deadlift', value: formData.ron_deadlift, unit: 'kg' },
                    // High Altitude
                    // High Altitude
                    ...['HRR', 'SPOC', 'SPO2'].flatMap(metric => {
                        const protocols = [
                            { id: '6-12', name: '6-12' },
                            { id: '20-10', name: '20-10' },
                            { id: '30-30', name: '30-30' },
                            ...intervals
                        ];
                        return protocols.map(p => ({
                            metric: `${metric} (${p.name || '미지정'})`,
                            value: haData[`${metric}_${p.id}`],
                            unit: metric === 'HRR' ? 'bpm' : '%'
                        }));
                    })
                ].filter(m => m.value !== '');

                for (const m of metrics) {
                    await fetch('/api/measurements/manual', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            playerId: selectedPlayer.id,
                            date,
                            metric: m.metric,
                            value: Number(m.value)
                        })
                    });
                }

                // Update Profile Height/Weight if changed
                if (formData.height || formData.weight) {
                    await fetch('/api/players', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: selectedPlayer.id,
                            height: formData.height ? Number(formData.height) : selectedPlayer.height,
                            weight: formData.weight ? Number(formData.weight) : selectedPlayer.weight
                        })
                    });
                }
            } else {
                // Rehab Submit
                await fetch('/api/measurements/rehab', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        playerId: selectedPlayer.id,
                        date,
                        rehabData
                    })
                });
            }

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                if (activeTab === 'rehab') {
                    setRehabData({ diagnosis: '', trainer: '윤청구', injuryDate: '', diagnosisDate: '', rehabDate: '', returnDate: '', programCount: '', injuryMechanism: '', problems: ['', '', '', '', '', ''], painVas: '', injuryHistory: '', painMovements: '', plan: '', etc: '' });
                } else {
                    setSelectedPlayer(null);
                    setFormData({
                        height: '', weight: '', bodyFat: '', muscleMass: '',
                        ron_shoulder: '', ron_bench: '', ron_latpulldown: '', ron_deadlift: '',
                    });
                    setHaData({});
                    setIntervals([]);
                }
            }, 2000);
        } catch (e) {
            console.error(e);
        }
        setSaving(false);
    };

    // Helper for labeled Units
    const UnitLabel = ({ label, unit }: { label: string, unit: string }) => (
        <span>{label} <span className="text-[8px] text-slate-400 font-normal">{unit}</span></span>
    );

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col lg:flex-row h-full">
                {/* Left: Player Search */}
                <div className="w-full lg:w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
                    <div className="p-4 border-b border-slate-100 bg-white">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="선수 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">×</button>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {filteredPlayers.map(p => (
                            <button
                                key={p.id}
                                onClick={() => handlePlayerSelect(p)}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedPlayer?.id === p.id
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                    : 'hover:bg-white hover:shadow-sm text-slate-700'
                                    }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-bold">{p.name}</span>
                                    {p.position && <span className={`text-[10px] ${selectedPlayer?.id === p.id ? 'text-blue-200' : 'text-slate-400'}`}>{p.position}</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Data Entry Form */}
                <div className="flex-1 overflow-y-auto bg-white">
                    {selectedPlayer ? (
                        <form onSubmit={handleSubmit} className="p-6 lg:p-10 space-y-8 max-w-5xl mx-auto">
                            {/* Selected Player Header */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                                        {selectedPlayer.name}
                                        <span className="text-sm font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                                            {selectedPlayer.team || 'YU-PC'}
                                        </span>
                                    </h2>
                                    <p className="text-sm text-slate-500 font-medium mt-1">
                                        {selectedPlayer.position} · {selectedPlayer.event}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                        <label className="text-xs font-bold text-slate-500">날짜:</label>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="bg-transparent text-sm font-bold text-slate-800 outline-none"
                                        />
                                    </div>
                                    <button onClick={() => setSelectedPlayer(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold underline">
                                        취소
                                    </button>
                                </div>
                            </div>

                            {/* Tab Navigation */}
                            <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                                <button type="button" onClick={() => setActiveTab('body')} className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'body' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <Info size={14} /> 신체 정보
                                </button>
                                <button type="button" onClick={() => setActiveTab('stats')} className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'stats' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <Activity size={14} /> 일반 측정
                                </button>
                                <button type="button" onClick={() => setActiveTab('rehab')} className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'rehab' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <Edit3 size={14} /> Rehab Chart
                                </button>
                                <button type="button" onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <History size={14} /> 기록 내역
                                </button>
                            </div>

                            {/* TAB 1: BODY INFO */}
                            {activeTab === 'body' && (
                                <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <Input label={<UnitLabel label="신장" unit="cm" />} value={formData.height} onChange={(v: any) => setFormData({ ...formData, height: v })} type="number" />
                                    <Input label={<UnitLabel label="체중" unit="kg" />} value={formData.weight} onChange={(v: any) => setFormData({ ...formData, weight: v })} type="number" />
                                    <Input label={<UnitLabel label="체지방량" unit="kg" />} value={formData.bodyFat} onChange={(v: any) => setFormData({ ...formData, bodyFat: v })} type="number" />
                                    <Input label={<UnitLabel label="근육량" unit="kg" />} value={formData.muscleMass} onChange={(v: any) => setFormData({ ...formData, muscleMass: v })} type="number" />
                                </div>
                            )}

                            {/* TAB 2: GENERAL STATS */}
                            {activeTab === 'stats' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Sub Navigation */}
                                    <div className="flex gap-4 border-b border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => setStatsSubTab('ronpick')}
                                            className={`pb-2 text-sm font-bold transition-all border-b-2 ${statsSubTab === 'ronpick' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                        >
                                            론픽 (Ronpick)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStatsSubTab('high_altitude')}
                                            className={`pb-2 text-sm font-bold transition-all border-b-2 ${statsSubTab === 'high_altitude' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                        >
                                            하이알티튜드
                                        </button>
                                    </div>

                                    {statsSubTab === 'ronpick' ? (
                                        <div className="space-y-6 animate-in fade-in duration-200">
                                            <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                                                <Dumbbell className="text-blue-600" size={20} />
                                                <span className="text-sm font-black text-slate-700">론픽 1RM 기록</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <Input label={<UnitLabel label="Shoulder" unit="kg" />} value={formData.ron_shoulder} onChange={(v: any) => setFormData({ ...formData, ron_shoulder: v })} type="number" />
                                                <Input label={<UnitLabel label="Bench" unit="kg" />} value={formData.ron_bench} onChange={(v: any) => setFormData({ ...formData, ron_bench: v })} type="number" />
                                                <Input label={<UnitLabel label="Latpull down" unit="kg" />} value={formData.ron_latpulldown} onChange={(v: any) => setFormData({ ...formData, ron_latpulldown: v })} type="number" />
                                                <Input label={<UnitLabel label="Deadlift" unit="kg" />} value={formData.ron_deadlift} onChange={(v: any) => setFormData({ ...formData, ron_deadlift: v })} type="number" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-8 animate-in fade-in duration-200">
                                            <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                                                <Wind className="text-blue-600" size={20} />
                                                <span className="text-sm font-black text-slate-700">하이알티튜드 상세 분석</span>
                                            </div>

                                            {/* Metrics Sections */}
                                            {['HRR', 'EPOC', 'SPO2'].map((metric) => (
                                                <div key={metric} className="space-y-3">
                                                    <div className="flex items-center gap-2 px-2 border-l-4 border-blue-600">
                                                        <span className="text-lg font-black text-slate-800">{metric}</span>
                                                        <span className="text-xs font-bold text-slate-400 uppercase">
                                                            {metric === 'HRR' ? 'Heart Rate Recovery' : metric === 'EPOC' ? 'Excess Post-exercise Oxygen Consumption' : 'Oxygen Saturation'}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                                        {/* Standard Protocols */}
                                                        <Input
                                                            label="6-12"
                                                            value={haData[`${metric}_6-12`]}
                                                            onChange={(v: string) => updateHaValue(metric, '6-12', v)}
                                                            type="number"
                                                        />
                                                        <Input
                                                            label="20-10"
                                                            value={haData[`${metric}_20-10`]}
                                                            onChange={(v: string) => updateHaValue(metric, '20-10', v)}
                                                            type="number"
                                                        />
                                                        <Input
                                                            label="30-30"
                                                            value={haData[`${metric}_30-30`]}
                                                            onChange={(v: string) => updateHaValue(metric, '30-30', v)}
                                                            type="number"
                                                        />
                                                        {/* Custom Intervals */}
                                                        {intervals.map((inv) => (
                                                            <Input
                                                                key={`${metric}_${inv.id}`}
                                                                label={inv.name || '구간명 미지정'}
                                                                value={haData[`${metric}_${inv.id}`]}
                                                                onChange={(v: string) => updateHaValue(metric, inv.id, v)}
                                                                type="number"
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Dynamic Interval Management */}
                                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Clock size={16} className="text-slate-400" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">분석 구간 추가 (공통 적용)</span>
                                                </div>

                                                {intervals.length > 0 && (
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {intervals.map((inv) => (
                                                            <div key={inv.id} className="flex gap-3 items-end group">
                                                                <div className="flex-1">
                                                                    <Input
                                                                        label="추가 구간 명칭 (예: 40-20)"
                                                                        value={inv.name}
                                                                        onChange={(v: string) => updateIntervalName(inv.id, v)}
                                                                        placeholder="40-20"
                                                                    />
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeInterval(inv.id)}
                                                                    className="p-3 mb-0.5 text-slate-300 hover:text-rose-500 transition-colors"
                                                                >
                                                                    <X size={20} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={addInterval}
                                                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all font-bold group"
                                                >
                                                    <PlusCircle size={20} className="group-hover:scale-110 transition-transform" />
                                                    새로운 구간 추가
                                                </button>
                                                <p className="text-center text-xs text-slate-400">
                                                    * 구간을 추가하면 위 모든 측정 항목(HRR, SPOC, SPO2)에 입력란이 생성됩니다.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 3: REHAB CHART */}
                            {activeTab === 'rehab' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="grid grid-cols-2 gap-6">
                                        <Input label="진단명" value={rehabData.diagnosis} onChange={(v: any) => setRehabData({ ...rehabData, diagnosis: v })} required />
                                        <Input label="트레이너" value={rehabData.trainer} onChange={(v: any) => setRehabData({ ...rehabData, trainer: v })} />
                                        <Input label="손상 일" value={rehabData.injuryDate} onChange={(v: any) => setRehabData({ ...rehabData, injuryDate: v })} />
                                        <Input label="진단 일" value={rehabData.diagnosisDate} onChange={(v: any) => setRehabData({ ...rehabData, diagnosisDate: v })} />
                                        <Input label="재활 시작" value={rehabData.rehabDate} onChange={(v: any) => setRehabData({ ...rehabData, rehabDate: v })} />
                                        <Input label="복귀 예정" value={rehabData.returnDate} onChange={(v: any) => setRehabData({ ...rehabData, returnDate: v })} />
                                        <Input label="프로그램 횟수" value={rehabData.programCount} onChange={(v: any) => setRehabData({ ...rehabData, programCount: v })} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">손상 경위</label>
                                        <textarea
                                            value={rehabData.injuryMechanism}
                                            onChange={(e) => setRehabData({ ...rehabData, injuryMechanism: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 h-20 resize-none"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="bg-emerald-600 text-white text-xs font-black p-2 rounded text-center uppercase tracking-widest">Problem List</div>
                                        <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                                            {rehabData.problems.map((prob, i) => (
                                                <div key={i} className="flex gap-2 items-center">
                                                    <span className="text-xs font-bold text-slate-400 w-4">{i + 1}.</span>
                                                    <input
                                                        value={prob}
                                                        onChange={(e) => handleProblemChange(i, e.target.value)}
                                                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {[
                                            { label: 'Pain (VAS)', val: rehabData.painVas, key: 'painVas' },
                                            { label: '이전 손상 병력', val: rehabData.injuryHistory, key: 'injuryHistory' },
                                            { label: '통증이 증가/감소하는 자세 및 동작', val: rehabData.painMovements, key: 'painMovements' },
                                            { label: '치료 및 재활 계획', val: rehabData.plan, key: 'plan', h: 'h-24' },
                                            { label: '기타', val: rehabData.etc, key: 'etc' }
                                        ].map((area: any) => (
                                            <div key={area.key} className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{area.label}</label>
                                                <textarea
                                                    value={area.val}
                                                    onChange={(e) => setRehabData({ ...rehabData, [area.key]: e.target.value })}
                                                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 resize-none ${area.h || 'h-16'}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: HISTORY */}
                            {activeTab === 'history' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <h3 className="font-black text-slate-800 flex items-center gap-2">
                                            <History size={18} className="text-blue-600" />
                                            최근 수기 기록 내역
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={fetchHistory}
                                            className="text-xs font-bold text-blue-600 hover:underline"
                                        >
                                            새로고침
                                        </button>
                                    </div>

                                    {loadingHistory ? (
                                        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                                            <p className="font-bold">기록을 불러오는 중...</p>
                                        </div>
                                    ) : historyData.length > 0 ? (
                                        <div className="overflow-x-auto rounded-2xl border border-slate-100">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                                                    <tr>
                                                        <th className="px-4 py-3">날짜</th>
                                                        <th className="px-4 py-3">항목</th>
                                                        <th className="px-4 py-3">상세/데이터</th>
                                                        <th className="px-4 py-3 text-right">수치</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {historyData.map((item, i) => (
                                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-slate-400">
                                                                {new Date(item.recorded_at).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-4 py-3 font-bold text-slate-700">
                                                                {item.metric || (item.test_type === 'rehab' ? 'Rehab Chart' : '-')}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-500 text-xs">
                                                                {item.test_type === 'rehab' && item.metrics ? (
                                                                    <div className="max-w-xs truncate font-medium">
                                                                        {item.metrics.diagnosis} ({item.metrics.trainer})
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300 italic">일반 측정 데이터</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-black text-blue-600">
                                                                {item.value !== undefined && item.value !== null ? (
                                                                    <>
                                                                        {item.value} <span className="text-[10px] text-slate-400 font-normal ml-1">{item.unit}</span>
                                                                    </>
                                                                ) : (
                                                                    <CheckCircle2 size={16} className="inline text-emerald-500" />
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="py-20 flex flex-col items-center justify-center text-slate-300 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                                            <Database size={40} className="mb-4" />
                                            <p className="font-bold">기록된 데이터가 없습니다</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab !== 'history' && (
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-2 ${success
                                        ? 'bg-emerald-500 text-white shadow-emerald-100'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                                        } disabled:opacity-50`}
                                >
                                    {success ? (
                                        <>
                                            <CheckCircle2 className="animate-bounce" size={20} />
                                            저장 완료!
                                        </>
                                    ) : (
                                        <>
                                            <Save size={20} />
                                            {saving ? '저장 중...' : '데이터 저장'}
                                        </>
                                    )}
                                </button>
                            )}
                        </form>
                    ) : (
                        <div className="h-full flex flex-col p-6 lg:p-10 bg-slate-50/30 overflow-y-auto">
                            <div className="max-w-5xl mx-auto w-full space-y-8">
                                <div className="flex flex-col items-center justify-center text-slate-400 py-10">
                                    <Users size={48} className="mb-4 text-slate-200" />
                                    <p className="font-black text-slate-600">선수를 선택하여 기록을 입력을 시작하세요</p>
                                    <p className="text-sm mt-1 text-slate-400">왼쪽 목록에서 선수를 검색하거나 선택할 수 있습니다</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-black text-slate-800 flex items-center gap-2">
                                            <Database size={18} className="text-blue-600" />
                                            최근 등록된 전체 수기 기록
                                        </h3>
                                        <button onClick={fetchGlobalHistory} className="text-xs font-bold text-blue-600 hover:underline">새로고침</button>
                                    </div>

                                    {loadingHistory && globalHistory.length === 0 ? (
                                        <div className="py-20 flex justify-center italic text-slate-400">데이터 로딩 중...</div>
                                    ) : globalHistory.length > 0 ? (
                                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                                                    <tr>
                                                        <th className="px-6 py-4">날짜</th>
                                                        <th className="px-6 py-4">선수</th>
                                                        <th className="px-6 py-4">항목</th>
                                                        <th className="px-6 py-4 text-right">값</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {globalHistory.map((item, i) => (
                                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-4 text-slate-400 font-medium">
                                                                {new Date(item.recorded_at).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="font-black text-slate-900">{item.profiles?.name}</span>
                                                                <span className="ml-2 text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                                                    {item.profiles?.position}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-slate-600">
                                                                {item.displayMetric}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className="font-black text-blue-600">{item.displayValue}</span>
                                                                <span className="text-[10px] text-slate-400 ml-1">{item.unit}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center text-slate-300 font-bold border-2 border-dashed border-slate-100 rounded-[2rem]">
                                            최근 등록된 기록이 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Input({ label, value, onChange, type = "text", required = false }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
            <input
                type={type}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
        </div>
    );
}
