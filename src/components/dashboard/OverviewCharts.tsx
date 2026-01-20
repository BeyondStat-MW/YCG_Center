"use client";

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, Label
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const DEVICE_COLORS = [
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Violet
    "#ec4899", // Pink
];

type ChartProps = {
    dailyStats: {
        test_date: string;
        device_type: string;
        test_count: number;
    }[];
};

export function DeviceUsageChart({ dailyStats }: ChartProps) {
    const data = dailyStats.reduce((acc, curr) => {
        const existing = acc.find(d => d.name === curr.device_type);
        if (existing) {
            existing.value += curr.test_count;
        } else {
            acc.push({ name: curr.device_type, value: curr.test_count });
        }
        return acc;
    }, [] as { name: string; value: number }[]);

    const totalDevices = data.length;

    return (
        <Card className="h-full border-none shadow-sm">
            <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-800">Device Usage</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={90}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />
                                ))}
                                <Label
                                    position="center"
                                    content={({ viewBox }) => {
                                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                            return (
                                                <text
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                >
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={viewBox.cy}
                                                        className="fill-3xl font-bold text-slate-900 text-3xl font-bold"
                                                    >
                                                        {totalDevices}
                                                    </tspan>
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={(viewBox.cy || 0) + 24}
                                                        className="fill-muted-foreground text-xs"
                                                    >
                                                        Devices
                                                    </tspan>
                                                </text>
                                            )
                                        }
                                    }}
                                />
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export function TrendChart({ dailyStats }: ChartProps) {
    const sorted = [...dailyStats].sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());

    const dataMap = sorted.reduce((acc, curr) => {
        const date = new Date(curr.test_date).toLocaleDateString([], { month: 'short', day: 'numeric' });
        if (!acc[date]) acc[date] = 0;
        acc[date] += curr.test_count;
        return acc;
    }, {} as Record<string, number>);

    const data = Object.entries(dataMap).map(([date, count]) => ({
        date,
        count
    })).slice(-14);

    return (
        <Card className="h-full border-none shadow-sm">
            <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-800">Total Activity</CardTitle>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                    Latest: {new Date().toLocaleDateString()}
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} barSize={32}>
                            <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="4 4" />
                            <XAxis
                                dataKey="date"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                tick={{ fill: '#64748B' }}
                            />
                            <YAxis
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#64748B' }}
                            />
                            <Tooltip
                                cursor={{ fill: '#F1F5F9' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar
                                dataKey="count"
                                fill="#F8FAFC"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                radius={[4, 4, 0, 0]}
                            />
                            {/* Note: User image shows blank area "Monthly Trend Coming Soon". 
                                 I'm providing a real chart but styling it minimally to match the clean look.
                                 Applying a very light fill with blue stroke.
                             */}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
