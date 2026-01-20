'use client';

import { useState, useEffect } from 'react';
import EquipmentUsageDashboard from '@/components/EquipmentUsageDashboard';
import { Loader2 } from 'lucide-react';

export default function YoonMainDashboardPage() {
    const [measurements, setMeasurements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all measurements with profile data for player names
                const res = await fetch('/api/measurements?period=all');
                const json = await res.json();
                setMeasurements(json.measurements || []);
            } catch (e) {
                console.error('Error fetching measurements:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-64px)] items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="ml-3 text-slate-500 font-medium">데이터 로딩 중...</span>
            </div>
        );
    }

    return <EquipmentUsageDashboard measurements={measurements} />;
}
