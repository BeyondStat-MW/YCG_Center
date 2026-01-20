import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface InsightCardProps {
    title: string;
    value: string | number;
    unit?: string;
    status: string;
    statusColor?: string; // Hex code or Tailwind class prefix
    trend?: number; // percent change
    className?: string;
    description?: string;
}

export function InsightCard({
    title,
    value,
    unit,
    status,
    statusColor = "#10b981",
    trend,
    className,
    description
}: InsightCardProps) {
    // Apple/Premium Style: Glassmorphism, subtle borders, clean typo
    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl p-6 transition-all duration-300",
            "bg-white/5 backdrop-blur-xl border border-white/10",
            "hover:bg-white/10 hover:shadow-lg hover:shadow-black/5",
            "flex flex-col justify-between h-full min-h-[160px]",
            className
        )}>
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">{title}</h3>
                <div
                    className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border"
                    style={{
                        borderColor: `${statusColor}40`,
                        backgroundColor: `${statusColor}20`,
                        color: statusColor
                    }}
                >
                    {status}
                </div>
            </div>

            {/* Main Metric */}
            <div className="flex items-baseline gap-1">
                <span className="text-4xl font-semibold text-white tracking-tight">
                    {value}
                </span>
                {unit && (
                    <span className="text-sm font-medium text-white/40 ml-1">
                        {unit}
                    </span>
                )}
            </div>

            {/* Footer / Trend */}
            <div className="mt-4 flex items-center justify-between">
                {description && (
                    <p className="text-xs text-white/40 truncate max-w-[70%]">{description}</p>
                )}

                {trend !== undefined && (
                    <div className={cn(
                        "flex items-center text-xs font-semibold",
                        trend > 0 ? "text-emerald-400" : trend < 0 ? "text-rose-400" : "text-gray-400"
                    )}>
                        {trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> :
                            trend < 0 ? <ArrowDownRight className="w-3 h-3 mr-1" /> :
                                <Minus className="w-3 h-3 mr-1" />}
                        {Math.abs(trend).toFixed(1)}%
                    </div>
                )}
            </div>

            {/* Background Gradient Blob for aesthetics */}
            <div
                className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 blur-3xl pointer-events-none"
                style={{ backgroundColor: statusColor }}
            />
        </div>
    );
}
