import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'Code required' }, { status: 400 });
    }

    // MVP: Host API is open. In real app, check a host token/cookie.
    const session = await prisma.session.findUnique({
        where: { code },
        include: {
            players: {
                orderBy: { name: 'asc' }
            }
        }
    });

    if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
}
