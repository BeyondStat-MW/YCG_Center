import { Sidebar } from "@/components/dashboard/Sidebar";
import { getTeamConfig } from "@/lib/config";

export default async function DashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ team_id: string }>;
}) {
    const { team_id } = await params;
    const teamConfig = await getTeamConfig(team_id);

    return (
        <div className="flex h-screen bg-white">
            {/* Sidebar (Fixed Left) */}
            <Sidebar teamConfig={teamConfig} teamId={team_id} />

            {/* Main Area */}
            <div className="flex flex-col flex-1 overflow-hidden bg-white">
                {/* Main Scrollable Content */}
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
