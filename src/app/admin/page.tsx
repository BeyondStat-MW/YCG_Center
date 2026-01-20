
'use client';

import Link from 'next/link';
import { Search, Bell, Plus, Users, CheckCircle, AlertCircle, Activity, MoreHorizontal, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';

export default function AdminDashboard() {
    const tenants = [
        {
            id: 'tnt_yoon_01',
            name: 'Yoon Chung-gu Performance Center',
            slug: 'JYDON',
            status: 'Active',
            config: 'Standard',
            players: 2343,
            link: '/yoon'
        },
        {
            id: 'tnt_yongin_02',
            name: 'Yongin FC',
            slug: 'JYONGIN',
            status: 'Active',
            config: 'Standard',
            players: 156,
            link: '#'
        },
        {
            id: 'tnt_kleague_03',
            name: 'K-League Youth',
            slug: 'JKLEAGUE',
            status: 'Active',
            config: 'Standard',
            players: 890,
            link: '#'
        }
    ];

    return (
        <div className="space-y-8">
            {/* 1. Top Header */}
            <header className="flex justify-between items-center">
                <div className="w-[400px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search tenants, players, or datasets..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                </div>
                <div className="relative">
                    <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#F8FAFC]"></span>
                    </button>
                </div>
            </header>

            {/* 2. Page Title & Action */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Tenant Management</h2>
                    <p className="text-slate-500 text-sm mt-1">Manage organizations and monitor global system health.</p>
                </div>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all shadow-indigo-200">
                    <Plus size={16} />
                    Add New Tenant
                </button>
            </div>

            {/* 3. KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Tenants</p>
                        <p className="text-2xl font-bold text-slate-900 mt-0.5">3</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Active Systems</p>
                        <p className="text-2xl font-bold text-slate-900 mt-0.5">3</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Pending Issues</p>
                        <p className="text-2xl font-bold text-slate-900 mt-0.5">2</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5">
                    <div className="p-3 bg-sky-50 text-sky-600 rounded-lg">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Sync Status</p>
                        <p className="text-xl font-bold text-slate-900 mt-0.5">Healthy</p>
                    </div>
                </div>
            </div>

            {/* 4. Filter Tabs */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex border-b border-slate-100 mb-6">
                    <button className="pb-3 border-b-2 border-slate-900 text-slate-900 font-semibold text-sm px-1 mr-6">All Organizations</button>
                    <button className="pb-3 text-slate-500 font-medium text-sm px-1 hover:text-slate-700 transition">Configuration</button>
                    <button className="pb-3 text-slate-500 font-medium text-sm px-1 hover:text-slate-700 transition ml-6">Access Logs</button>
                </div>

                {/* 5. Tenants Table */}
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th className="text-xs font-bold text-slate-400 uppercase tracking-wider py-4 pl-4">Tenant</th>
                            <th className="text-xs font-bold text-slate-400 uppercase tracking-wider py-4">Slug</th>
                            <th className="text-xs font-bold text-slate-400 uppercase tracking-wider py-4">Status</th>
                            <th className="text-xs font-bold text-slate-400 uppercase tracking-wider py-4">Config Level</th>
                            <th className="text-xs font-bold text-slate-400 uppercase tracking-wider py-4 text-right pr-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tenants.map((tenant) => (
                            <tr key={tenant.id} className="group hover:bg-slate-50 transition-colors">
                                <td className="py-5 pl-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 uppercase">
                                            {tenant.slug.slice(0, 2)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">{tenant.name}</h4>
                                            <span className="text-xs text-slate-400 font-mono">ID: {tenant.id}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-5">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold tracking-wide">
                                        {tenant.slug}
                                    </span>
                                </td>
                                <td className="py-5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                        <span className="text-sm text-slate-600 font-medium">{tenant.status}</span>
                                    </div>
                                </td>
                                <td className="py-5">
                                    <span className="text-sm text-slate-500">{tenant.config}</span>
                                </td>
                                <td className="py-5 text-right pr-4">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link
                                            href={tenant.link}
                                            className={clsx(
                                                "p-2 rounded-lg border border-slate-200 hover:bg-white hover:border-indigo-300 hover:text-indigo-600 transition-all",
                                                tenant.link === '#' && "cursor-not-allowed opacity-50"
                                            )}
                                        >
                                            <ExternalLink size={16} />
                                        </Link>
                                        <button className="p-2 rounded-lg border border-slate-200 hover:bg-white hover:text-slate-900 text-slate-400 transition-all">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination Dummy */}
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-100">
                    <span className="text-xs text-slate-400">Showing 3 tenants</span>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 border border-slate-200 rounded text-xs font-medium text-slate-500 hover:bg-white disabled:opacity-50" disabled>Previous</button>
                        <button className="px-3 py-1.5 border border-slate-200 rounded text-xs font-medium text-slate-500 hover:bg-white disabled:opacity-50" disabled>Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
