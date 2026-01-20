
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { password } = body;

        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ycg2026!'; // Fallback

        if (password === ADMIN_PASSWORD) {
            const response = NextResponse.json({ success: true });

            // HttpOnly 쿠키 설정
            response.cookies.set('ycg_auth_token', 'authenticated', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 7, // 1주일 유지
                path: '/',
            });

            return response;
        }

        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
