import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
    const { sessionCode } = await req.json();

    const session = await prisma.session.findUnique({
        where: { code: sessionCode },
        include: { players: true },
    });

    if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Reset Session
    await prisma.session.update({
        where: { id: session.id },
        data: {
            status: 'LOBBY',
            round: 0,
            // Optional: Clear topic/secretWord or keep them? 
            // Keeping them allows "Play Again" with same settings easily, 
            // but LOBBY UI allows changing them anyway.
        }
    });

    // Revive Players
    // We should also probably clear their roles? 
    // If we go back to Lobby, roles are re-assigned on Start.
    // Ideally we reset roles to null or just ignore them until overwrite.
    // Let's reset isAlive.

    await prisma.player.updateMany({
        where: { sessionId: session.id },
        data: {
            isAlive: true,
            // optional: role: null, roleDesc: null 
            // It's safer to not rely on old roles.
        }
    });

    return NextResponse.json({ success: true });
}
