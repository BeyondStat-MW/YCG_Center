
import YoonSidebar from '@/components/YoonSidebar';

export default function YoonLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-[#F3F4F6] text-slate-900 font-sans">
            <YoonSidebar />
            {/* Main Content Area (Offset by Sidebar Width) */}
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
