
'use client';

import { useState, useEffect } from 'react';
import {
    Users, Link as LinkIcon, Edit3, Save, Plus, Trash2, Search,
    ChevronRight, CheckCircle2, AlertCircle, Database, RefreshCw, Settings, ArrowRight
} from 'lucide-react';
import HierarchicalMetricSettings from '@/components/HierarchicalMetricSettings';
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
    team: string; // Added field
    gender?: string;
    vald_id?: string;
};

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'players' | 'mapping' | 'manual' | 'sync' | 'metrics'>('players');
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
        <div className="w-full max-w-full px-4 space-y-8 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Settings</h1>
                    <p className="text-slate-500 font-medium">선수 관리 및 데이터 매칭 시스템 설정</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                <TabButton
                    active={activeTab === 'players'}
                    onClick={() => setActiveTab('players')}
                    icon={Users}
                    label="선수 관리"
                />
                <TabButton
                    active={activeTab === 'metrics'}
                    onClick={() => setActiveTab('metrics')}
                    icon={Settings}
                    label="메트릭 설정"
                />
                <TabButton
                    active={activeTab === 'sync'}
                    onClick={() => setActiveTab('sync')}
                    icon={RefreshCw}
                    label="데이터 동기화"
                />
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
                {activeTab === 'players' && <PlayerManagement players={players} onRefresh={fetchPlayers} />}
                {activeTab === 'metrics' && (
                    <div className="p-8">
                        <div className="flex justify-end mb-4">
                            <a
                                href="/api/metric-configs/export"
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"
                            >
                                <Database size={16} />
                                메트릭 참조 파일 다운로드 (CSV)
                            </a>
                        </div>
                        <HierarchicalMetricSettings />
                    </div>
                )}
                {activeTab === 'sync' && <DataSync />}
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
                active ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            )}
        >
            <Icon size={18} />
            {label}
        </button>
    );
}

// --- Sub Components ---

function PlayerManagement({ players, onRefresh }: { players: Player[], onRefresh: () => void }) {
    const [subTab, setSubTab] = useState<'list' | 'matching'>('list');
    const [isAdding, setIsAdding] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPlayers = players.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.team?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.position?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            {/* Sub Tabs */}
            <div className="flex items-center gap-6 px-8 py-4 border-b border-slate-100">
                <button
                    onClick={() => setSubTab('list')}
                    className={clsx(
                        "text-sm font-bold pb-2 border-b-2 transition-all",
                        subTab === 'list'
                            ? "text-slate-800 border-slate-800"
                            : "text-slate-400 border-transparent hover:text-slate-600"
                    )}
                >
                    선수 목록
                </button>
                <button
                    onClick={() => setSubTab('matching')}
                    className={clsx(
                        "text-sm font-bold pb-2 border-b-2 transition-all",
                        subTab === 'matching'
                            ? "text-slate-800 border-slate-800"
                            : "text-slate-400 border-transparent hover:text-slate-600"
                    )}
                >
                    데이터 매칭
                </button>
            </div>

            {subTab === 'matching' ? (
                <IDMapping players={players} onRefresh={onRefresh} />
            ) : (
                <div className="p-8 space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-slate-800">선수 목록 ({filteredPlayers.length}명)</h2>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="이름, 소속, 포지션 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-64 transition-all"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                        >
                            <Plus size={18} />
                            새 선수 등록
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">이름</th>
                                    <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">포지션</th>
                                    <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">종목</th>
                                    <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">수준</th>
                                    <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">소속</th>
                                    <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">생년월일</th>
                                    <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">조작</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredPlayers.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-4 font-bold text-slate-800">{p.name}</td>
                                        <td className="py-4 px-4 text-slate-600">{p.position}</td>
                                        <td className="py-4 px-4 text-slate-600">{p.event}</td>
                                        <td className="py-4 px-4 text-slate-600">
                                            <span className={clsx(
                                                "px-2 py-1 rounded-md text-xs font-bold",
                                                p.level === '프로' ? "bg-blue-100 text-blue-700" :
                                                    p.level === '대학생' ? "bg-indigo-100 text-indigo-700" :
                                                        p.level === '고등학생' ? "bg-emerald-100 text-emerald-700" :
                                                            p.level === '중학생' ? "bg-amber-100 text-amber-700" :
                                                                "bg-slate-100 text-slate-600"
                                            )}>
                                                {p.level}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-slate-600">{p.team}</td>
                                        <td className="py-4 px-4 text-slate-600">{p.birthdate}</td>
                                        <td className="py-4 px-4">
                                            <button
                                                onClick={() => setEditingPlayer(p)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {(isAdding || editingPlayer) && (
                        <PlayerFormModal
                            player={editingPlayer}
                            onClose={() => { setIsAdding(false); setEditingPlayer(null); }}
                            onSuccess={() => { setIsAdding(false); setEditingPlayer(null); onRefresh(); }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

function PlayerFormModal({ player, onClose, onSuccess }: any) {
    const [formData, setFormData] = useState<Partial<Player>>(
        player || {
            name: '',
            position: '',
            birthdate: '',
            phone: '',
            event: '',
            level: '',
            team: '',
            gender: 'Male'
        }
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) onSuccess();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800">{player ? '선수 정보 수정' : '새 선수 등록'}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 underline text-sm font-bold">닫기</button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="이름" value={formData.name} onChange={(v: any) => setFormData({ ...formData, name: v })} required />
                        <Input label="전화번호" value={formData.phone} onChange={(v: any) => setFormData({ ...formData, phone: v })} />
                        <Input label="생년월일" type="date" value={formData.birthdate} onChange={(v: any) => setFormData({ ...formData, birthdate: v })} />
                        <Input label="포지션" value={formData.position} onChange={(v: any) => setFormData({ ...formData, position: v })} />
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">성별</label>
                            <select
                                value={formData.gender || 'Male'}
                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            >
                                <option value="Male">남성 (Male)</option>
                                <option value="Female">여성 (Female)</option>
                            </select>
                        </div>
                        <Input label="종목" value={formData.event} onChange={(v: any) => setFormData({ ...formData, event: v })} />
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">수준</label>
                            <select
                                value={formData.level || ''}
                                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            >
                                <option value="" disabled>선택하세요</option>
                                <option value="프로">프로</option>
                                <option value="대학생">대학생</option>
                                <option value="고등학생">고등학생</option>
                                <option value="중학생">중학생</option>
                                <option value="초등학생">초등학생</option>
                                <option value="일반인">일반인</option>
                            </select>
                        </div>
                        <Input label="소속" value={formData.team} onChange={(v: any) => setFormData({ ...formData, team: v })} />
                    </div>
                    <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg mt-4 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2">
                        <Save size={20} />
                        저장하기
                    </button>
                </form>
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

function IDMapping({ players, onRefresh }: { players: Player[], onRefresh: () => void }) {
    const [activeCompany, setActiveCompany] = useState<string>('VALD'); // Default to VALD
    const [companyAliases, setCompanyAliases] = useState<any[]>([]); // New aliases state
    const [unlinked, setUnlinked] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Auto Match State
    const [autoMatches, setAutoMatches] = useState<any[]>([]);
    const [showAutoMatch, setShowAutoMatch] = useState(false);
    const [autoMatchLoading, setAutoMatchLoading] = useState(false);

    useEffect(() => {
        fetchUnlinked();
        fetchAutoMatches();
        fetchAliases(); // Fetch aliases on mount
    }, []);

    // Also re-fetch when company changes if needed, but for now data is global or structured
    // We will filter unlinked and aliases by activeCompany in the render or selector

    const fetchUnlinked = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/players/linking');
            const data = await res.json();
            setUnlinked(data.unlinked || []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const fetchAliases = async () => {
        try {
            const res = await fetch('/api/player-aliases');
            const data = await res.json();
            setCompanyAliases(data.aliases || []);
        } catch (e) {
            console.error('Error fetching aliases:', e);
        }
    };

    const fetchAutoMatches = async () => {
        try {
            const res = await fetch('/api/players/auto-match');
            const data = await res.json();
            setAutoMatches(data.matches || []);
        } catch (e) {
            console.error(e);
        }
    };

    const COMPANY_TEST_TYPES: Record<string, string[]> = {
        VALD: ['ForceDecks', 'NordBord', 'ForceFrame', 'SmartSpeed', 'DynaMo', 'DynaMoLite', 'Airbands'],
        Keiser: ['Keiser'],
        Hawkin: ['Hawkin'],
    };

    // Filter Logic
    const filteredUnlinked = unlinked.filter(item => {
        const targetTypes = COMPANY_TEST_TYPES[activeCompany] || [];
        // Check if any of the item.devices are in the target company's types
        return item.devices.some((d: string) => targetTypes.includes(d));
    });

    const filteredAliases = companyAliases.filter(alias => {
        const targetTypes = COMPANY_TEST_TYPES[activeCompany] || [];
        return targetTypes.includes(alias.source);
    });


    // --- Actions ---

    const applyAutoMatch = async (matches: any[]) => {
        setAutoMatchLoading(true);
        try {
            const res = await fetch('/api/players/auto-match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matches })
            });
            const data = await res.json();
            if (data.success) {
                alert(`${data.matched}명의 선수가 자동으로 매칭되었습니다!`);
                fetchUnlinked();
                fetchAutoMatches();
                onRefresh();
            }
        } catch (e) {
            console.error(e);
        }
        setAutoMatchLoading(false);
    };

    const linkPlayer = async (valdId: string, playerId: string) => {
        try {
            // Check if this is a "Legacy" linking (vald_id on profile) or "New" linking (alias)
            // Ideally we do BOTH for backward compatibility if it's the primary ID

            // For now, let's stick to the existing /linking API which updates profile.vald_id
            // AND also create an alias if possible.
            // But the current UI calls this component "IDMapping" and it uses /api/players/linking.

            await fetch('/api/players/linking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ valdId, playerId })
            });

            fetchUnlinked();
            fetchAutoMatches();
            onRefresh();
        } catch (e) {
            console.error(e);
        }
    };

    const deleteAlias = async (id: string) => {
        if (!confirm('연결을 해제하시겠습니까?')) return;
        try {
            await fetch(`/api/player-aliases?id=${id}`, { method: 'DELETE' });
            fetchAliases();
        } catch (e) {
            console.error(e);
        }
    }


    return (
        <div className="p-8 space-y-8">
            {/* 1. Company Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                {['VALD'].map(company => (
                    <button
                        key={company}
                        onClick={() => setActiveCompany(company)}
                        className={clsx(
                            "px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                            activeCompany === company
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {company === 'VALD' ? 'VALD Performance' : company}
                    </button>
                ))}
            </div>

            {/* 2. Auto Match Section (Global or Filtered?) -> Let's keep it visible if there are matches */}
            {autoMatches.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-6 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 p-2 rounded-xl">
                                <CheckCircle2 className="text-emerald-600" size={24} />
                            </div>
                            <div>
                                <h4 className="font-black text-emerald-900 text-lg">🎯 자동 매칭 발견!</h4>
                                <p className="text-sm text-emerald-700 font-medium">
                                    이름 유사도 기반으로 {autoMatches.filter(m => m.auto_match).length}개의 자동 매칭 가능 항목을 발견했습니다.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowAutoMatch(!showAutoMatch)}
                                className="px-4 py-2 bg-white text-emerald-700 font-bold rounded-xl border border-emerald-200 hover:bg-emerald-50 transition-all text-sm"
                            >
                                {showAutoMatch ? '접기' : '자세히 보기'}
                            </button>
                            <button
                                onClick={() => applyAutoMatch(autoMatches.filter(m => m.auto_match))}
                                disabled={autoMatchLoading || autoMatches.filter(m => m.auto_match).length === 0}
                                className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 text-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {autoMatchLoading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                자동 매칭 적용
                            </button>
                        </div>
                    </div>

                    {showAutoMatch && (
                        <div className="grid gap-2 max-h-60 overflow-y-auto">
                            {autoMatches.map(match => (
                                <div key={match.vald_id} className="bg-white p-3 rounded-xl border border-emerald-100 flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="font-bold text-slate-700">{match.vald_name}</span>
                                        <ArrowRight size={14} className="text-slate-300" />
                                        <span className="font-bold text-blue-600">{match.player_name}</span>
                                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold ml-2">{match.similarity}% 일치</span>
                                    </div>
                                    <button onClick={() => linkPlayer(match.vald_id, match.player_id)} className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-100">
                                        개별 연결
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT: Unmatched Data (Monitoring) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                <AlertCircle size={20} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg">미매칭 데이터 ({filteredUnlinked.length})</h3>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden min-h-[400px]">
                        {filteredUnlinked.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center p-10 text-slate-400 space-y-2">
                                <CheckCircle2 size={32} className="text-slate-200" />
                                <p>모든 데이터가 연결되었습니다.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredUnlinked.map((item) => (
                                    <div key={item.vald_id} className="p-4 hover:bg-slate-50 transition-colors space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-black text-slate-800 text-lg">{item.vald_name}</p>
                                                <div className="flex gap-1 mt-1">
                                                    {item.devices.map((d: string) => (
                                                        <span key={d} className="text-[10px] uppercase font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                                            {d}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-medium text-slate-400">최근 측정: {new Date(item.latest_test).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        {/* Quick Link Dropdown */}
                                        <div className="flex gap-2">
                                            <select
                                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 font-bold focus:outline-none focus:border-blue-500"
                                                onChange={(e) => linkPlayer(item.vald_id, e.target.value)}
                                                value=""
                                            >
                                                <option value="">선수 선택 후 연결...</option>
                                                {players.filter(p => !p.vald_id).map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>


                {/* RIGHT: Linked Aliases (Management) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <LinkIcon size={20} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg">연결된 프로필 ({filteredAliases.length})</h3>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden min-h-[400px] flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <input
                                type="text"
                                placeholder="연결된 이름 검색..."
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div className="divide-y divide-slate-50 overflow-y-auto max-h-[600px]">
                            {filteredAliases.map(alias => (
                                <div key={alias.id} className="p-4 flex items-center justify-between group hover:bg-slate-50">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">{alias.source}</span>
                                            <span className="font-bold text-slate-800">{alias.alias_name}</span>
                                        </div>
                                        <ArrowRight className="text-slate-300" size={16} />
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
                                                {alias.profiles?.name?.charAt(0)}
                                            </div>
                                            <span className="font-bold text-blue-600">{alias.profiles?.name}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => deleteAlias(alias.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}

                            {/* Also show Profiles that have direct vald_id linking (Legacy) */}
                            {players.filter(p => p.vald_id).map(p => (
                                <div key={p.id} className="p-4 flex items-center justify-between group hover:bg-slate-50 bg-slate-50/30">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Direct ID</span>
                                            <span className="font-bold text-slate-600 font-mono text-xs">{p.vald_id?.substring(0, 8)}...</span>
                                        </div>
                                        <ArrowRight className="text-slate-300" size={16} />
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-xs">
                                                {p.name.charAt(0)}
                                            </div>
                                            <span className="font-bold text-emerald-600">{p.name}</span>
                                        </div>
                                    </div>
                                    {/* Direct links can't be easily deleted here without API change, maybe show info only */}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
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
    const [activeTab, setActiveTab] = useState<'body' | 'stats' | 'rehab'>('body');

    // Stats Data
    const [formData, setFormData] = useState({
        // Body
        height: '', weight: '', bodyFat: '', muscleMass: '',
        // 1RM
        benchPress: '', deadlift: '', squat: '', pulldown: '',
        // General / High Altitude
        epoc: '', heartRate: '', maxSpeed: '', spo2: '', bloodOxygen: ''
    });

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
                    // Strength
                    { metric: '1RM 벤치프레스', value: formData.benchPress, unit: 'kg' },
                    { metric: '1RM 데드리프트', value: formData.deadlift, unit: 'kg' },
                    { metric: '1RM 스쿼트', value: formData.squat, unit: 'kg' },
                    { metric: '1RM 렛풀다운', value: formData.pulldown, unit: 'kg' },
                    // High Altitude & Etc
                    { metric: 'EPOC', value: formData.epoc, unit: 'sec' }, // Etc
                    { metric: '심박수', value: formData.heartRate, unit: 'bpm' },
                    { metric: '최고 속도', value: formData.maxSpeed, unit: 'km/h' },
                    { metric: '산소 포화도', value: formData.spo2, unit: '%' },
                    { metric: '혈중 산소농도', value: formData.bloodOxygen, unit: '%' },
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
                    setFormData({ height: '', weight: '', bodyFat: '', muscleMass: '', benchPress: '', deadlift: '', squat: '', pulldown: '', epoc: '', heartRate: '', maxSpeed: '', spo2: '', bloodOxygen: '' });
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
            {/* Header - now inside a padded area or removed padding as requested?
                "네모 박스 안에 여백을 주지 말고 크게 맞춰줘" -> Fit to box. 
                I will remove the top padding/margin of the container and let it span full. 
            */}

            <div className="flex flex-col lg:flex-row h-full">
                {/* Left: Player Search - Fixed Width or percent */}
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

                {/* Right: Data Entry Form - Expanded */}
                <div className="flex-1 overflow-y-auto">
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
                                <button type="button" onClick={() => setActiveTab('body')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'body' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>신체 정보</button>
                                <button type="button" onClick={() => setActiveTab('stats')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'stats' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>일반 측정</button>
                                <button type="button" onClick={() => setActiveTab('rehab')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'rehab' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Rehab Chart</button>
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
                                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* 1RM Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">1RM 기록</h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            <Input label={<UnitLabel label="벤치프레스" unit="kg" />} value={formData.benchPress} onChange={(v: any) => setFormData({ ...formData, benchPress: v })} type="number" />
                                            <Input label={<UnitLabel label="데드리프트" unit="kg" />} value={formData.deadlift} onChange={(v: any) => setFormData({ ...formData, deadlift: v })} type="number" />
                                            <Input label={<UnitLabel label="스쿼트" unit="kg" />} value={formData.squat} onChange={(v: any) => setFormData({ ...formData, squat: v })} type="number" />
                                            <Input label={<UnitLabel label="렛풀다운" unit="kg" />} value={formData.pulldown} onChange={(v: any) => setFormData({ ...formData, pulldown: v })} type="number" />
                                        </div>
                                    </div>

                                    {/* High Altitude Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">하이알티튜드 (High Altitude)</h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            <Input label={<UnitLabel label="심박수" unit="bpm" />} value={formData.heartRate} onChange={(v: any) => setFormData({ ...formData, heartRate: v })} type="number" />
                                            <Input label={<UnitLabel label="최고 속도" unit="km/h" />} value={formData.maxSpeed} onChange={(v: any) => setFormData({ ...formData, maxSpeed: v })} type="number" />
                                            <Input label={<UnitLabel label="산소 포화도" unit="%" />} value={formData.spo2} onChange={(v: any) => setFormData({ ...formData, spo2: v })} type="number" />
                                            <Input label={<UnitLabel label="혈중 산소농도" unit="%" />} value={formData.bloodOxygen} onChange={(v: any) => setFormData({ ...formData, bloodOxygen: v })} type="number" />
                                        </div>
                                    </div>

                                    {/* Etc Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">기타 (Etc)</h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            <Input label={<UnitLabel label="EPOC" unit="sec" />} value={formData.epoc} onChange={(v: any) => setFormData({ ...formData, epoc: v })} type="number" />
                                        </div>
                                    </div>
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
                                        {/* Areas using simple labels, assume no unit tweaking needed or pass simple strings */}
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

                            {/* Submit Button */}
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
                        </form>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                            <Users size={48} className="mb-4 text-slate-300" />
                            <p className="font-bold">목록에서 선수를 선택해주세요</p>
                            <p className="text-sm mt-1 text-slate-400">새로운 기록을 입력할 수 있습니다</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DataSync() {
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [output, setOutput] = useState<string>('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [activeCompany, setActiveCompany] = useState<string>('VALD');

    const handleSync = async () => {
        setSyncing(true);
        setShowSuccess(false);
        setOutput(`${activeCompany} 데이터 동기화 시작 중...\n`);
        try {
            // Include company param in sync request
            const res = await fetch(`/api/sync?company=${activeCompany}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setLastSync(new Date().toLocaleString());
                setOutput(data.output || '동기화가 성공적으로 완료되었습니다.');
                setShowSuccess(true);
                // Hide success message after 5 seconds
                setTimeout(() => setShowSuccess(false), 5000);
            } else {
                setOutput(`에러 발생: ${data.error}`);
            }
        } catch (e: any) {
            setOutput(`에러 발생: ${e.message}`);
        }
        setSyncing(false);
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-center">
                <div className="flex p-1 bg-slate-100 rounded-xl w-fit mb-4">
                    {['VALD'].map(company => (
                        <button
                            key={company}
                            onClick={() => { setActiveCompany(company); setOutput(''); setShowSuccess(false); }}
                            className={clsx(
                                "px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                                activeCompany === company
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {company === 'VALD' ? 'VALD Performance' : company}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="bg-blue-50 w-full h-full rounded-3xl flex items-center justify-center">
                            <RefreshCw size={40} className={clsx("text-blue-600", syncing && "animate-spin")} />
                        </div>
                        {showSuccess && (
                            <div className="absolute -right-2 -top-2 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg animate-bounce">
                                <CheckCircle2 size={24} />
                            </div>
                        )}
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight text-center">Data Synchronization</h2>
                    <p className="text-slate-500 font-medium text-center">
                        {activeCompany === 'VALD' && "ForceDecks, NordBord 등 VALD Hub의 최신 측정 데이터를 동기화합니다."}
                    </p>
                </div>

                {showSuccess && (
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <CheckCircle2 className="text-emerald-500" size={20} />
                        <p className="text-sm font-bold text-emerald-800">최신 데이터 동기화가 완료되었습니다!</p>
                    </div>
                )}

                <div className="bg-slate-50 border border-slate-100 p-8 rounded-3xl space-y-6 shadow-inner">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">최근 동기화 상태 ({activeCompany})</span>
                        <span className="font-black text-slate-700">{lastSync || '기록 없음'}</span>
                    </div>

                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className={clsx(
                            "w-full py-5 rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-3",
                            syncing
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100"
                        )}
                    >
                        <RefreshCw size={24} className={syncing ? "animate-spin" : ""} />
                        {syncing ? `${activeCompany} 동기화 중...` : '지금 동기화하기'}
                    </button>
                </div>

                {output && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">동기화 결과 로그</p>
                        <pre className="bg-slate-900 text-slate-300 p-6 rounded-2xl text-[11px] font-mono overflow-x-auto leading-relaxed shadow-xl max-h-60 overflow-y-auto">
                            {output}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}
