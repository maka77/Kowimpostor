import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Protect Admin Routes (UI and API)
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {

        // Allow access to login pages and auth endpoints
        if (
            pathname === '/admin/login' ||
            pathname === '/api/admin/login' ||
            pathname === '/api/admin/logout'
        ) {
            return NextResponse.next();
        }

        const adminSession = request.cookies.get('admin_session');
        const isAuthenticated = adminSession?.value === 'true';

        if (!isAuthenticated) {
            // For API routes, return 401 instead of redirecting
            if (pathname.startsWith('/api/')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            // For UI routes, redirect to login
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    // Match /admin/* and /api/admin/*
    matcher: ['/admin/:path*', '/api/admin/:path*'],
};
