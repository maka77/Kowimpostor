'use client';

import { useState, useEffect } from 'react';

type Player = {
    id: string;
    name: string;
    email: string;
    isAlive: boolean;
    role?: string; // Host might see it? Logic says "Host creates", maybe Host shouldn't see roles to play along? 
    // User says "Web acts as silent GM". Host might be a player or dedicated. 
    // "Host creates session... Carga nombres... Asigna roles...". 
    // "Web acts as game director". Usually Host can see everything or hides it. 
    // MVP: Host sees status but maybe hides roles unless revealed.
};

type VoteResult = {
    status: string;
    eliminated: string | null;
    votes: Record<string, number>;
};

export default function HostPage() {
    const [sessionCode, setSessionCode] = useState<string | null>(null);
    const [status, setStatus] = useState('LOBBY'); // LOBBY, PLAYING, VOTING, FR
    const [players, setPlayers] = useState<Player[]>([]);
    const [round, setRound] = useState(0);

    // Form states
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [lastResult, setLastResult] = useState<VoteResult | null>(null);

    // Game Config
    const [gameMode, setGameMode] = useState<'AI' | 'MANUAL'>('AI');
    const [topic, setTopic] = useState('Futbol General');
    const [secretWord, setSecretWord] = useState('');

    const createSession = async () => {
        setLoading(true);
        // Reset error state if I added it, but I need to add state first.
        // Since I can't easily add state in replace_content without context, I will just alert for now or try to add state too?
        // Let's replace the whole component start effectively? No.
        // Using alert for immediate feedback if state missing.
        try {
            const res = await fetch('/api/session', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Server Error');
            setSessionCode(data.code);
            setStatus('LOBBY');
        } catch (e) {
            alert('Error creating session. Check console.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const addPlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newEmail) return;

        try {
            const res = await fetch('/api/player', {
                method: 'POST',
                body: JSON.stringify({ sessionCode, name: newName, email: newEmail }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to add player');
            }

            setNewName('');
            setNewEmail('');
            fetchSessionInfo(); // Refresh immediately
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : 'Error adding player');
        }
    };

    const startGame = async () => {
        if (!confirm('¿Enviar roles y comenzar?')) return;
        setLoading(true);
        await fetch('/api/start', {
            method: 'POST',
            body: JSON.stringify({
                sessionCode,
                gameMode,
                topic: gameMode === 'AI' ? topic : undefined,
                secretWord: gameMode === 'MANUAL' ? secretWord : undefined
            }),
        });
        setLoading(false);
        fetchSessionInfo();
    };

    const openVoting = async () => {
        try {
            const res = await fetch('/api/admin/vote-control', {
                method: 'POST',
                body: JSON.stringify({ sessionCode, action: 'OPEN' }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to open voting');
            }
            fetchSessionInfo();
        } catch (error) {
            console.error('Error opening voting:', error);
            alert('Error creating voting round. Check console.');
        }
    };

    const closeVoting = async () => {
        try {
            const res = await fetch('/api/admin/vote-control', {
                method: 'POST',
                body: JSON.stringify({ sessionCode, action: 'CLOSE' }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to close voting');
            }
            const data = await res.json();
            setLastResult(data);
            fetchSessionInfo();
        } catch (error) {
            console.error('Error closing voting:', error);
            alert('Error closing voting. Check console.');
        }
    };

    // Poll for updates if session exists
    // For MVP we just fetch the session state again. 
    // But wait, we don't have a GET /api/session endpoint exposed for Host!
    // I missed that in the plan. host needs to see list of players.
    // I should add a GET /api/session?code=XYZ or handle it via a new endpoint.
    // Or I can reuse the logic.
    // Let's add a quick polling helper.

    // I need to create GET /api/session/host or similar.
    // I'll assume I can add it now.

    // Actually, I'll allow `POST /api/player` to return list? No that's for adding.
    // Let's add `GET /api/session` which takes a `code` query param.

    const fetchSessionInfo = async () => {
        if (!sessionCode) return;
        try {
            const res = await fetch(`/api/session?code=${sessionCode}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (res.ok) {
                const data = await res.json();
                setStatus(data.status);
                setPlayers(data.players);
                setRound(data.round);
            }
        } catch (e) {
            console.error("Polling error:", e);
        }
    };

    useEffect(() => {
        if (!sessionCode) return;
        fetchSessionInfo();
        const interval = setInterval(fetchSessionInfo, 3000);
        return () => clearInterval(interval);
    }, [sessionCode]);

    if (!sessionCode) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <button onClick={createSession} disabled={loading} className="btn btn-primary text-xl px-8 py-4">
                    {loading ? 'Creando...' : 'Crear Nueva Sesión'}
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 max-w-4xl mx-auto space-y-12">
            <header className="flex justify-between items-end border-b border-neutral-800 pb-4">
                <div>
                    <h2 className="text-neutral-500 text-sm uppercase tracking-widest">Sesión</h2>
                    <div className="text-4xl font-mono text-white tracking-widest">{sessionCode}</div>
                </div>
                <div className="text-right">
                    <div className="text-neutral-500 text-xs uppercase">Estado</div>
                    <div className="text-xl font-bold text-neutral-200">{status}</div>
                </div>
            </header>

            {status === 'LOBBY' && (
                <section className="space-y-6">
                    <div className="card space-y-4">
                        <h3 className="text-lg font-medium text-neutral-300">Agregar Jugador</h3>
                        <form onSubmit={addPlayer} className="flex gap-4">
                            <input
                                className="input"
                                placeholder="Nombre"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                            <input
                                className="input"
                                placeholder="Email"
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                            />
                            <button type="submit" className="btn">Agregar</button>
                        </form>
                    </div>

                    <div className="card space-y-4">
                        <h3 className="text-lg font-medium text-neutral-300">Configuración de Partida</h3>

                        <div className="flex gap-4 mb-4">
                            <button
                                onClick={() => setGameMode('AI')}
                                className={`px-4 py-2 rounded text-sm font-bold transition-colors ${gameMode === 'AI' ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                            >
                                MODO IA (Tópico)
                            </button>
                            <button
                                onClick={() => setGameMode('MANUAL')}
                                className={`px-4 py-2 rounded text-sm font-bold transition-colors ${gameMode === 'MANUAL' ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                            >
                                MODO MANUAL (Moderador)
                            </button>
                        </div>

                        {gameMode === 'AI' ? (
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-neutral-500 font-bold">Elige un Tópico</label>
                                <select
                                    className="input w-full bg-neutral-900"
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                >
                                    <option value="Futbol General">Fútbol General (Mundial)</option>
                                    <option value="Famosos">Famosos (Mundial)</option>
                                    <option value="Farandula Argentina">Farándula Argentina</option>
                                    <option value="Futbol Nacional">Fútbol Nacional (Argentina)</option>
                                    <option value="Politica">Política (Mundial/Argentina)</option>
                                    <option value="Historia">Historia Argentina</option>
                                </select>
                                <p className="text-xs text-neutral-500 mt-2">
                                    La IA elegirá un personaje secreto basado en este tópico y lo enviará a los ciudadanos.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-neutral-500 font-bold">Palabra/Personaje Secreto</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Ej: Lionel Messi"
                                    value={secretWord}
                                    onChange={e => setSecretWord(e.target.value)}
                                />
                                <p className="text-xs text-neutral-500 mt-2">
                                    Tú eliges la palabra. Asegúrate de no decirla en voz alta. Los ciudadanos la recibirán por email.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <button onClick={startGame} disabled={players.length < 3 || loading || (gameMode === 'MANUAL' && !secretWord)} className="btn btn-primary">
                            Comenzar Juego ({players.length})
                        </button>
                    </div>
                </section>
            )}

            {status !== 'LOBBY' && (
                <section className="grid grid-cols-2 gap-4">
                    <button
                        onClick={openVoting}
                        disabled={status === 'VOTING' || status.startsWith('FINISHED')}
                        className={`btn ${status === 'PLAYING' ? 'btn-primary' : 'opacity-50'}`}
                    >
                        Abrir Votación
                    </button>

                    <button
                        onClick={closeVoting}
                        disabled={status !== 'VOTING'}
                        className={`btn ${status === 'VOTING' ? 'btn-danger' : 'opacity-50'}`}
                    >
                        Cerrar Votación
                    </button>
                </section>
            )}

            {lastResult && (
                <div className="card border-neutral-700 bg-neutral-800/30">
                    <h4 className="text-neutral-400 text-xs uppercase mb-2">Resultado Ronda Anterior</h4>
                    {lastResult.eliminated ? (
                        <p className="text-red-400 text-lg">Eliminado: <span className="font-bold text-white">{lastResult.eliminated}</span></p>
                    ) : (
                        <p className="text-neutral-400">Nadie fue eliminado.</p>
                    )}
                </div>
            )}

            <section>
                <h3 className="text-neutral-500 text-xs uppercase mb-4">Jugadores ({players.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {players.map(p => (
                        <div key={p.id} className={`p-4 border rounded ${p.isAlive ? 'border-neutral-800 bg-neutral-900' : 'border-red-900/30 bg-red-900/10 opacity-60'}`}>
                            <div className="font-medium text-neutral-200">{p.name}</div>
                            <div className="text-xs text-neutral-600 truncate">{p.email}</div>
                            {!p.isAlive && <div className="text-xs text-red-500 mt-1">ELIMINADO</div>}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
