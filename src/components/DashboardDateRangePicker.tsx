
"use client";

import { DateRangePicker, DateRangePickerValue } from "@tremor/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ko } from "date-fns/locale";

export function DashboardDateRangePicker() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Default: 2023-01-01 to Today
    const defaultFrom = new Date('2023-01-01');
    const defaultTo = new Date();

    const [value, setValue] = useState<DateRangePickerValue>({
        from: searchParams.get("from") ? new Date(searchParams.get("from")!) : defaultFrom,
        to: searchParams.get("to") ? new Date(searchParams.get("to")!) : defaultTo,
    });

    const onValueChange = (newValue: DateRangePickerValue) => {
        setValue(newValue);

        const params = new URLSearchParams(searchParams);
        if (newValue.from) {
            params.set("from", newValue.from.toISOString().split('T')[0]);
        } else {
            params.delete("from");
        }

        if (newValue.to) {
            params.set("to", newValue.to.toISOString().split('T')[0]);
        } else {
            params.delete("to");
        }

        router.replace(`${pathname}?${params.toString()}`);
    };

    return (
        <DateRangePicker
            className="max-w-sm mx-auto"
            value={value}
            onValueChange={onValueChange}
            enableSelect={false} // Disable presets if handled manually or keep defaults
            locale={ko}
            placeholder="Select date range"
        />
    );
}
