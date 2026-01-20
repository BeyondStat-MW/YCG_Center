'use client';

import { useState, useEffect } from 'react';
import DeepAnalysisDashboard from '@/components/DeepAnalysisDashboard';
import { Loader2 } from 'lucide-react';

export default function DeepAnalysisPage() {
    const [measurements, setMeasurements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/measurements?period=season');
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
                <span className="ml-3 text-slate-500 font-medium">Loading Deep Analysis...</span>
            </div>
        );
    }

    return <DeepAnalysisDashboard measurements={measurements} />;
}
