import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Trophy, Medal, Star, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LeaderboardEntry {
  user_id: string;
  total_xp: number;
  username: string;
  avatar_url: string | null;
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      // We need to aggregate XP per user and join with users table
      // Since Supabase doesn't have a simple GROUP BY with JOIN in the JS client,
      // we'll fetch all XP ledger entries and users, then aggregate in JS.
      // In a real production app, this should be a database view or RPC function.
      
      const { data: xpData, error: xpError } = await supabase
        .from('xp_ledger')
        .select('user_id, amount');

      if (xpError) throw xpError;

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, avatar_url');

      if (usersError) throw usersError;

      // Aggregate XP
      const xpMap = new Map<string, number>();
      xpData.forEach(entry => {
        const current = xpMap.get(entry.user_id) || 0;
        xpMap.set(entry.user_id, current + entry.amount);
      });

      // Combine with user data
      const leaderboardData: LeaderboardEntry[] = usersData.map(user => ({
        user_id: user.id,
        username: user.username || 'Anonymous User',
        avatar_url: user.avatar_url,
        total_xp: xpMap.get(user.id) || 0
      })).sort((a, b) => b.total_xp - a.total_xp); // Sort descending

      setLeaderboard(leaderboardData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl">
        Error loading leaderboard: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 rounded-xl">
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
              <p className="text-zinc-400">Compete with others and earn XP by completing habits.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        {leaderboard.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            No XP earned yet. Start completing habits to appear on the leaderboard!
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {leaderboard.map((entry, index) => (
              <div 
                key={entry.user_id} 
                className={`flex items-center gap-4 p-4 transition-colors hover:bg-zinc-800/50 ${
                  index < 3 ? 'bg-zinc-800/20' : ''
                }`}
              >
                <div className="flex items-center justify-center w-10 h-10 font-bold text-lg">
                  {index === 0 ? (
                    <Medal className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                  ) : index === 1 ? (
                    <Medal className="w-7 h-7 text-zinc-300 drop-shadow-[0_0_8px_rgba(212,212,216,0.5)]" />
                  ) : index === 2 ? (
                    <Medal className="w-6 h-6 text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]" />
                  ) : (
                    <span className="text-zinc-500">#{index + 1}</span>
                  )}
                </div>
                
                <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700 flex-shrink-0">
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt={entry.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold">
                      {entry.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className={`font-semibold ${index < 3 ? 'text-white' : 'text-zinc-300'}`}>
                    {entry.username}
                  </h3>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-950 rounded-lg border border-zinc-800">
                  <Star className={`w-4 h-4 ${index < 3 ? 'text-yellow-500' : 'text-emerald-500'}`} />
                  <span className="font-bold text-white">{entry.total_xp.toLocaleString()}</span>
                  <span className="text-zinc-500 text-sm font-medium">XP</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
