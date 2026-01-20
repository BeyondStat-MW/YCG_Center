"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, ReferenceArea } from 'recharts';

// Data Format: { date: string, dailyLoad: number, acute: number, chronic: number, ratio: number }
interface ACWRChartProps {
    data: any[];
}

export function ACWRChart({ data }: ACWRChartProps) {
    if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-slate-400">Not enough data for ACWR</div>;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                {/* Background Zones for Ratio (Right Axis) */}
                {/* Ideally we use ReferenceArea but mapping to 2nd axis is tricky in Recharts mix. 
                    We will stick to lines for zones */}

                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    yAxisId="left"
                    orientation="left"
                    stroke="#f97316"
                    tick={{ fontSize: 10, fill: '#f97316' }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: 'Daily Load (AU)', angle: -90, position: 'insideLeft', fill: '#f97316', fontSize: 10 }}
                />
                <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#64748b"
                    domain={[0, 2.0]}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: 'A:C Ratio', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 10 }}
                />

                <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                />

                {/* Sweet Spot Zone (0.8 - 1.3) roughly */}
                {/* <ReferenceArea yAxisId="right" y1={0.8} y2={1.3} fill="#10b981" fillOpacity={0.1} /> */}

                <Bar yAxisId="left" dataKey="dailyLoad" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} fillOpacity={0.8} name="Daily Load" />

                <Line yAxisId="right" type="monotone" dataKey="ratio" stroke="#1e293b" strokeWidth={2} dot={{ r: 3 }} name="ACWR" />

                {/* Sweet Spot Lines */}
                <Line yAxisId="right" type="monotone" dataKey={() => 1.3} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} dot={false} name="Upper Limit" />
                <Line yAxisId="right" type="monotone" dataKey={() => 0.8} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} dot={false} name="Lower Limit" />

            </ComposedChart>
        </ResponsiveContainer>
    )
}
