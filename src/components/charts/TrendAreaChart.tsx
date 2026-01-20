"use client"

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
    { name: "Jan", total: 40 },
    { name: "Feb", total: 65 },
    { name: "Mar", total: 120 },
    { name: "Apr", total: 90 },
    { name: "May", total: 150 },
    { name: "Jun", total: 180 },
]

export function TrendAreaChart() {
    return (
        <Card className="col-span-3 lg:col-span-2">
            <CardHeader>
                <CardTitle>Monthly Activity</CardTitle>
                <CardDescription>Test volume over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
                            itemStyle={{ color: "#f3f4f6" }}
                        />
                        <Area
                            type="monotone"
                            dataKey="total"
                            stroke="#8884d8"
                            fillOpacity={0.2}
                            fill="#8884d8"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
