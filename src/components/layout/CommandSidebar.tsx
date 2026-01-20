"use client"

import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Activity, Settings, Filter } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function CommandSidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: "Overview", href: "/yoon", icon: LayoutDashboard },
        { name: "Player Detail", href: "/yoon/player", icon: Users },
        { name: "Single Analysis", href: "/yoon/single", icon: Activity },
        { name: "Settings", href: "/yoon/settings", icon: Settings },
    ];

    return (
        <aside className="w-[260px] bg-[#0f172a] text-white flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 z-50">
            {/* 1. Header Logo Area */}
            <div className="p-6">
                <h1 className="text-xl font-bold text-yellow-500 leading-tight">
                    Yoon Center<br />
                    <span className="text-white text-sm font-normal opacity-80">Performance Ops</span>
                </h1>
            </div>

            {/* 2. Navigation Buttons (Full Width, Yellow Active) */}
            <nav className="flex flex-col gap-1 px-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}>
                            <div className={cn(
                                "flex items-center px-4 py-3 rounded-md transition-all font-medium text-sm",
                                isActive
                                    ? "bg-yellow-500 text-slate-900 font-bold shadow-md"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}>
                                <item.icon className={cn("w-4 h-4 mr-3", isActive ? "text-slate-900" : "opacity-70")} />
                                {item.name}
                            </div>
                        </Link>
                    )
                })}
            </nav>

            {/* 3. Filters Section (Embedded in Sidebar) */}
            <div className="mt-8 px-6">
                <div className="flex items-center gap-2 mb-4 text-slate-400 border-b border-slate-700 pb-2">
                    <Filter className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Filters</span>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Select Player</label>
                        <select className="w-full bg-[#1e293b] border border-slate-700 rounded text-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-yellow-500">
                            <option>Kim Min-jae</option>
                            <option>Son Heung-min</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Period</label>
                        <select className="w-full bg-[#1e293b] border border-slate-700 rounded text-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-yellow-500">
                            <option>All History</option>
                            <option>This Season</option>
                            <option>Last Month</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Category</label>
                        <select className="w-full bg-[#1e293b] border border-slate-700 rounded text-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-yellow-500">
                            <option>Physical Profile</option>
                            <option>Injury Risk</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto p-6 text-[10px] text-slate-600">
                Design: Performance Director AI
            </div>
        </aside>
    )
}
