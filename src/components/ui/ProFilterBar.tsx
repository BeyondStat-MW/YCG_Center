import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

export function ProFilterBar() {
    // This is a visual component simulating the filter bar from the reference image
    // In a real app, this would accept props for state management
    return (
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex flex-wrap gap-6 items-center sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium border-r border-slate-200 pr-6">
                <Filter className="w-4 h-4" />
                <span>Filters</span>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Player</label>
                <select className="bg-transparent text-sm font-semibold text-slate-700 outline-none border-none p-0 cursor-pointer min-w-[120px]">
                    <option>All Athletes</option>
                    <option>Rehab Group</option>
                    <option>U18</option>
                </select>
            </div>

            <div className="h-8 w-px bg-slate-100 mx-2" />

            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parameter</label>
                <select className="bg-transparent text-sm font-semibold text-slate-700 outline-none border-none p-0 cursor-pointer min-w-[160px]">
                    <option>Distance in speed zones</option>
                    <option>CMJ Height</option>
                    <option>Asymmetry %</option>
                </select>
            </div>

            <div className="h-8 w-px bg-slate-100 mx-2" />

            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Period</label>
                <select className="bg-transparent text-sm font-semibold text-slate-700 outline-none border-none p-0 cursor-pointer min-w-[100px]">
                    <option>Last Month</option>
                    <option>This Season</option>
                    <option>Last 7 Days</option>
                </select>
            </div>

            <div className="ml-auto">
                <Button variant="ghost" size="sm" className="text-blue-600 text-xs font-bold uppercase hover:bg-blue-50">
                    Reset Filters
                    <X className="w-3 h-3 ml-2" />
                </Button>
            </div>
        </div>
    )
}
