import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendRoleEmail } from '@/lib/email';
import { GoogleGenerativeAI } from '@google/generative-ai';

const TOPIC_PROMPTS: Record<string, string> = {
    'Futbol General': 'Genera un nombre de un personaje de fútbol famoso a nivel mundial que sea ampliamente conocido por audiencias argentinas. Solo devuelve el nombre.',
    'Famosos': 'Genera un nombre de una persona famosa a nivel mundial (actor, músico, celebridad) que sea muy conocida por audiencias argentinas. Solo devuelve el nombre.',
    'Farandula Argentina': 'Genera un nombre de un personaje de la farándula argentina de alto perfil en las últimas décadas. Solo devuelve el nombre.',
    'Futbol Nacional': 'Genera un nombre de un personaje histórico o famoso del fútbol argentino. Solo devuelve el nombre.',
    'Politica': 'Genera un nombre de un personaje político mundial o argentino muy conocido, preferentemente relacionado con la política argentina. Solo devuelve el nombre.',
    'Historia': 'Genera un nombre de un prócer argentino o personaje que haya marcado la historia de Argentina. Solo devuelve el nombre.',
};

export async function POST(req: Request) {
    const { sessionCode, impostorCount = 1, gameMode, topic, secretWord: manualSecret } = await req.json();

    const session = await prisma.session.findUnique({
        where: { code: sessionCode },
        include: { players: true },
    });

    if (!session || session.players.length === 0) {
        return NextResponse.json({ error: 'Invalid session or no players' }, { status: 400 });
    }

    // Determine Secret Word
    let finalSecretWord = manualSecret;
    let finalTopic = topic;

    if (gameMode === 'AI' && topic) {
        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is not set');
            // Fallback or error? For MVP we might error or fallback.
            return NextResponse.json({ error: 'Server configuration error: Gemini API Key missing' }, { status: 500 });
        }

        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const promptContext = TOPIC_PROMPTS[topic] || `Genera una palabra secreta relacionada con ${topic} para un juego de adivinanzas. Solo la palabra.`;
            const result = await model.generateContent(promptContext);
            const response = await result.response;
            finalSecretWord = response.text().trim();
            console.log(`[GEMINI] Generated secret: ${finalSecretWord} for topic ${topic}`);
        } catch (error) {
            console.error('Gemini error:', error);
            return NextResponse.json({ error: 'Failed to generate secret word from AI' }, { status: 500 });
        }
    }

    if (!finalSecretWord && gameMode === 'MANUAL') {
        return NextResponse.json({ error: 'Secret word is required for manual mode' }, { status: 400 });
    }
    // Fallback if AI failed silently or something unexpected (though we catch above)
    if (!finalSecretWord) finalSecretWord = 'Misterio';


    // Shuffle and Assign
    const shuffled = [...session.players].sort(() => 0.5 - Math.random());
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

    // Update Session with Topic/Word
    await prisma.session.update({
        where: { id: session.id },
        data: {
            status: 'PLAYING',
            topic: finalTopic,
            secretWord: finalSecretWord
        }
    });

    // Sending Emails
    const allPlayers = [...impostors, ...innocents];
    for (const p of allPlayers) {
        const isImpostor = impostors.some(i => i.id === p.id);
        const roleDisplay = isImpostor ? 'IMPOSTOR' : 'CIUDADANO';

        // Content for email
        // If Impostor: "Eres el IMPOSTOR. Engaña a todos."
        // If Citizen: "Eres CIUDADANO. La palabra secreta es: [WORD]"

        // We are reusing sendRoleEmail. 
        // We pass the secret word as the "role" argument for citizens? 
        // Or we should update sendRoleEmail to handle this better.
        // The current sendRoleEmail signature is (email, name, role, link).
        // Let's pass the "Secret Word" or "IMPOSTOR" as the third arg effectively?
        // But the email template says "Tu rol en el juego es: ${role}".

        // If I pass "CIUDADANO (Palabra: Messi)", it might work.
        // Let's format it nicely.

        let roleContent = '';
        if (isImpostor) {
            roleContent = 'IMPOSTOR';
        } else {
            roleContent = `CIUDADANO. La palabra secreta es: ${finalSecretWord}`;
        }

        const host = req.headers.get('host') || 'localhost:3000';
        const proto = req.headers.get('x-forwarded-proto') || 'http';
        const link = `${proto}://${host}/game/${p.token}`;

        await sendRoleEmail(p.email, p.name, roleContent, link);
    }

    return NextResponse.json({ success: true });
}
