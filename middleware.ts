
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 보호할 경로 패턴 정의 (윤청구 관련 모든 페이지)
const PROTECTED_ROUTES = ['/yoon'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 보호된 경로인지 확인
    const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

    // 이중 안전장치: API 경로 및 정적 파일은 절대 차단하지 않음 (내부 로직)
    if (pathname.startsWith('/api') || pathname.includes('.')) {
        return NextResponse.next();
    }

    if (isProtectedRoute) {
        // 쿠키에서 인증 토큰 확인
        const authToken = request.cookies.get('ycg_auth_token');

        // 토큰이 없으면 로그인 페이지로 리다이렉트
        if (!authToken || authToken.value !== 'authenticated') {
            const loginUrl = new URL('/login', request.url);
            // 로그인 후 원래 가려던 페이지로 돌아오기 위해 callbackUrl 추가
            loginUrl.searchParams.set('callbackUrl', pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

// 미들웨어가 실행될 경로 설정 (정적 파일, 이미지 등 제외)
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
