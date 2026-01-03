import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
    const { sessionCode, action } = await req.json(); // action: 'OPEN' | 'CLOSE'

    const session = await prisma.session.findUnique({
        where: { code: sessionCode },
        include: { players: true },
    });

    if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (action === 'OPEN') {
        // Increment round, set status VOTING
        await prisma.session.update({
            where: { id: session.id },
            data: {
                status: 'VOTING',
                round: { increment: 1 }
            }
        });
        return NextResponse.json({ status: 'VOTING', round: session.round + 1 });
    }

    if (action === 'CLOSE') {
        // Calculate results
        const currentRound = session.round;
        const votes = await prisma.vote.findMany({
            where: {
                voter: { sessionId: session.id },
                round: currentRound
            }
        });

        // Count votes
        const tally: Record<string, number> = {};
        for (const v of votes) {
            tally[v.targetId] = (tally[v.targetId] || 0) + 1;
        }

        // Find max
        let maxVotes = -1;
        let eliminatedId = null;

        // Sort entries to find max
        // Note: This logic eliminates ANYONE who has max votes. If tie, picks one arbitrarily or both?
        // Requirement says "Se calcula el jugador más votado".
        // MVP: Pick the first one with max votes.

        for (const [pid, count] of Object.entries(tally)) {
            if (count > maxVotes) {
                maxVotes = count;
                eliminatedId = pid;
            }
        }

        let eliminatedName = null;
        if (eliminatedId) {
            const p = await prisma.player.update({
                where: { id: eliminatedId },
                data: { isAlive: false }
            });
            eliminatedName = p.name;
        }

        // Check Win Condition
        // Refresh players
        const players = await prisma.player.findMany({ where: { sessionId: session.id, isAlive: true } });
        const impostors = players.filter((p: { role: string | null }) => p.role === 'IMPOSTOR').length;
        const innocents = players.filter((p: { role: string | null }) => p.role !== 'IMPOSTOR').length;

        let newStatus = 'PLAYING';
        if (impostors === 0) {
            newStatus = 'FINISHED_TOWN_WIN';
        } else if (impostors >= innocents) {
            newStatus = 'FINISHED_IMPOSTOR_WIN';
        }

        await prisma.session.update({
            where: { id: session.id },
            data: { status: newStatus }
        });

        return NextResponse.json({
            status: newStatus,
            eliminated: eliminatedName,
            votes: tally
        });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
