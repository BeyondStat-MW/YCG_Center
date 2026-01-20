'use client';

import { Users } from 'lucide-react';
import PlayerSelectionList from '@/components/PlayerSelectionList';

export default function PlayerReportIndex() {
    return (
        <PlayerSelectionList
            title="선수 리포트"
            description="상세 리포트를 확인할 선수를 선택하세요."
            basePath="/yoon/player"
            icon={Users}
        />
    );
}
