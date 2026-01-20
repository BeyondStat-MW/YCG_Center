"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    User,
    BarChart2,
    Settings,
    Filter,
    ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamConfig } from "@/lib/config";

export function Sidebar({ teamId, teamConfig }: { teamId: string, teamConfig: TeamConfig | null }) {
    const pathname = usePathname();

    const branding = {
        title: teamConfig?.theme_config?.portal_title || teamConfig?.name || 'BeyondStat Pro',
        subtitle: teamConfig?.slug === 'yoon' ? 'Performance Ops' : 'Elite Performance'
    };

    const primaryColor = teamConfig?.theme_config?.primary_color || "#0F172A";
    const accentColor = teamConfig?.theme_config?.accent_color || "#FBBF24";

    const navItems = [
        { name: 'Overview', href: `/${teamId}`, icon: LayoutDashboard },
        { name: 'Player Detail', href: `/${teamId}/player`, icon: User },
        { name: 'Single Analysis', href: `/${teamId}/analysis`, icon: BarChart2 },
        { name: 'Settings', href: `/${teamId}/settings`, icon: Settings },
    ];

    return (
        <div
            className="flex flex-col h-full text-zinc-400 w-64 flex-shrink-0 border-r border-zinc-800"
            style={{ backgroundColor: primaryColor }}
        >
            {/* 1. Branding */}
            <div className="p-6">
                <h1 className="text-xl font-bold tracking-tight" style={{ color: accentColor }}>{branding.title}</h1>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest mt-1">{branding.subtitle}</p>
            </div>

            {/* 2. Navigation */}
            <div className="flex-1 px-3 py-2 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                                isActive
                                    ? "text-[#0F172A]"
                                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                            )}
                            style={isActive ? { backgroundColor: accentColor } : {}}
                        >
                            <item.icon className={cn("w-4 h-4 transition-colors",
                                isActive ? "text-[#0F172A]" : "text-zinc-500 group-hover:text-zinc-300"
                            )} />
                            {item.name}
                        </Link>
                    );
                })}

                {/* Filters Section */}
                <div className="mt-10 px-3">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-3 h-3 text-zinc-500" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Filters</span>
                    </div>

                    <div className="space-y-4">
                        <FilterDropdown label="Select Player" value="Kim Min-jae" />
                        <FilterDropdown label="Period" value="All History" />
                        <FilterDropdown label="Category" value="Physical Profile" />
                    </div>
                </div>
            </div>

            {/* 3. Footer */}
            <div className="p-4 border-t border-zinc-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center border border-zinc-700">
                    <span className="text-xs font-bold" style={{ color: accentColor }}>N</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-300">BeyondStat AI</span>
                    <span className="text-[9px] text-zinc-500">Performance Director AI</span>
                </div>
            </div>
        </div>
    );
}

function FilterDropdown({ label, value }: { label: string, value: string }) {
    return (
        <div className="space-y-1.5 focus-within:outline-none group">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider ml-1">
                {label}
            </label>
            <div className="relative">
                <select className="w-full bg-[#1E293B] border border-zinc-800 text-zinc-300 text-xs rounded-md pl-3 pr-8 py-2 appearance-none focus:outline-none focus:ring-1 focus:ring-[#FBBF24]/50 cursor-pointer">
                    <option>{value}</option>
                </select>
                <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-zinc-300 transition-colors" />
            </div>
        </div>
    );
}
