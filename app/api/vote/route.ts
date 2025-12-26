import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
    const { token, targetId } = await req.json();

    const voter = await prisma.player.findUnique({
        where: { token },
        include: { session: true },
    });

    if (!voter || !voter.isAlive) {
        return NextResponse.json({ error: 'Invalid voter or dead' }, { status: 403 });
    }

    if (voter.session.status !== 'VOTING') {
        return NextResponse.json({ error: 'Voting is closed' }, { status: 400 });
    }

    const target = await prisma.player.findUnique({
        where: { id: targetId },
    });

    if (!target || target.sessionId !== voter.sessionId || !target.isAlive) {
        return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
    }

    // Upsert vote (allow changing vote? or prevents duplicates via unique constraint)
    // Schema has @@unique([round, voterId]).
    // We'll use upsert to allow changing mind, or create and catch error.
    // MVP: Allow changing mind.

    await prisma.vote.upsert({
        where: {
            round_voterId: {
                round: voter.session.round,
                voterId: voter.id,
            },
        },
        create: {
            round: voter.session.round,
            voterId: voter.id,
            targetId: target.id,
        },
        update: {
            targetId: target.id,
        },
    });

    return NextResponse.json({ success: true });
}
