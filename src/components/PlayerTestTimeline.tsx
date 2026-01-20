
import { FC, useMemo } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';


interface Measurement {
    id: string;
    recorded_at: string;
    test_type: string;
    metrics: Record<string, any>;
    profiles?: { name: string; id: string; };
    player_id?: string;
}

interface TimelineProps {
    measurements: Measurement[];
}

export const PlayerTestTimeline: FC<TimelineProps> = ({ measurements }) => {
    // 1. Process data for timeline
    const timelineData = useMemo(() => {
        if (!measurements || measurements.length === 0) return null;

        // Group by Date and Device
        const testsByDate: Record<string, Set<string>> = {};

        // Track last test date AND count
        const deviceLastTest: Record<string, { date: Date, count: number }> = {};

        // Define devices based on test_type
        const getDeviceName = (test: string, sub: string) => {
            const t = test.toLowerCase();
            const s = sub.toLowerCase();
            if (t === 'nordbord' || s.includes('nordbord')) return 'NordBord';
            if (t === 'forceframe' || s.includes('forceframe') || s.includes('hip') || s.includes('shoulder') || s.includes('adductor')) return 'ForceFrame';
            if (t === 'forcedecks' || s.includes('jump') || s.includes('cmj') || s.includes('sj') || s.includes('hop')) return 'ForceDecks';
            if (t === 'smartspeed' || s.includes('sprint')) return 'SmartSpeed';
            return 'Manual Record';
        };

        let minDate = new Date();
        const now = new Date();

        measurements.forEach(m => {
            const date = new Date(m.recorded_at);
            if (date < minDate) minDate = date;

            const dateStr = date.toISOString().split('T')[0];
            const subName = m.metrics?.testTypeName || m.metrics?.test_name || m.metrics?.testType || '';
            const device = getDeviceName(m.test_type, subName);

            if (!testsByDate[dateStr]) testsByDate[dateStr] = new Set();
            testsByDate[dateStr].add(device);

            // Update last test date for device
            if (!deviceLastTest[device]) deviceLastTest[device] = { date: date, count: 0 };

            // Keep the LATEST date
            if (date > deviceLastTest[device].date) {
                deviceLastTest[device].date = date;
            }
            // Increment count per measurement
            deviceLastTest[device].count += 1;
        });

        // Ensure minDate is at least 3 months ago if no data or very recent
        if (now.getTime() - minDate.getTime() < 1000 * 60 * 60 * 24 * 30) {
            minDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 90);
        }

        const totalDays = (now.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);

        return {
            minDate,
            now,
            totalDays,
            testsByDate,
            deviceLastTest
        };
    }, [measurements]);

    if (!timelineData) return null;

    const { minDate, now, totalDays, testsByDate, deviceLastTest } = timelineData;

    // Helper to position dots
    const getLeftPos = (dateStr: string) => {
        const d = new Date(dateStr);
        const diff = d.getTime() - minDate.getTime();
        const days = diff / (1000 * 60 * 60 * 24);
        return Math.max(0, Math.min(100, (days / totalDays) * 100));
    };

    const DEVICES = [
        { name: 'NordBord', color: 'bg-indigo-500', text: 'text-indigo-600', ring: 'ring-indigo-200' },
        { name: 'ForceFrame', color: 'bg-orange-500', text: 'text-orange-600', ring: 'ring-orange-200' },
        { name: 'ForceDecks', color: 'bg-blue-500', text: 'text-blue-600', ring: 'ring-blue-200' },
        { name: 'SmartSpeed', color: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-200' },
        { name: 'Manual Record', color: 'bg-slate-500', text: 'text-slate-600', ring: 'ring-slate-200' }
    ];

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                    <Calendar size={18} />
                </div>
                <h3 className="font-bold text-slate-800">최근 측정 및 타임라인 (Timeline)</h3>
            </div>

            {/* Timeline Graphic */}
            <div className="relative w-full h-8 bg-slate-50 rounded-full mb-10 mt-4 mx-2 w-[calc(100%-16px)]">
                {/* Connector Line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 rounded-full pointer-events-none"></div>

                {/* Date Markers */}
                {Object.entries(testsByDate).map(([date, devices]) => {
                    const left = getLeftPos(date);
                    return (
                        <div
                            key={date}
                            style={{ left: `${left}%` }}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group cursor-pointer z-10"
                        >
                            <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-150 ${Array.from(devices).length > 1 ? 'bg-purple-500' : DEVICES.find(d => d.name === Array.from(devices)[0])?.color || 'bg-slate-400'}`}></div>

                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                <span className="font-bold">{date}</span>
                                <div className="text-[10px] text-slate-300 mt-0.5">{Array.from(devices).join(', ')}</div>
                            </div>
                        </div>
                    );
                })}

                {/* Start Label */}
                <div className="absolute top-full mt-2 left-0 -translate-x-2 text-[10px] font-bold text-slate-400">
                    {minDate.toLocaleDateString()} (Start)
                </div>
                {/* End Label */}
                <div className="absolute top-full mt-2 right-0 translate-x-2 text-[10px] font-bold text-slate-400">
                    {now.toLocaleDateString()} (Today)
                </div>
            </div>

            {/* Device Status Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {DEVICES.map(device => {
                    const data = deviceLastTest[device.name];
                    const lastRunDate = data?.date;
                    const count = data?.count || 0;
                    const daysAgo = lastRunDate ? Math.floor((now.getTime() - lastRunDate.getTime()) / (1000 * 60 * 60 * 24)) : null;

                    if (device.name === 'Manual Record' && count === 0) return null;

                    return (
                        <div key={device.name} className={`p-4 rounded-2xl border ${daysAgo !== null && daysAgo > 30 ? 'border-red-100 bg-red-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs font-black uppercase tracking-wider ${device.text}`}>{device.name}</span>
                                {daysAgo !== null && daysAgo > 30 && <AlertCircle size={14} className="text-red-500" />}
                            </div>

                            {lastRunDate ? (
                                <div>
                                    <div className="text-2xl font-black text-slate-800 tracking-tight">
                                        {daysAgo === 0 ? 'Today' : `${daysAgo}일 전`}
                                    </div>
                                    <div className="flex justify-between items-end mt-1">
                                        <div className="text-[10px] text-slate-400 font-bold">
                                            Last: {lastRunDate.toLocaleDateString()}
                                        </div>
                                        <div className="px-2 py-0.5 bg-white rounded-md shadow-sm text-[10px] font-bold text-slate-600 border border-slate-100">
                                            {count}회
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm font-bold text-slate-400 py-3">
                                    기록 없음
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
