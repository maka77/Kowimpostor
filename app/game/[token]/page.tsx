'use client';

import { useState, useEffect, use } from 'react';

type Player = {
    id: string;
    name: string;
    isAlive: boolean;
};

type GameState = {
    player: {
        id: string;
        name: string;
        role?: string;
        roleDesc?: string;
        isAlive: boolean;
    };
    session: {
        code: string;
        status: string; // LOBBY, PLAYING, VOTING, FINISHED...
        round: number;
    };
    allPlayers: Player[];
};

export default function GamePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [selectedTarget, setSelectedTarget] = useState<string>('');
    const [voteSubmitted, setVoteSubmitted] = useState(false);

    // Poll
    useEffect(() => {
        const fetchGame = async () => {
            try {
                const res = await fetch(`/api/game/${token}`);
                if (!res.ok) throw new Error('Error fetching game');
                const data = await res.json();
                setGameState(data);

                // Reset vote submitted if round changes? 
                // We'd need to track round locally.
                // For MVP manual reset on page refresh or basic logic:
                // Ideally backend tells us "hasVoted".
                // But let's just allow re-voting (changing vote) so 'voteSubmitted' is just a UI feedback.
            } catch (e) {
                setError('No se pudo cargar el juego.');
            } finally {
                setLoading(false);
            }
        };

        fetchGame();
        const interval = setInterval(fetchGame, 3000);
        return () => clearInterval(interval);
    }, [token]);

    const submitVote = async () => {
        if (!selectedTarget) return;
        setVoteSubmitted(true);
        await fetch('/api/vote', {
            method: 'POST',
            body: JSON.stringify({ token, targetId: selectedTarget }),
        });
    };

    if (loading) return <div className="p-8 text-neutral-500">Cargando...</div>;
    if (error) return <div className="p-8 text-red-500">{error}</div>;
    if (!gameState) return null;

    const { player, session, allPlayers } = gameState;

    return (
        <div className="min-h-screen bg-black text-neutral-200 p-6 flex flex-col items-center max-w-md mx-auto relative font-sans">
            <div className="absolute top-4 right-4 text-xs text-neutral-600 font-mono">
                SESSION: {session.code}
            </div>

            <div className="mt-8 text-center space-y-2">
                <div className="text-sm uppercase tracking-widest text-neutral-500">Tu Identidad</div>
                <div className={`text-3xl font-bold tracking-wider ${player.role === 'IMPOSTOR' ? 'text-red-500' : 'text-blue-400'}`}>
                    {player.role || '???'}
                </div>
                <p className="text-sm text-neutral-400 max-w-[250px] mx-auto italic">
                    {player.roleDesc}
                </p>
            </div>

            <div className="my-8 w-full border-t border-neutral-800"></div>

            <div className="w-full space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-xs uppercase text-neutral-600">Estado del Juego</span>
                    <span className={`text-sm font-bold px-2 py-1 rounded ${session.status === 'VOTING' ? 'bg-red-900/50 text-red-200 animate-pulse' : 'bg-neutral-800'}`}>
                        {session.status}
                    </span>
                </div>

                {!player.isAlive && (
                    <div className="bg-red-900/20 border border-red-900/50 p-4 rounded text-center text-red-300">
                        Has sido eliminado.
                    </div>
                )}

                {session.status === 'VOTING' && player.isAlive && (
                    <div className="card space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="text-center font-medium">Votación en Curso</h3>
                        <p className="text-xs text-center text-neutral-500">Selecciona a quién quieres eliminar.</p>

                        <div className="space-y-2">
                            {allPlayers.filter(p => p.isAlive && p.id !== player.id).map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedTarget(p.id)}
                                    className={`w-full p-3 text-left rounded border transition ${selectedTarget === p.id
                                            ? 'border-neutral-200 bg-neutral-800'
                                            : 'border-neutral-800 hover:bg-neutral-900'
                                        }`}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={submitVote}
                            disabled={!selectedTarget}
                            className="btn btn-primary w-full mt-4"
                        >
                            Confirmar Voto
                        </button>
                        {voteSubmitted && <p className="text-center text-xs text-green-500">Voto registrado (puedes cambiarlo)</p>}
                    </div>
                )}

                {session.status.startsWith('FINISHED') && (
                    <div className="text-center p-8 bg-neutral-900 rounded">
                        <h2 className="text-2xl font-bold mb-2">Juego Terminado</h2>
                        <p className="text-neutral-400">
                            {session.status === 'FINISHED_IMPOSTOR_WIN' ? 'Los Impostores ganan.' : 'Los Ciudadanos ganan.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
