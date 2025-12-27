'use client';

import { useState, useEffect } from 'react';

type Session = {
    id: string;
    code: string;
    status: string;
    createdAt: string;
    playerCount: number;
};

export default function AdminPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/sessions');
            if (res.ok) {
                setSessions(await res.json());
            }
        } catch (error) {
            console.error('Failed to load sessions', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const deleteSession = async (id: string, code: string) => {
        if (!confirm(`Are you sure you want to delete session ${code}? This cannot be undone.`)) return;

        try {
            const res = await fetch('/api/admin/sessions', {
                method: 'DELETE',
                body: JSON.stringify({ sessionId: id }),
            });
            if (res.ok) {
                // Optimistic update
                setSessions(prev => prev.filter(s => s.id !== id));
            } else {
                alert('Failed to delete session');
            }
        } catch (e) {
            alert('Error deleting session');
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8 font-mono">
            <h1 className="text-3xl mb-8 text-yellow-400 uppercase tracking-widest">Admin Dashboard</h1>

            {loading ? (
                <div className="text-gray-500 animate-pulse">Loading data...</div>
            ) : (
                <div className="overflow-x-auto border border-gray-800 rounded-lg">
                    <table className="w-full text-left bg-gray-900/50">
                        <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Code</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Players</th>
                                <th className="px-6 py-3">Created</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {sessions.map(session => (
                                <tr key={session.id} className="hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-yellow-100">{session.code}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs border ${session.status === 'LOBBY' ? 'border-green-800 text-green-400 bg-green-950/30' :
                                                session.status === 'PLAYING' ? 'border-blue-800 text-blue-400 bg-blue-950/30' :
                                                    'border-gray-700 text-gray-500'
                                            }`}>
                                            {session.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{session.playerCount}</td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                        {new Date(session.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => deleteSession(session.id, session.code)}
                                            className="text-red-500 hover:text-red-400 hover:bg-red-950/30 px-3 py-1 rounded transition-colors text-xs border border-red-900"
                                        >
                                            DELETE
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {sessions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-600">
                                        No active sessions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
