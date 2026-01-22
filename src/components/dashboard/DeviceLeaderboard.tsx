"use client";

import { useState, useMemo } from "react";
import { TabGroup, TabList, Tab, TabPanels, TabPanel, Card, Title, Text, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge, Select, SelectItem } from "@tremor/react";
import { DeviceData } from "@/app/actions/leaderboard";

const METRIC_LABELS: Record<string, string> = {
    "CMJ_Height": "CMJ 높이 (cm)",
    "Peak_Power_BM": "최대 파워 (W/kg)",
    "RSI_Modified": "RSI 수정값",
    "Nordbord_MaxForce": "최대 근력 (N)",
    "Max_Force_L": "좌측 최대 힘 (N)",
    "Max_Force_R": "우측 최대 힘 (N)",
    "Adductor_MaxForce": "내전근 최대 힘 (N)",
    "Sprint_10m": "10m 스프린트 (s)",
    "Sprint_20m": "20m 스프린트 (s)",
    "Sprint_30m": "30m 스프린트 (s)",
    "Grip_Force": "악력 (kg)",
    "Imbalance": "비대칭 (%)",
    "Avg": "평균"
};

function formatName(name: string) {
    if (!name.includes(' ')) return name;
    const parts = name.split(' ');
    if (parts.length === 2) {
        return `${parts[1]} ${parts[0]}`;
    }
    return name;
}

export default function DeviceLeaderboard({ data }: { data: DeviceData[] }) {
    const [selectedLevel, setSelectedLevel] = useState("all");

    // Extract unique levels from data
    const levels = useMemo(() => {
        const allLevels = new Set<string>();
        data.forEach(d => {
            d.players.forEach(p => {
                if (p.level) allLevels.add(p.level);
            });
        });
        return Array.from(allLevels).sort();
    }, [data]);

    // Filter data based on selected level
    const filteredData = useMemo(() => {
        if (selectedLevel === "all") return data;
        return data.map(d => ({
            ...d,
            players: d.players.filter(p => p.level === selectedLevel)
        }));
    }, [data, selectedLevel]);

    if (!data || data.length === 0) return null;

    return (
        <Card className="mt-6 bg-white shadow-sm rounded-xl ring-1 ring-zinc-200/50">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
                <div className="flex items-center gap-4">
                    <Title>장비별 퍼포먼스 Top 10</Title>
                    <div className="w-32">
                        <Select value={selectedLevel} onValueChange={setSelectedLevel} placeholder="수준 선택">
                            <SelectItem value="all">전체</SelectItem>
                            {levels.map(level => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                            ))}
                        </Select>
                    </div>
                </div>
                <Badge color="gray">{filteredData.map(d => d.players.length).reduce((a, b) => a + b, 0)} Records</Badge>
            </div>

            <TabGroup>
                <TabList className="mt-2" variant="solid">
                    {filteredData.map((d) => (
                        <Tab key={d.device}>{d.device}</Tab>
                    ))}
                </TabList>
                <TabPanels>
                    {filteredData.map((d) => (
                        <TabPanel key={d.device}>
                            <div className="mt-6">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableHeaderCell>이름</TableHeaderCell>
                                            <TableHeaderCell>수준</TableHeaderCell>
                                            <TableHeaderCell>날짜</TableHeaderCell>
                                            {d.players.length > 0 && Object.keys(d.players[0].metrics).map((key) => (
                                                <TableHeaderCell key={key} className="text-right">
                                                    {METRIC_LABELS[key] || key.replace(/_/g, ' ')}
                                                </TableHeaderCell>
                                            ))}
                                            <TableHeaderCell className="text-right">상태</TableHeaderCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {d.players.slice(0, 10).map((player) => (
                                            <TableRow key={player.player_id}>
                                                <TableCell className="font-medium text-zinc-900">
                                                    {formatName(player.name)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge size="xs" color="blue">{player.level || '-'}</Badge>
                                                </TableCell>
                                                <TableCell>{player.date}</TableCell>
                                                {Object.entries(player.metrics).map(([key, value]) => (
                                                    <TableCell key={key} className="text-right font-mono text-zinc-600">
                                                        {value ? value.toString() : "-"}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-right">
                                                    <Badge size="xs" color="emerald">완료</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {d.players.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-zinc-400 py-8">
                                                    해당 수준의 측정 데이터가 없습니다.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabPanel>
                    ))}
                </TabPanels>
            </TabGroup>
        </Card>
    );
}
