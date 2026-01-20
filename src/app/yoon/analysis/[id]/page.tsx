'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, User, Activity, LayoutDashboard } from 'lucide-react';
import ValdAnalysisDashboard from '@/components/ValdAnalysisDashboard';
import { PlayerTestTimeline } from '@/components/PlayerTestTimeline';

export default function IndividualAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [measurements, setMeasurements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Profile
                const pRes = await fetch(`/api/players/${id}`);
                const pData = await pRes.json();
                setProfile(pData);

                // Fetch Measurements
                const mRes = await fetch(`/api/measurements?player_id=${id}&period=all`);
                const mData = await mRes.json();
                setMeasurements(Array.isArray(mData.measurements) ? mData.measurements : []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-20 text-center font-bold text-slate-500">데이터 불러오는 중...</div>;
    if (!profile) return <div className="p-20 text-center font-bold text-slate-500">선수 정보를 찾을 수 없습니다.</div>;

    return (
        <div className="w-full max-w-full space-y-8 pb-20">
            {/* LINK TO PLAYER REPORT BANNER */}
            <div
                onClick={() => router.push(`/yoon/player/${id}`)}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-4 shadow-lg shadow-blue-500/20 flex justify-between items-center cursor-pointer hover:shadow-xl hover:scale-[1.005] transition-all group"
            >
                <div className="flex items-center gap-4 text-white">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <Activity size={24} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-tight">선수 개인 리포트로 이동</h3>
                        <p className="text-xs text-blue-100 font-medium">현재 보고 있는 {profile.name} 선수의 종합 리포트를 확인하세요.</p>
                    </div>
                </div>
                <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                    <ChevronLeft size={20} className="text-white rotate-180" />
                </div>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 hover:bg-slate-50 rounded-xl transition-all border border-slate-100 shadow-sm"
                    >
                        <ChevronLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            {profile.name} <span className="text-slate-400 font-medium text-lg">상세 분석 (Detailed Analysis)</span>
                        </h1>
                        <p className="text-sm text-slate-400 font-medium tracking-tight">Yoon Performance Center Individual Analysis</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                        <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md text-slate-600">
                            <User size={14} /> {profile.team || 'YU-PC'}
                        </span>
                        <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-600">
                            {profile.level || '등급 없음'}
                        </span>
                    </div>
                    {profile.birthdate && (
                        <span className="text-xs font-medium text-slate-400">
                            생년월일: {new Date(profile.birthdate).toLocaleDateString()}
                        </span>
                    )}
                </div>
            </div>

            {/* Section 0: Test Timeline */}
            <section>
                <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="h-6 w-1 bg-blue-500 rounded-full"></div>
                    <h2 className="text-lg font-black text-slate-800">테스트 이력</h2>
                </div>
                <PlayerTestTimeline measurements={measurements} />
            </section>

            {/* Section 1: Auto-Generated Analysis (Existing Cards) */}
            <section>
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><LayoutDashboard size={20} /></div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800">통합 데이터 자동 분석</h2>
                        <p className="text-xs text-slate-500 font-medium">측정된 모든 데이터를 장비별로 자동 분류하여 보여줍니다.</p>
                    </div>
                </div>
                <ValdAnalysisDashboard measurements={measurements} />
            </section>


        </div>
    );
}
