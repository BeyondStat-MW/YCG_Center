'use client';

import { ClipboardList } from 'lucide-react';
import PlayerSelectionList from '@/components/PlayerSelectionList';

export default function RehabChartList() {
    return (
        <PlayerSelectionList
            title="재활 차트 (Rehabilitation Chart)"
            description="재활 기록을 관리할 선수를 선택하세요."
            basePath="/yoon/rehab"
            icon={ClipboardList}
            requiredTestType="rehab"
        />
    );
}
