import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, AudioWaveform } from "lucide-react";

interface ProMetricCardProps {
    title: string;
    value: string | number;
    unit?: string;
    trend?: number; // percent change
    status?: string; // "Optimal", "Risk", etc
    icon?: React.ReactNode;
    color?: "orange" | "blue" | "slate";
}

const colorMap = {
    orange: "text-orange-500",
    blue: "text-blue-600",
    slate: "text-slate-600"
};

const bgMap = {
    orange: "bg-orange-50 text-orange-600",
    blue: "bg-blue-50 text-blue-600",
    slate: "bg-slate-50 text-slate-600"
};

export function ProMetricCard({
    title,
    value,
    unit,
    trend,
    status,
    icon,
    color = "orange"
}: ProMetricCardProps) {
    return (
        <div className="bg-white rounded-sm border border-slate-200 shadow-sm p-5 flex flex-col justify-between h-full min-h-[140px] hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</h3>
                {icon && (
                    <div className={cn("p-1.5 rounded-md", bgMap[color])}>
                        {icon}
                    </div>
                )}
            </div>

            <div className="mt-4">
                <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-slate-900 tracking-tight">{value}</span>
                    {unit && <span className="text-sm font-medium text-slate-400">{unit}</span>}
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
                {trend !== undefined && (
                    <div className={cn(
                        "flex items-center text-xs font-bold",
                        trend > 0 ? "text-emerald-600" : trend < 0 ? "text-rose-600" : "text-slate-400"
                    )}>
                        {trend > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                        {Math.abs(trend)}%
                    </div>
                )}
                {status && (
                    <span className={cn(
                        "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full",
                        status.includes("Risk") ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                    )}>
                        {status}
                    </span>
                )}
            </div>

            {/* Bottom Accent Line */}
            <div className={cn("mt-4 h-1 w-full rounded-full opacity-20",
                color === 'orange' ? "bg-orange-500" : "bg-blue-600"
            )} />
        </div>
    );
}
