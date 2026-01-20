"use client"

import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface SparkMetricCardProps {
    title: string;
    value: string | number;
    unit?: string;
    data: { value: number }[]; // 7-day trend
    trend?: number; // percent change
    status?: string;
    color?: "orange" | "blue" | "emerald" | "rose";
}

const colorMap = {
    orange: "#f97316",
    blue: "#2563eb",
    emerald: "#10b981",
    rose: "#e11d48", // red-600
};

export function SparkMetricCard({
    title,
    value,
    unit,
    data,
    trend,
    status,
    color = "blue"
}: SparkMetricCardProps) {

    const hexColor = colorMap[color];
    const isPositive = trend && trend > 0;

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 flex flex-col justify-between h-[160px] hover:shadow-md transition-shadow relative overflow-hidden">

            {/* Top Row: Title & Status */}
            <div className="flex justify-between items-start z-10">
                <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">{title}</h3>
                {status && (
                    <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                        status === "Optimal" ? "bg-emerald-100 text-emerald-700" :
                            status === "Warning" ? "bg-rose-100 text-rose-700" :
                                "bg-slate-100 text-slate-600"
                    )}>
                        {status}
                    </span>
                )}
            </div>

            {/* Middle: Value */}
            <div className="mt-2 z-10">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900 tracking-tight">{value}</span>
                    <span className="text-xs font-medium text-slate-400">{unit}</span>
                </div>
                {trend !== undefined && (
                    <div className={cn(
                        "flex items-center text-xs font-bold mt-1",
                        isPositive ? "text-emerald-600" : "text-rose-600"
                    )}>
                        {isPositive ? "▲" : "▼"} {Math.abs(trend)}% <span className="text-slate-400 font-medium ml-1">vs last week</span>
                    </div>
                )}
            </div>

            {/* Bottom: Sparkline (Absolute positioned at bottom) */}
            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`color${color}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={hexColor} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={hexColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={hexColor}
                            fillOpacity={1}
                            fill={`url(#color${color})`}
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
