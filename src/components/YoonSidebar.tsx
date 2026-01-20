'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Users, Activity, Settings, Filter, Zap, ClipboardList, Database } from 'lucide-react';
import { clsx } from 'clsx';
import { useState, Suspense } from 'react';

const menuItems = [
    { name: '홈 대시보드', href: '/yoon', icon: LayoutDashboard },
    { name: '퍼포먼스 분석', href: '/yoon/analysis', icon: Activity },
    { name: '선수 리포트', href: '/yoon/player', icon: Users },
    { name: '재활 차트', href: '/yoon/rehab', icon: ClipboardList },
    { name: '카이저 400', href: '/yoon/keiser', icon: Zap },
    { name: '설정', href: '/yoon/settings', icon: Settings },
];

function SidebarContent() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();



    return (
        <aside className="w-64 bg-black text-white flex flex-col h-screen fixed left-0 top-0 z-50 border-r border-zinc-900">
            {/* 1. Logo Section */}
            {/* 1. Logo Section */}
            <div className="p-6">
                <img src="/ycg-logo-full.png" alt="윤청구 퍼포먼스 센터" className="w-full h-auto object-contain" />
            </div>

            {/* 2. Menu Navigation */}
            <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/yoon' && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20 font-bold"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white font-medium"
                            )}
                        >
                            <Icon size={20} className={clsx("transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-500 group-hover:text-blue-400")} />
                            <span className="text-sm">{item.name}</span>
                        </Link>
                    );
                })}

                <div className="my-4 border-t border-slate-800 mx-2"></div>
                <div className="px-2 mb-2"><span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest pl-2">Linked Platform</span></div>

                <a
                    href="https://beyondstat.streamlit.app/Yongin_FC"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-slate-400 hover:bg-slate-800 hover:text-white font-medium"
                >
                    <Database size={20} className="transition-transform group-hover:scale-110 text-slate-500 group-hover:text-emerald-400" />
                    <span className="text-sm">용인 FC 대시보드</span>
                </a>
            </nav>

            {/* User Profile (Bottom) */}
            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-black">Admin</div>
                    <div>
                        <p className="text-xs font-bold text-white">Administrator</p>
                        <p className="text-[10px] text-slate-500">System Manager</p>
                    </div>
                </div>
            </div>

            {/* BeyondStat Branding (Bottom) */}
            <div className="p-4 bg-black/40 flex flex-col items-center justify-center">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Powered by</p>
                <img src="/beyondstat-logo.png" alt="BeyondStat" className="h-6 opacity-80" />
            </div>
        </aside>
    );
}

export default function YoonSidebar() {
    return (
        <Suspense fallback={<div className="w-64 bg-black h-screen border-r border-zinc-900" />}>
            <SidebarContent />
        </Suspense>
    );
}
