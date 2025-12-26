import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
    const { sessionCode, name, email } = await req.json();

    if (!sessionCode || !name || !email) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const session = await prisma.session.findUnique({
        where: { code: sessionCode },
        include: { players: true },
    });

    if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.players.length >= 6) {
        return NextResponse.json({ error: 'Session is full (max 6)' }, { status: 400 });
    }

    if (session.status !== 'LOBBY') {
        return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    // UUID for player token
    const token = crypto.randomUUID();

    const player = await prisma.player.create({
        data: {
            sessionId: session.id,
            name,
            email,
            token,
        },
    });

    return NextResponse.json(player);
}
