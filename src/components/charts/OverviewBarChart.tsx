"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
    { name: "CMJ", total: 152 },
    { name: "Nordic", total: 120 },
    { name: "Ads / Abs", total: 98 },
    { name: "Squat Jump", total: 85 },
    { name: "ISO Belt", total: 65 },
]

export function OverviewBarChart() {
    return (
        <Card className="col-span-3 lg:col-span-1">
            <CardHeader>
                <CardTitle>Top Protocols</CardTitle>
                <CardDescription>Most frequently administered tests</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            tick={{ fill: "#888888", fontSize: 12 }}
                            width={80}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
                            itemStyle={{ color: "#f3f4f6" }}
                        />
                        <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
