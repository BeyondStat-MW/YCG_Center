"use client";

import { Card, Title, AreaChart, BarList, DonutChart, Legend } from "@tremor/react";

type StackedChartData = {
    date: string;
    [key: string]: string | number; // "ForceDecks": 10, "NordBord": 5, etc.
};

interface DashboardChartsProps {
    trendData: StackedChartData[];
    categories: string[];
    colors: string[];
}

const dataFormatter = (number: number) => {
    return Intl.NumberFormat("us").format(number).toString();
};

export default function DashboardCharts({ trendData, categories, colors }: DashboardChartsProps) {
    return (
        <div className="grid grid-cols-1 gap-6">
            {/* Full Width Stacked Area Chart */}
            <Card className="bg-white shadow-sm rounded-xl ring-1 ring-zinc-200/50 p-6">
                <Title>날짜별 장비 사용 현황 (Cumulative)</Title>
                <AreaChart
                    className="h-72 mt-4"
                    data={trendData}
                    index="date"
                    categories={categories}
                    colors={colors as any}
                    valueFormatter={dataFormatter}
                    yAxisWidth={40}
                    stack={true}
                    showLegend={true}
                    curveType="monotone"
                />
            </Card>
        </div>
    );
}
