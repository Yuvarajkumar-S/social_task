import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useRealtime } from '../hooks/useRealtime';
import Pet from '../components/Pet';
import HabitList from '../components/HabitList';
import GroupBoss from '../components/GroupBoss';
import ActivityFeed from '../components/ActivityFeed';
import GroupChat from '../components/GroupChat';
import { LogOut, Trophy, Flame, AlertTriangle, CheckCircle2, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function GroupView() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Use our new realtime hook!
  const { groupMembers, groupState } = useRealtime(groupId);

  useEffect(() => {
    // Initial access check
    const checkAccess = async () => {
      if (!user || !groupId) return;

      const { data, error } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        setError('Failed to load group. You may not have access.');
      }
      setLoading(false);
    };

    checkAccess();
  }, [groupId, user]);

  const handleLeaveGroup = async () => {
    if (!user || !groupId) return;
    setIsLeaving(true);
    
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    if (error) {
      console.error("Error leaving group:", error);
      setError("Failed to leave group.");
      setIsLeaving(false);
      setShowLeaveModal(false);
    } else {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading group...</div>;
  }

  if (error || !groupState) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-4">
        <div className="text-red-500 mb-4">{error || 'Group not found'}</div>
        <button onClick={() => navigate('/dashboard')} className="text-emerald-500 hover:underline">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const timeLeft = groupState.streak_rescue_deadline 
    ? Math.max(0, Math.floor((new Date(groupState.streak_rescue_deadline).getTime() - Date.now()) / (1000 * 60 * 60)))
    : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 relative">
      {/* Leave Group Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Leave Group?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Are you sure you want to leave <strong>{groupState.name}</strong>? Your pet's progress in this group will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowLeaveModal(false)}
                disabled={isLeaving}
                className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleLeaveGroup}
                disabled={isLeaving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isLeaving ? 'Leaving...' : 'Yes, Leave'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-zinc-800 pb-6 gap-4">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-emerald-500">{groupState.name}</h1>
              <p className="text-zinc-400 mt-1">
                Invite Code: <span className="font-mono bg-zinc-800 px-2 py-1 rounded text-emerald-400 select-all">{groupState.invite_code}</span>
              </p>
            </div>

            {/* Group Streak Badge */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-xl"
            >
              <div className="relative">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-orange-500 blur-md rounded-full"
                />
                <Flame className="w-6 h-6 text-orange-500 relative z-10" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-orange-500 uppercase tracking-tighter leading-none">Group Streak</span>
                <span className="text-xl font-black text-white leading-none">
                  {groupState.group_streak || 0} <span className="text-sm font-normal text-zinc-500">days</span>
                </span>
              </div>
            </motion.div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/leaderboard')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-lg transition-colors border border-yellow-500/20"
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-4 py-2 text-sm font-medium text-red-400 bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 rounded-lg transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Leave Group</span>
            </button>
          </div>
        </div>

        {/* The Pets Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            Group Pets <span className="text-sm font-normal text-zinc-500">({groupMembers.length} members)</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {groupMembers.map((member) => (
              <Pet
                key={member.id}
                hp={member.pet_hp}
                state={member.pet_state}
                username={member.users?.username || 'Unknown'}
                avatarUrl={member.users?.avatar_url}
                petName={member.pet_name}
                petType={member.pet_type}
                isOwner={member.user_id === user?.id}
              />
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-12 gap-8 mb-12">
          {/* Left Column: Habits & Boss */}
          <div className="lg:col-span-8 space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <HabitList groupId={groupId!} />
              <GroupBoss 
                groupId={groupId!}
                name={groupState.boss_name || 'The Procrastination Demon'} 
                hp={groupState.boss_hp ?? 1000} 
                maxHp={groupState.boss_max_hp ?? 1000} 
              />
            </div>
            
            <ActivityFeed groupId={groupId!} />
          </div>

          {/* Right Column: Chat */}
          <div className="lg:col-span-4">
            <div className="sticky top-8">
              <GroupChat groupId={groupId!} />
            </div>
          </div>
        </div>

        {/* Debug / Admin Section */}
        <div className="mt-16 pt-12 border-t border-zinc-800">
          <div className="p-6 bg-zinc-900/50 border border-red-900/30 rounded-xl">
            <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
              ⚠️ Developer Tools
            </h3>
            <p className="text-zinc-500 text-sm mb-4">
              In a real app, a server runs a "cron job" at midnight to damage pets for any habits that weren't checked off. 
              Use this button to simulate midnight happening right now.
            </p>
            <button
              disabled={isSimulating}
              onClick={async () => {
                setIsSimulating(true);
                try {
                  const { data, error } = await supabase.rpc('process_daily_damage', { target_group_id: groupId });
                  if (error) {
                    console.error("Error simulating damage:", error);
                    alert("Error simulating damage: " + error.message);
                  } else {
                    console.log("Midnight simulation result:", data);
                    alert("Midnight simulation result: " + data);
                  }
                } catch (err) {
                  console.error("Unexpected error:", err);
                  alert("Unexpected error: " + err);
                } finally {
                  setIsSimulating(false);
                }
              }}
              className="px-4 py-2 bg-red-950 hover:bg-red-900 text-red-400 border border-red-900 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isSimulating ? 'Applying Damage...' : 'Simulate Midnight (Apply Damage)'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
