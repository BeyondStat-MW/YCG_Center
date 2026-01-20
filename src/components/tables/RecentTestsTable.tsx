"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface RecentTestsTableProps {
    data: any[]
    title?: string
}

export function RecentTestsTable({ data, title = "Recent Test Records" }: RecentTestsTableProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No records found.</p>
                </CardContent>
            </Card>
        )
    }

    // Dynamically get headers from first object keys
    const headers = Object.keys(data[0]);

    return (
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {headers.map((header) => (
                                    <TableHead key={header} className="capitalize">{header.replace(/_/g, ' ')}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row, i) => (
                                <TableRow key={i}>
                                    {headers.map((header) => (
                                        <TableCell key={`${i}-${header}`}>
                                            {typeof row[header] === 'number'
                                                ? row[header].toLocaleString(undefined, { maximumFractionDigits: 1 })
                                                : row[header]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
