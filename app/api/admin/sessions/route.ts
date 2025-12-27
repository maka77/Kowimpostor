import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const sessions = await prisma.session.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                players: {
                    select: { id: true }
                }
            }
        });

        // Transform to send just the count of players
        const data = sessions.map(s => ({
            ...s,
            playerCount: s.players.length,
            players: undefined // Remove raw player list from response
        }));

        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to fetch sessions:', error);
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { sessionId } = await req.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        // Use transaction to clean up everything
        await prisma.$transaction(async (tx) => {
            // 1. Find players in this session
            const players = await tx.player.findMany({
                where: { sessionId },
                select: { id: true }
            });
            const playerIds = players.map(p => p.id);

            // 2. Delete votes where these players are voter OR target
            if (playerIds.length > 0) {
                await tx.vote.deleteMany({
                    where: {
                        OR: [
                            { voterId: { in: playerIds } },
                            { targetId: { in: playerIds } }
                        ]
                    }
                });
            }

            // 3. Delete players
            await tx.player.deleteMany({
                where: { sessionId }
            });

            // 4. Delete session
            await tx.session.delete({
                where: { id: sessionId }
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete session:', error);
        return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }
}
