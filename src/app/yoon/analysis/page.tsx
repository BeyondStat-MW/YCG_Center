'use client';

import { Activity } from 'lucide-react';
import PlayerSelectionList from '@/components/PlayerSelectionList';

export default function AnalysisPlayerList() {
    return (
        <PlayerSelectionList
            title="퍼포먼스 분석 (Performance Analysis)"
            description="상세 데이터 분석을 진행할 선수를 선택하세요."
            basePath="/yoon/analysis"
            icon={Activity}
        />
    );
}
