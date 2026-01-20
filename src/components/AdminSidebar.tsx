
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, BarChart2, Database, Shield, Settings, Box } from 'lucide-react';
import { clsx } from 'clsx';

const menuItems = [
    { name: 'Tenants', href: '/admin', icon: Users },
    { name: 'Global Stats', href: '/admin/stats', icon: BarChart2 },
    { name: 'Data Sources', href: '/admin/sources', icon: Database },
    { name: 'Security', href: '/admin/security', icon: Shield },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-[#0F172A] text-white flex flex-col h-screen fixed left-0 top-0 z-50 border-r border-gray-800">
            {/* 1. Brand Section */}
            <div className="p-6 flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg">
                    <Box size={24} fill="white" className="text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white tracking-tight">
                        BeyondStat
                    </h1>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                        Admin Central
                    </p>
                </div>
            </div>

            {/* 2. Menu Navigation */}
            <nav className="flex-1 px-4 space-y-1 mt-6">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={clsx(
                                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            )}
                        >
                            <Icon size={18} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* 3. Footer Sys Info */}
            <div className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs text-gray-400 font-mono">System Operational</span>
                </div>
                <div className="text-[10px] text-gray-600">
                    v2.5.0-beta
                </div>
            </div>
        </aside>
    );
}
