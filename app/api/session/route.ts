import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateSessionCode } from '@/lib/utils';

export async function POST() {
    const code = generateSessionCode();

    // Ensure unique code (unlikely collision but good practice)
    // For MVP we just try once.

    const session = await prisma.session.create({
        data: {
            code,
            status: 'LOBBY',
        },
    });

    return NextResponse.json({ code: session.code });
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'Code required' }, { status: 400 });
    }

    const session = await prisma.session.findUnique({
        where: { code },
        include: { players: true },
    });

    if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
}
