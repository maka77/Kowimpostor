import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendRoleEmail } from '@/lib/email';

export async function POST(req: Request) {
    const { sessionCode, impostorCount = 1 } = await req.json();

    const session = await prisma.session.findUnique({
        where: { code: sessionCode },
        include: { players: true },
    });

    if (!session || session.players.length === 0) {
        return NextResponse.json({ error: 'Invalid session or no players' }, { status: 400 });
    }

    // Shuffle and Assign
    const shuffled = [...session.players].sort(() => 0.5 - Math.random());
    // Ensure not too many impostors
    const actualImpostors = Math.min(impostorCount, Math.floor(shuffled.length / 2));

    const impostors = shuffled.slice(0, actualImpostors);
    const innocents = shuffled.slice(actualImpostors);

    const updates = [];

    for (const p of impostors) {
        updates.push(prisma.player.update({
            where: { id: p.id },
            data: { role: 'IMPOSTOR', roleDesc: 'Sabotea y elimina a los demás.' }
        }));
    }

    for (const p of innocents) {
        updates.push(prisma.player.update({
            where: { id: p.id },
            data: { role: 'CIUDADANO', roleDesc: 'Descubre al impostor.' }
        }));
    }

    await prisma.$transaction(updates);
    await prisma.session.update({
        where: { id: session.id },
        data: { status: 'PLAYING' }
    });

    // Sending Emails
    const allPlayers = [...impostors, ...innocents];
    for (const p of allPlayers) {
        const role = impostors.find(i => i.id === p.id) ? 'IMPOSTOR' : 'CIUDADANO';

        const host = req.headers.get('host') || 'localhost:3000';
        const proto = req.headers.get('x-forwarded-proto') || 'http';
        const link = `${proto}://${host}/game/${p.token}`;

        // We don't await individual emails to block response too long in a real app,
        // but here we do to ensure they print to console.
        await sendRoleEmail(p.email, p.name, role, link);
    }

    return NextResponse.json({ success: true });
}
