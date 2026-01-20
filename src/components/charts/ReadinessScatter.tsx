"use client"

import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';

interface ReadinessScatterProps {
    data: any[]; // { name: string, eur: number, asymmetry: number, status: string }
}

export function ReadinessScatter({ data }: ReadinessScatterProps) {
    // X: Asymmetry (0 - 20%), Y: EUR (0.8 - 1.4)

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
                    <p className="font-bold text-slate-800 text-sm">{d.name}</p>
                    <p className="text-xs text-slate-500">EUR: <span className="font-mono text-slate-700">{d.eur}</span></p>
                    <p className="text-xs text-slate-500">Asym: <span className="font-mono text-slate-700">{d.asymmetry}%</span></p>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                {/* Quadrant Backgrounds (Simulated via ReferenceAreas or just Lines) */}
                {/* We will use lines to divide quadrants */}
                <ReferenceLine x={10} stroke="#cbd5e1" strokeDasharray="3 3" label={{ value: 'Risk Threshold (10%)', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }} />
                <ReferenceLine y={1.1} stroke="#cbd5e1" strokeDasharray="3 3" label={{ value: 'Low Elasticity (1.1)', position: 'insideBottomRight', fontSize: 10, fill: '#94a3b8' }} />

                <XAxis type="number" dataKey="asymmetry" name="Asymmetry" unit="%" domain={[0, 20]} stroke="#94a3b8" tick={{ fontSize: 10 }} label={{ value: 'Limb Asymmetry (%)', position: 'bottom', fontSize: 10, fill: '#64748b' }} />
                <YAxis type="number" dataKey="eur" name="EUR" domain={[0.8, 1.5]} stroke="#94a3b8" tick={{ fontSize: 10 }} label={{ value: 'Elasticity (EUR)', angle: -90, position: 'left', fontSize: 10, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                {/* Render Points - Color coded by logic */}
                {/* Recharts Scatter doesn't support dyn color per point easily without separate series. 
                    We will split data into 'Optimal' and 'Risk' series for coloring. */}

                <Scatter name="Optimal" data={data.filter(d => d.asymmetry <= 10 && d.eur >= 1.1)} fill="#10b981" shape="circle" />
                <Scatter name="Warning" data={data.filter(d => d.asymmetry > 10 || d.eur < 1.1)} fill="#ef4444" shape="triangle" />

            </ScatterChart>
        </ResponsiveContainer>
    )
}
