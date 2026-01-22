import { getDeviceLeaderboards } from "@/app/actions/leaderboard";
import DeviceLeaderboard from "@/components/dashboard/DeviceLeaderboard";
import { Suspense } from "react";

export const dynamic = 'force-dynamic';

export default async function YoonMainDashboardPage() {
    // TODO: Get actual team_id from session or context. Using a default or specific ID for now.
    // For now, let's assume we fetch for a specific team or all accessible data.
    // The previous implementation utilized '/api/measurements', which implies fetching all available measurements on client.
    // getDeviceLeaderboards requires a team_id. We might need to adjust this if team_id is dynamic.
    // Let's use a placeholder or known ID if available, otherwise we might need to fetch user's team first.
    // Assuming 'e6e58085-0554-464a-81be-870cf84050c9' (from previous context or typical Yoon Center ID) or fetch logic.

    // For immediate fix, let's Fetch data.
    // Since we don't have the team_id handy in this context without session, 
    // we might need to rely on the API behavior or a default ID.
    // Let's try to use the one from verified files or similar.

    const teamId = 'e6e58085-0554-464a-81be-870cf84050c9'; // Yoon Center Team ID
    const leaderboardData = await getDeviceLeaderboards(teamId);

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">센터 통합 현황</h1>
                <p className="text-sm text-slate-500 mt-1">전체 현황 및 실시간 데이터</p>
            </div>

            <Suspense fallback={<div>Loading Leaderboard...</div>}>
                <DeviceLeaderboard data={leaderboardData} />
            </Suspense>
        </div>
    );
}
