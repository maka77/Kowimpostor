import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        // Use Env vars for Vercel/Production, fallback to requested hardcoded values for MVP
        const validUsername = process.env.ADMIN_USERNAME || 'Trompasaurio';
        const validPassword = process.env.ADMIN_PASSWORD || 'MartaNieve2025!';

        if (username === validUsername && password === validPassword) {
            const cookieStore = await cookies();

            // Set the session cookie
            cookieStore.set('admin_session', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24, // 24 hours
                path: '/',
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
