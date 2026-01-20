'use client';

import { useState, useMemo } from 'react';
import {
    Card,
    Metric,
    Text,
    Flex,
    Grid,
    BadgeDelta,
    ProgressBar,
    AreaChart,
    DonutChart,
    BarList,
    Table,
    TableHead,
    TableRow,
    TableHeaderCell,
    TableBody,
    TableCell,
    Badge,
    Title,
    Subtitle,
    DateRangePicker,
    Select,
    SelectItem,
    Callout,
    Legend,
} from '@tremor/react';
import {
    UserGroupIcon,
    HeartIcon,
    ExclamationTriangleIcon,
    BoltIcon,
    ClockIcon,
    ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

// Types
interface Measurement {
    id: string;
    recorded_at: string;
    test_type: string;
    metrics: Record<string, any>;
    profiles?: { name: string; id: string };
    player_id?: string;
}

interface Profile {
    id: string;
    name: string;
    position?: string;
}

interface DashboardProps {
    measurements: Measurement[];
    profiles: Profile[];
}

// Utility functions
const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
    });
};

const getConditionScore = (metrics: Record<string, any>): number => {
    // Calculate a condition score based on available metrics
    const keys = ['peakVerticalForceNewtons', 'concentricMeanPowerDividedByBWWatts', 'rsiModified'];
    let total = 0;
    let count = 0;
    keys.forEach(k => {
        if (typeof metrics[k] === 'number') {
            // Normalize values to 0-100 range
            total += Math.min(100, (metrics[k] / 30) * 100);
            count++;
        }
    });
    return count > 0 ? Math.round(total / count) : 50;
};

// Color palette for charts
const chartColors = ['indigo', 'cyan', 'amber', 'emerald', 'rose', 'violet'];

export default function TremorDashboard({ measurements, profiles }: DashboardProps) {
    // State for filters
    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
    const [positionFilter, setPositionFilter] = useState<string>('all');

    // =====================
    // KPI CALCULATIONS
    // =====================
    const kpis = useMemo(() => {
        const activePlayers = profiles.length;
        const lastMonthPlayers = Math.round(activePlayers * 0.95); // Simulated previous month
        const playerDelta = ((activePlayers - lastMonthPlayers) / lastMonthPlayers) * 100;

        // Calculate average team readiness from recent measurements
        const recentMeasurements = measurements.slice(0, 100);
        const conditionScores = recentMeasurements
            .filter(m => m.metrics)
            .map(m => getConditionScore(m.metrics));
        const avgReadiness = conditionScores.length > 0
            ? Math.round(conditionScores.reduce((a, b) => a + b, 0) / conditionScores.length)
            : 72;

        // Count injured players (simulated based on low condition scores)
        const injuredPlayers = measurements.filter(m =>
            m.metrics && getConditionScore(m.metrics) < 40
        ).length;

        return {
            totalPlayers: activePlayers,
            playerDelta: playerDelta.toFixed(1),
            teamReadiness: avgReadiness,
            injuredPlayers: Math.min(injuredPlayers, 5),
        };
    }, [measurements, profiles]);

    // =====================
    // CONDITION TREND DATA
    // =====================
    const conditionTrendData = useMemo(() => {
        const dateMap = new Map<string, { total: number; count: number }>();

        measurements.forEach(m => {
            if (!m.recorded_at || !m.metrics) return;
            const dateKey = m.recorded_at.split('T')[0];
            const score = getConditionScore(m.metrics);

            const existing = dateMap.get(dateKey) || { total: 0, count: 0 };
            existing.total += score;
            existing.count += 1;
            dateMap.set(dateKey, existing);
        });

        return Array.from(dateMap.entries())
            .map(([date, data]) => ({
                date: formatDate(date),
                'Condition Score': Math.round(data.total / data.count),
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-30); // Last 30 days
    }, [measurements]);

    // =====================
    // INJURY/BODY PART DATA
    // =====================
    const bodyPartData = useMemo(() => {
        // Get unique test types as a proxy for body parts/metrics areas
        const testTypeCounts = new Map<string, number>();

        measurements.forEach(m => {
            const testType = m.test_type || 'Other';
            testTypeCounts.set(testType, (testTypeCounts.get(testType) || 0) + 1);
        });

        return Array.from(testTypeCounts.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [measurements]);

    // =====================
    // POSITION DISTRIBUTION
    // =====================
    const positionData = useMemo(() => {
        const positionCounts = new Map<string, number>();

        profiles.forEach(p => {
            const position = p.position || 'Unknown';
            positionCounts.set(position, (positionCounts.get(position) || 0) + 1);
        });

        return Array.from(positionCounts.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [profiles]);

    // =====================
    // RECENT MEASUREMENTS TABLE
    // =====================
    const recentMeasurements = useMemo(() => {
        return measurements
            .slice(0, 10)
            .map(m => {
                const score = m.metrics ? getConditionScore(m.metrics) : 50;
                let status: 'Good' | 'Warning' | 'Critical' = 'Good';
                if (score < 40) status = 'Critical';
                else if (score < 60) status = 'Warning';

                return {
                    id: m.id,
                    player: m.profiles?.name || 'Unknown',
                    testType: m.test_type || 'N/A',
                    date: formatDate(m.recorded_at),
                    score,
                    status,
                };
            });
    }, [measurements]);

    // Position options for filter
    const positionOptions = useMemo(() => {
        const positions = new Set<string>();
        profiles.forEach(p => {
            if (p.position) positions.add(p.position);
        });
        return ['all', ...Array.from(positions)];
    }, [profiles]);

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            {/* ============ HEADER & FILTERS ============ */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <Title className="text-2xl font-bold text-gray-900">Performance Dashboard</Title>
                    <Subtitle className="text-gray-500">Real-time athlete monitoring and analytics</Subtitle>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <DateRangePicker
                        className="max-w-sm"
                        value={dateRange}
                        onValueChange={setDateRange}
                        enableSelect={false}
                        placeholder="Select date range"
                    />
                    <Select
                        value={positionFilter}
                        onValueChange={setPositionFilter}
                        placeholder="Position"
                        className="w-40"
                    >
                        {positionOptions.map(pos => (
                            <SelectItem key={pos} value={pos}>
                                {pos === 'all' ? 'All Positions' : pos}
                            </SelectItem>
                        ))}
                    </Select>
                </div>
            </div>

            {/* ============ KPI CARDS ============ */}
            <Grid numItems={1} numItemsMd={2} numItemsLg={3} className="gap-6">
                {/* Total Players */}
                <Card decoration="top" decorationColor="indigo">
                    <Flex justifyContent="start" className="space-x-4">
                        <div className="p-3 bg-indigo-500/10 rounded-full">
                            <UserGroupIcon className="h-8 w-8 text-indigo-500" />
                        </div>
                        <div>
                            <Text className="text-gray-500">Total Players</Text>
                            <Flex justifyContent="start" alignItems="baseline" className="space-x-3">
                                <Metric>{kpis.totalPlayers}</Metric>
                                <BadgeDelta deltaType={Number(kpis.playerDelta) >= 0 ? 'increase' : 'decrease'} size="sm">
                                    {kpis.playerDelta}%
                                </BadgeDelta>
                            </Flex>
                            <Text className="text-xs text-gray-400 mt-1">vs last month</Text>
                        </div>
                    </Flex>
                </Card>

                {/* Team Readiness */}
                <Card decoration="top" decorationColor="teal">
                    <Flex justifyContent="start" className="space-x-4">
                        <div className="p-3 bg-teal-500/10 rounded-full">
                            <BoltIcon className="h-8 w-8 text-teal-500" />
                        </div>
                        <div className="flex-1">
                            <Text className="text-gray-500">Team Readiness</Text>
                            <Metric>{kpis.teamReadiness}%</Metric>
                        </div>
                    </Flex>
                    <ProgressBar value={kpis.teamReadiness} color="teal" className="mt-4" />
                    <Text className="text-xs text-gray-400 mt-2">Average condition score</Text>
                </Card>

                {/* Injury Alert */}
                <Card decoration="top" decorationColor={kpis.injuredPlayers > 2 ? 'rose' : 'emerald'}>
                    <Flex justifyContent="start" className="space-x-4">
                        <div className={`p-3 rounded-full ${kpis.injuredPlayers > 2 ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                            <HeartIcon className={`h-8 w-8 ${kpis.injuredPlayers > 2 ? 'text-rose-500' : 'text-emerald-500'}`} />
                        </div>
                        <div>
                            <Text className="text-gray-500">Injury Alert</Text>
                            <Metric>{kpis.injuredPlayers}</Metric>
                            <Text className="text-xs text-gray-400 mt-1">players flagged</Text>
                        </div>
                    </Flex>
                    {kpis.injuredPlayers > 2 && (
                        <Callout
                            className="mt-4"
                            title="Attention Required"
                            icon={ExclamationTriangleIcon}
                            color="rose"
                        >
                            {kpis.injuredPlayers} players show low readiness scores
                        </Callout>
                    )}
                </Card>
            </Grid>

            {/* ============ MAIN ANALYTICS ============ */}
            <Grid numItems={1} numItemsLg={12} className="gap-6">
                {/* Condition Trend Chart - 8 columns */}
                <Card className="lg:col-span-8">
                    <Title>Season Condition Trend</Title>
                    <Subtitle className="text-gray-500">Daily team performance average</Subtitle>

                    <AreaChart
                        className="mt-6 h-72"
                        data={conditionTrendData}
                        index="date"
                        categories={['Condition Score']}
                        colors={['indigo']}
                        valueFormatter={(value) => `${value}%`}
                        showAnimation
                        showLegend={false}
                        curveType="natural"
                        yAxisWidth={40}
                    />
                </Card>

                {/* Distribution Charts - 4 columns */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Test Type Distribution */}
                    <Card>
                        <Title>Test Types</Title>
                        <Text className="text-gray-500">Measurement distribution</Text>

                        <DonutChart
                            className="mt-4 h-48"
                            data={bodyPartData}
                            category="value"
                            index="name"
                            colors={chartColors}
                            showAnimation
                            showTooltip
                        />
                        <Legend
                            className="mt-4"
                            categories={bodyPartData.map(d => d.name)}
                            colors={chartColors}
                        />
                    </Card>

                    {/* Position Breakdown */}
                    <Card>
                        <Title>Position Breakdown</Title>
                        <Text className="text-gray-500">Players by position</Text>

                        <BarList
                            data={positionData.slice(0, 5)}
                            className="mt-4"
                            color="indigo"
                        />
                    </Card>
                </div>
            </Grid>

            {/* ============ RECENT MEASUREMENTS TABLE ============ */}
            <Card>
                <Flex justifyContent="between" alignItems="center">
                    <div>
                        <Title>Recent Measurement Updates</Title>
                        <Subtitle className="text-gray-500">Latest athlete assessments</Subtitle>
                    </div>
                    <Badge icon={ClockIcon} color="gray">
                        Live updates
                    </Badge>
                </Flex>

                <Table className="mt-6">
                    <TableHead>
                        <TableRow>
                            <TableHeaderCell>Player</TableHeaderCell>
                            <TableHeaderCell>Test Type</TableHeaderCell>
                            <TableHeaderCell>Date</TableHeaderCell>
                            <TableHeaderCell className="text-right">Score</TableHeaderCell>
                            <TableHeaderCell className="text-right">Status</TableHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {recentMeasurements.map((item) => (
                            <TableRow key={item.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                                <TableCell>
                                    <Text className="font-medium text-gray-900">{item.player}</Text>
                                </TableCell>
                                <TableCell>
                                    <Text>{item.testType}</Text>
                                </TableCell>
                                <TableCell>
                                    <Text>{item.date}</Text>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Flex justifyContent="end" className="gap-2">
                                        <ArrowTrendingUpIcon className="h-4 w-4 text-gray-400" />
                                        <Text className="font-semibold">{item.score}</Text>
                                    </Flex>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge
                                        color={
                                            item.status === 'Good' ? 'emerald' :
                                                item.status === 'Warning' ? 'amber' : 'rose'
                                        }
                                        size="sm"
                                    >
                                        {item.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {recentMeasurements.length === 0 && (
                    <div className="py-12 text-center">
                        <Text className="text-gray-400">No recent measurements found</Text>
                    </div>
                )}
            </Card>

            {/* ============ FOOTER ============ */}
            <div className="text-center py-4">
                <Text className="text-xs text-gray-400">
                    Powered by <span className="font-semibold text-indigo-500">BeyondStat</span> • Real-time Sports Analytics
                </Text>
            </div>
        </div>
    );
}
