import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ArrowRight, BarChart3, ShieldCheck, Trophy } from "lucide-react";
import Link from "next/link";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-[#0a0a0a]">
            <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
                <p className="fixed left-0 top-0 flex w-full justify-center border-b border-white/10 bg-black/20 backdrop-blur-md pb-6 pt-8 dark:border-neutral-800 dark:bg-zinc-800/30 lg:static lg:w-auto lg:rounded-xl lg:border lg:p-4">
                    BEYONDSTAT PRO &nbsp;
                    <code className="font-mono font-bold">v2.0</code>
                </p>
            </div>

            <div className="my-16 flex flex-col items-center text-center">
                <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl mb-6 bg-clip-text text-transparent bg-gradient-to-t from-white to-neutral-400">
                    Advanced Metrics
                    <br />
                    For Elite Performance.
                </h1>
                <p className="mt-4 text-lg text-neutral-400 max-w-2xl">
                    The next generation of athlete data management.
                    Real-time analytics, comprehensive reporting, and actionable insights.
                </p>

                {/* Demo Button */}
                <div className="mt-8">
                    <Link href="/37b06214-a6b5-4814-aee5-d3c42a2347cd">
                        <Button size="lg" className="bg-white text-black hover:bg-slate-200">
                            V2 Live Demo Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                    <p className="mt-4 text-xs text-neutral-500">
                        Connected to Supabase V2 (Materialized Views)
                    </p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2 lg:w-full lg:max-w-4xl lg:text-left">
                <Card className="group relative border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900/80 transition-all hover:border-blue-500/50">
                    <CardHeader>
                        <CardTitle className="text-2xl text-white flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6 text-blue-500" />
                            Yongin FC
                        </CardTitle>
                        <CardDescription className="text-neutral-400">
                            U18 & U15 Academy Performance Dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-6 text-sm text-neutral-500">
                            Track player growth, match statistics, and physical development metrics for the academy.
                        </p>
                        <Link href="/yongin">
                            <Button variant="outline" className="w-full text-zinc-300 border-zinc-700 hover:bg-white/10">
                                Enter Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="group relative border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900/80 transition-all hover:border-emerald-500/50">
                    <CardHeader>
                        <CardTitle className="text-2xl text-white flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-emerald-500" />
                            Yoon Chung-gu Center
                        </CardTitle>
                        <CardDescription className="text-neutral-400">
                            Professional Performance Analysis
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-6 text-sm text-neutral-500">
                            Comprehensive physical assessments, injury prevention data, and rehabilitation tracking.
                        </p>
                        <Link href="/yoon">
                            <Button variant="outline" className="w-full text-zinc-300 border-zinc-700 hover:bg-white/10">
                                Enter Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
