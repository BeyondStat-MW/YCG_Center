"use client";

import { Bell, ChevronDown, Slash, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header({ teamId, teamName }: { teamId: string, teamName?: string }) {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 bg-white border-b px-6 shadow-sm">
            {/* Breadcrumb */}
            <div className="flex items-center gap-4">
                <nav className="flex" aria-label="Breadcrumb">
                    <ol role="list" className="flex items-center space-x-2">
                        <li>
                            <div className="flex items-center">
                                <span className="text-sm font-medium text-zinc-500 hover:text-zinc-700">Yoon Center</span>
                            </div>
                        </li>
                        <li>
                            <div className="flex items-center">
                                <span className="text-zinc-300 mx-2">/</span>
                                <span className="text-sm font-medium text-zinc-900" aria-current="page">종합 현황 (Overview)</span>
                            </div>
                        </li>
                    </ol>
                </nav>
            </div>

            <div className="ml-auto flex items-center gap-4">
                {/* Notification Bell Placeholder */}
                <button type="button" className="-m-2.5 p-2.5 text-zinc-400 hover:text-zinc-500">
                    <span className="sr-only">알림 보기</span>
                    <Bell className="h-5 w-5" aria-hidden="true" />
                </button>

                {/* Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <span className="sr-only">사용자 메뉴</span>
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium text-sm">
                                Y
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">Yoon Center Admin</p>
                                <p className="text-xs leading-none text-muted-foreground">admin@yooncenter.com</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            프로필
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            설정
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600">
                            로그아웃
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
