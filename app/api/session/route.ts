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
