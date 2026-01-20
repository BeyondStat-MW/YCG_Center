'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Printer } from 'lucide-react';

type RehabData = {
    diagnosis: string;
    trainer: string;
    injuryDate: string;
    diagnosisDate?: string;
    rehabDate: string;
    returnDate: string;
    programCount: string;
    injuryMechanism: string;
    problems: string[];
    painVas: string;
    injuryHistory: string;
    painMovements: string;
    plan: string;
    etc: string;
};

export default function RehabChartDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [rehabRecords, setRehabRecords] = useState<any[]>([]);
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Profile
                const pRes = await fetch(`/api/players/${id}`);
                const pData = await pRes.json();
                setProfile(pData);

                // Fetch Rehab Data
                const mRes = await fetch(`/api/measurements?player_id=${id}&period=all`);
                const { measurements } = await mRes.json();

                // Filter & Sort Rehab Data
                const rehabs = measurements
                    .filter((m: any) => m.test_type === 'rehab')
                    .sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());

                setRehabRecords(rehabs);
                if (rehabs.length > 0) {
                    setSelectedRecordId(rehabs[0].id);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchData();
    }, [id]);

    if (!profile) return <div className="p-20 text-center text-slate-400">Loading...</div>;

    const currentRecord = rehabRecords.find(r => r.id === selectedRecordId);
    const rehabData: RehabData = currentRecord?.metrics || {
        diagnosis: '', trainer: '', injuryDate: '', diagnosisDate: '', rehabDate: '', returnDate: '', programCount: '',
        injuryMechanism: '', problems: [], painVas: '', injuryHistory: '', painMovements: '', plan: '', etc: ''
    };

    return (
        <div className="max-w-7xl mx-auto min-h-screen p-8 text-black print:p-0">
            {/* Top Navigation */}
            <div className="mb-6 flex justify-between items-center no-print print:hidden">
                <button onClick={() => router.back()} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm">
                    <ChevronLeft size={16} className="mr-1" /> 목록으로
                </button>
                <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 text-sm font-bold">
                    <Printer size={16} /> 인쇄하기
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar: Record List */}
                <div className="w-full lg:w-64 flex-shrink-0 no-print print:hidden space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-600 p-1 rounded">📋</span>
                            기록 목록 ({rehabRecords.length})
                        </h3>
                        {rehabRecords.length === 0 ? (
                            <div className="text-sm text-slate-400 text-center py-4">기록이 없습니다.</div>
                        ) : (
                            <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                {rehabRecords.map((rec) => (
                                    <button
                                        key={rec.id}
                                        onClick={() => setSelectedRecordId(rec.id)}
                                        className={`w-full text-left px-3 py-3 rounded-lg text-sm font-bold transition-all border ${selectedRecordId === rec.id
                                            ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                            : 'bg-white border-transparent hover:bg-slate-50 text-slate-500'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span>{new Date(rec.recorded_at).toLocaleDateString()}</span>
                                            {selectedRecordId === rec.id && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                        </div>
                                        {rec.metrics?.diagnosis && (
                                            <div className="text-[10px] font-normal mt-1 text-slate-400 truncate">
                                                {rec.metrics.diagnosis}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content: Chart */}
                <div className="flex-1 bg-white print:w-full">
                    {currentRecord ? (
                        <div className="border-2 border-black bg-white text-black font-sans leading-tight shadow-xl print:shadow-none">
                            {/* Header Title */}
                            <div className="relative border-b-2 border-black p-6 text-center min-h-[160px] flex items-center justify-center">
                                {/* Player Card (Left) */}
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-4 bg-slate-50 border border-slate-200 p-3 rounded-xl print:flex print:border-black print:bg-white">
                                    <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-black text-xl border border-slate-300 print:grayscale">
                                        {profile.name.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-black text-black">{profile.name}</h3>
                                        <div className="text-xs font-bold text-slate-500 print:text-black">
                                            {profile.team || 'YU-PC'} · {profile.position || 'Player'}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium print:hidden">
                                            {profile.level}
                                        </div>
                                    </div>
                                </div>

                                <h1 className="text-3xl font-extrabold tracking-tight">Rehabilitation Chart</h1>

                                <div className="absolute right-4 top-1/2 -translate-y-1/2 print:block hidden sm:block">
                                    <div className="flex flex-col items-end">
                                        <img src="/ycg-logo.png" alt="YCG" className="h-10 w-auto mb-1 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                                        <span className="text-[8px] font-bold tracking-widest text-slate-500">YCG PERFORMANCE</span>
                                    </div>
                                </div>
                            </div>

                            {/* Table Grid */}
                            <div className="grid grid-cols-1 divide-y divide-black text-sm">

                                {/* Row 1: Basic Info */}
                                <div className="grid grid-cols-[80px_1fr_80px_1fr_80px_1fr_80px_1fr] divide-x divide-black">
                                    <div className="p-2 font-bold bg-slate-50 flex items-center justify-center">이름:</div>
                                    <div className="p-2 flex items-center bg-white">{profile.name}</div>
                                    <div className="p-2 font-bold bg-slate-50 flex items-center justify-center">소속:</div>
                                    <div className="p-2 flex items-center bg-white">{profile.team || 'YU-PC'}</div>
                                    <div className="p-2 font-bold bg-slate-50 flex items-center justify-center">진단명:</div>
                                    <div className="p-2 flex items-center bg-white">{rehabData.diagnosis}</div>
                                    <div className="p-2 font-bold bg-slate-50 flex items-center justify-center">트레이너:</div>
                                    <div className="p-2 flex items-center bg-white">{rehabData.trainer}</div>
                                </div>

                                {/* Row 2: Dates */}
                                <div className="grid grid-cols-[60px_1fr_60px_1fr_60px_1fr_60px_1fr_100px_1fr] divide-x divide-black">
                                    <div className="p-2 font-bold bg-slate-50 flex items-center justify-center">손상 일:</div>
                                    <div className="p-2 flex items-center bg-white justify-center">{rehabData.injuryDate}</div>
                                    <div className="p-2 font-bold bg-slate-50 flex items-center justify-center">진단 일:</div>
                                    <div className="p-2 flex items-center bg-white justify-center">{rehabData.diagnosisDate}</div>
                                    <div className="p-2 font-bold bg-slate-50 flex items-center justify-center">재활:</div>
                                    <div className="p-2 flex items-center bg-white justify-center">{rehabData.rehabDate}</div>
                                    <div className="p-2 font-bold bg-slate-50 flex items-center justify-center">복귀 예정:</div>
                                    <div className="p-2 flex items-center bg-white justify-center">{rehabData.returnDate}</div>
                                    <div className="p-2 font-bold bg-slate-50 flex items-center justify-center">프로그램(횟수):</div>
                                    <div className="p-2 flex items-center bg-white justify-center">{rehabData.programCount}</div>
                                </div>

                                {/* Row 3: Injury Mechanism */}
                                <div className="grid grid-cols-[100px_1fr] divide-x divide-black min-h-[60px]">
                                    <div className="p-2 font-bold bg-slate-50 flex items-center justify-center border-r border-black">손상 경위:</div>
                                    <div className={`p-2 whitespace-pre-wrap bg-white ${!rehabData.injuryMechanism ? 'text-slate-300 italic' : ''}`}>
                                        {rehabData.injuryMechanism || '기록 없음'}
                                    </div>
                                </div>

                                {/* Row 4: Problem List Header */}
                                <div className="bg-[#1E5E28] text-white font-bold text-center p-1.5 border-y border-black uppercase tracking-wider text-xs">
                                    PROBLEM LIST
                                </div>

                                {/* Row 5: Problem List Content */}
                                <div className="min-h-[200px] p-6 bg-white relative">
                                    <ol className="list-decimal list-inside space-y-1 z-10 relative text-base">
                                        {rehabData.problems && rehabData.problems.length > 0 && rehabData.problems.some(p => p.trim()) ? (
                                            rehabData.problems.filter(p => p.trim()).map((prob, i) => (
                                                <li key={i}>{prob}</li>
                                            ))
                                        ) : (
                                            Array.from({ length: 6 }).map((_, i) => (
                                                <li key={i} className="text-transparent border-b border-slate-100/50" aria-hidden="true">.</li>
                                            ))
                                        )}
                                    </ol>
                                    {(!rehabData.problems || !rehabData.problems.some(p => p.trim())) && (
                                        <div className="absolute inset-0 p-4 pointer-events-none flex items-center justify-center">
                                            <span className="text-slate-300 font-bold text-sm italic no-print">등록된 문제 목록이 없습니다.</span>
                                        </div>
                                    )}
                                </div>

                                {/* Row 6: Pain(VAS) */}
                                <div className="border-t border-black p-2 min-h-[80px] bg-white">
                                    <div className="font-bold mb-1">Pain(VAS):</div>
                                    <div className={`whitespace-pre-wrap px-2 ${!rehabData.painVas ? 'text-slate-300 italic' : ''}`}>{rehabData.painVas || '기록 없음'}</div>
                                </div>

                                {/* Row 7: Injury History */}
                                <div className="border-t border-black p-2 min-h-[80px] bg-white">
                                    <div className="font-bold mb-1">이전 손상 병력(Injury history):</div>
                                    <div className={`whitespace-pre-wrap px-2 ${!rehabData.injuryHistory ? 'text-slate-300 italic' : ''}`}>{rehabData.injuryHistory || '기록 없음'}</div>
                                </div>

                                {/* Row 8: Movements */}
                                <div className="border-t border-black p-2 min-h-[80px] bg-white">
                                    <div className="font-bold mb-1">통증이 증가/감소하는 자세 및 동작:</div>
                                    <div className={`whitespace-pre-wrap px-2 ${!rehabData.painMovements ? 'text-slate-300 italic' : ''}`}>{rehabData.painMovements || '기록 없음'}</div>
                                </div>

                                {/* Row 9: Plan */}
                                <div className="border-t border-black p-2 min-h-[100px] bg-white">
                                    <div className="font-bold mb-1">치료 및 재활 계획:</div>
                                    <div className={`whitespace-pre-wrap px-2 ${!rehabData.plan ? 'text-slate-300 italic' : ''}`}>{rehabData.plan || '기록 없음'}</div>
                                </div>

                                {/* Row 10: Etc */}
                                <div className="border-t border-black p-2 min-h-[80px] bg-white">
                                    <div className="font-bold mb-1">기타:</div>
                                    <div className={`whitespace-pre-wrap px-2 ${!rehabData.etc ? 'text-slate-300 italic' : ''}`}>{rehabData.etc || '기록 없음'}</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[600px] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 animate-in fade-in zoom-in duration-300">
                            <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                                <span className="text-4xl">📭</span>
                            </div>
                            <p className="font-bold text-lg">기록된 재활 차트가 없습니다.</p>
                            <p className="text-sm mt-1">새로운 기록을 추가해주세요.</p>
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; }
                    .no-print { display: none !important; }
                }
            `}</style>
        </div>
    );
}
