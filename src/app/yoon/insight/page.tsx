'use client';

import { useState, useEffect } from 'react';
import DeepAnalysisDashboard from '@/components/DeepAnalysisDashboard';
import { Loader2 } from 'lucide-react';

export default function InsightPage() {
    const [measurements, setMeasurements] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [measurementsRes, profilesRes] = await Promise.all([
                    fetch('/api/measurements?period=season'),
                    fetch('/api/profiles')
                ]);

                const measurementsJson = await measurementsRes.json();
                const profilesJson = await profilesRes.json();

                setMeasurements(measurementsJson.measurements || []);
                setProfiles(profilesJson.profiles || []);
            } catch (e) {
                console.error('Error fetching insight data:', e);
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
                <span className="ml-3 text-slate-500 font-medium">Loading Insight Analysis...</span>
            </div>
        );
    }

    return <DeepAnalysisDashboard measurements={measurements} initialProfiles={profiles} />;
}

