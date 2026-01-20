
'use client';

import { useState } from 'react';
import { Search, User, Filter, ChevronRight, Command, X, Check } from 'lucide-react';
import { clsx } from 'clsx';

// Mock Data
const players = [
    { id: 1, name: '손흥민', team: 'Tottenham', position: 'FW', number: 7 },
    { id: 2, name: '이강인', team: 'PSG', position: 'MF', number: 19 },
    { id: 3, name: '김민재', team: 'Bayern', position: 'DF', number: 3 },
    { id: 4, name: '황희찬', team: 'Wolves', position: 'FW', number: 11 },
    { id: 5, name: '조규성', team: 'MidTJ', position: 'FW', number: 9 },
    { id: 6, name: '설영우', team: 'Ulsan', position: 'DF', number: 66 },
    { id: 7, name: '백승호', team: 'Birmingham', position: 'MF', number: 13 },
    { id: 8, name: '이재성', team: 'Mainz', position: 'MF', number: 7 },
];

export default function DesignLabPage() {
    return (
        <div className="p-12 space-y-24 bg-slate-50 min-h-screen font-sans text-slate-900 pb-40">
            <div>
                <h1 className="text-4xl font-black text-slate-900 mb-2">Player Selection Concepts</h1>
                <p className="text-slate-500">선수 선택 UI 디자인 시안 3종</p>
            </div>

            {/* Design A */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-blue-600 flex items-center gap-2">
                        <span className="bg-blue-100 p-1.5 rounded-lg text-xs font-black">OPTION A</span>
                        커맨드 센터 (Spotlight Search)
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        어디서든 <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs font-sans">Cmd+K</kbd> 로 즉시 호출.
                        가장 빠르고 미니멀하며 화면 공간을 차지하지 않습니다. 검색 중심의 워크플로우에 적합합니다.
                    </p>
                </div>
                <div className="p-12 bg-slate-100 items-center justify-center flex h-[500px] relative">
                    {/* Background Content (Blurred) */}
                    <div className="absolute inset-0 bg-white p-8 opacity-30 pointer-events-none blur-[2px]">
                        <div className="h-8 w-1/3 bg-slate-200 rounded mb-8"></div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="h-32 bg-slate-100 rounded-xl"></div>
                            <div className="h-32 bg-slate-100 rounded-xl"></div>
                            <div className="h-32 bg-slate-100 rounded-xl"></div>
                        </div>
                    </div>

                    {/* Modal */}
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 transform -translate-y-8 overflow-hidden z-10">
                        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                            <Search className="text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="선수 이름, 소속 팀 검색..."
                                className="flex-1 text-lg font-medium text-slate-800 outline-none placeholder:text-slate-300"
                                autoFocus
                            />
                            <div className="text-[10px] bg-slate-100 text-slate-400 px-2 py-1 rounded font-bold">ESC</div>
                        </div>
                        <div className="max-h-[320px] overflow-y-auto">
                            <div className="px-2 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-4">Recent</div>
                            {players.slice(0, 2).map((p, i) => (
                                <div key={p.id} className={clsx("px-4 py-3 flex items-center justify-between cursor-pointer group", i === 0 ? "bg-blue-50" : "hover:bg-slate-50")}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 group-hover:bg-white group-hover:text-blue-600 transition-colors">
                                            {p.name[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{p.name}</p>
                                            <p className="text-xs text-slate-400">{p.team} · {p.position}</p>
                                        </div>
                                    </div>
                                    {i === 0 && <Check size={16} className="text-blue-600" />}
                                </div>
                            ))}
                            <div className="px-2 py-2 mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-4">All Players</div>
                            {players.slice(2).map((p) => (
                                <div key={p.id} className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500">
                                            {p.name[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{p.name}</p>
                                            <p className="text-xs text-slate-400">{p.team} · {p.position}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 flex justify-end gap-3 px-4">
                            <span><span className="font-bold">↑↓</span> to navigate</span>
                            <span><span className="font-bold">↵</span> to select</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Design B */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-emerald-600 flex items-center gap-2">
                        <span className="bg-emerald-100 p-1.5 rounded-lg text-xs font-black">OPTION B</span>
                        비주얼 그리드 & 필터 (Visual Grid)
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        직관적인 카드 형태로 선수들을 브라우징합니다. 사진과 주요 정보를 한눈에 보며 탐색할 때 유리합니다.
                        상단 필터를 통해 빠르게 그룹을 좁힐 수 있습니다.
                    </p>
                </div>
                <div className="p-12 bg-slate-50 min-h-[500px]">

                    {/* Filter Bar */}
                    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 mb-6 flex justify-between items-center shadow-sm">
                        <div className="flex gap-2">
                            <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md shadow-slate-200">전체</button>
                            <button className="px-4 py-2 bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold">공격수</button>
                            <button className="px-4 py-2 bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold">미드필더</button>
                            <button className="px-4 py-2 bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold">수비수</button>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="검색..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none" />
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-4 gap-4">
                        {players.map(p => (
                            <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group flex flex-col items-center justify-center text-center space-y-3">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-emerald-50 group-hover:to-teal-50 flex items-center justify-center text-2xl font-black text-slate-300 group-hover:text-emerald-500 transition-all">
                                    {p.name[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg">{p.name}</h3>
                                    <div className="flex items-center justify-center gap-1.5 mt-1">
                                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{p.team}</span>
                                        <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">{p.position}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </section>


            {/* Design C */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-violet-600 flex items-center gap-2">
                        <span className="bg-violet-100 p-1.5 rounded-lg text-xs font-black">OPTION C</span>
                        사이드 리스트 (Split View)
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        좌측에 선수 목록을 고정하여, **선수를 빠르게 전환하면서 데이터를 비교**할 때 가장 강력합니다.
                        이메일 클라이언트나 맥 Finder와 유사한 2단 구조입니다.
                    </p>
                </div>
                <div className="bg-white h-[600px] flex border-t border-slate-200">

                    {/* Secondary Sidebar */}
                    <div className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col">
                        <div className="p-4 border-b border-slate-100 sticky top-0 bg-slate-50 z-10">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Players</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input type="text" placeholder="Filter..." className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-violet-400" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {players.map((p, i) => (
                                <button key={p.id} className={clsx(
                                    "w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all",
                                    i === 0 ? "bg-white shadow-sm ring-1 ring-slate-200" : "hover:bg-slate-100/50"
                                )}>
                                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0", i === 0 ? "bg-violet-100 text-violet-600" : "bg-slate-200 text-slate-500")}>
                                        {p.name[0]}
                                    </div>
                                    <div>
                                        <p className={clsx("text-sm font-bold", i === 0 ? "text-slate-900" : "text-slate-600")}>{p.name}</p>
                                        <p className="text-[10px] text-slate-400">{p.team}</p>
                                    </div>
                                    {i === 0 && <ChevronRight size={14} className="ml-auto text-violet-400" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Preview */}
                    <div className="flex-1 bg-white p-8 overflow-hidden relative">
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-4xl font-black text-slate-300">손</div>
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900">손흥민</h1>
                                    <p className="text-slate-500 font-medium">Tottenham Hotspur · FW</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="h-32 rounded-2xl bg-slate-50 border border-slate-100 p-6">
                                    <div className="text-xs font-bold text-slate-400 uppercase">CMJ Height</div>
                                    <div className="text-3xl font-black text-slate-900 mt-2">52.4 <span className="text-sm font-medium text-slate-400">cm</span></div>
                                </div>
                                <div className="h-32 rounded-2xl bg-slate-50 border border-slate-100 p-6">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Max Force</div>
                                    <div className="text-3xl font-black text-slate-900 mt-2">3402 <span className="text-sm font-medium text-slate-400">N</span></div>
                                </div>
                            </div>
                            <div className="h-64 rounded-2xl bg-slate-50 border border-slate-100"></div>
                        </div>
                    </div>

                </div>
            </section>
        </div>
    );
}
