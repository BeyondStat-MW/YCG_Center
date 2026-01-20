"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Activity, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
    { name: "Home", href: "/yoon", icon: LayoutDashboard },
    { name: "선수 대시보드", href: "/yoon/player", icon: Users },
    { name: "단일 대시보드", href: "/yoon/single", icon: Activity },
    { name: "설정", href: "/yoon/settings", icon: Settings },
];

export function YoonHeader() {
    const pathname = usePathname();

    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo Area */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold font-mono">Y</span>
                    </div>
                    <span className="font-bold text-slate-800 tracking-tight hidden md:block">
                        Yoon Performance Center
                    </span>
                </div>

                {/* Main Navigation - Centered */}
                <nav className="flex items-center gap-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (item.href !== "/yoon" && pathname.startsWith(item.href));

                        // Handle Home exact match vs sub-routes
                        const isHomeExact = item.href === "/yoon" && pathname === "/yoon";
                        const activeState = (item.href === "/yoon" ? isHomeExact : isActive);

                        return (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "h-10 px-4 rounded-md flex items-center gap-2 transition-all",
                                        activeState
                                            ? "bg-slate-100 text-slate-900 font-bold shadow-sm"
                                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4", activeState && "text-blue-600")} />
                                    <span>{item.name}</span>
                                </Button>
                            </Link>
                        );
                    })}
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    <div className="hidden md:flex items-center text-xs text-slate-400 font-medium px-3 py-1 bg-slate-50 rounded-full border border-slate-100 mr-2">
                        Admin Access
                    </div>
                    <Button size="icon" variant="ghost" className="text-slate-400 hover:text-rose-600">
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
