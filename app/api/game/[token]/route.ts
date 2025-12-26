import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    const player = await prisma.player.findUnique({
        where: { token },
        include: { session: true },
    });

    if (!player) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    // Also fetch other players to show who is alive/dead (without roles)
    const allPlayers = await prisma.player.findMany({
        where: { sessionId: player.sessionId },
        select: { id: true, name: true, isAlive: true }
    });

    return NextResponse.json({
        player,
        session: player.session,
        allPlayers
    });
}
