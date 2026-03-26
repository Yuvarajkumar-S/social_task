import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Plus, ArrowRight, Sparkles, Shield, Github, Save, Bell, BellRing, Trophy, Heart, User, Camera, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { askGemini } from '../services/geminiClient';
import { useNotifications } from '../hooks/useNotifications';
import HabitList from '../components/HabitList';
import Onboarding from '../components/Onboarding';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // For joining a group
  const [inviteCode, setInviteCode] = useState('');
  const [joinPetName, setJoinPetName] = useState('');
  const [joinPetType, setJoinPetType] = useState('dog');

  // For creating a group
  const [newGroupName, setNewGroupName] = useState('');
  const [createPetName, setCreatePetName] = useState('');
  const [createPetType, setCreatePetType] = useState('dog');

  const petTypes = [
    { id: 'bird', name: 'Bird', icon: '🐦' },
    { id: 'dog', name: 'Dog', icon: '🐶' },
    { id: 'cat', name: 'Cat', icon: '🐱' },
    { id: 'snake', name: 'Snake', icon: '🐍' },
    { id: 'fish', name: 'Fish', icon: '🐟' },
  ];

  // For Gemini Nudge & User Data
  const [nudge, setNudge] = useState<string | null>(null);
  const [nudgeLoading, setNudgeLoading] = useState(true);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [personalPet, setPersonalPet] = useState<{ hp: number, name: string, state: string, type: string } | null>(null);
  
  const [avatarUrl, setAvatarUrl] = useState('');

  // For Notifications
  const { permission, requestPermission, sendNotification } = useNotifications();

  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      // Check onboarding
      const { data: userData } = await supabase
        .from('users')
        .select('username, avatar_url, personal_pet_hp, personal_pet_name, personal_pet_state, personal_pet_type, has_seen_onboarding')
        .eq('id', user.id)
        .single();
      
      if (userData && !userData.has_seen_onboarding) {
        setShowOnboarding(true);
      }

      // 1. Fetch user's groups
      const { data: memberData } = await supabase
        .from('group_members')
        .select(`
          group_id,
          pet_hp,
          groups (
            id,
            name,
            boss_name,
            boss_hp,
            boss_max_hp
          )
        `)
        .eq('user_id', user.id);

      if (memberData) {
        const formattedGroups = memberData.map((m: any) => ({
          ...m.groups,
          pet_hp: m.pet_hp
        }));
        setUserGroups(formattedGroups);
      }

      // 2. Fetch data for Gemini Nudge
      try {
        const userName = userData?.username || 'Player';
        
        if (userData) {
          setPersonalPet({
            hp: userData.personal_pet_hp || 100,
            name: userData.personal_pet_name || 'Pet',
            state: userData.personal_pet_state || 'happy',
            type: userData.personal_pet_type || 'dog'
          });
          setAvatarUrl(userData.avatar_url || '');
          setCreatePetName(userData.personal_pet_name || '');
          setCreatePetType(userData.personal_pet_type || 'dog');
          setJoinPetName(userData.personal_pet_name || '');
          setJoinPetType(userData.personal_pet_type || 'dog');
        }

        let pet_hp = 100;
        let completed_count = 0;
        let total_count = 1;

        if (memberData && memberData.length > 0) {
          pet_hp = memberData[0].pet_hp;
          const groupId = memberData[0].group_id;

          const { count: totalMates } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', groupId);
          total_count = totalMates || 1;

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const { data: groupMembers } = await supabase.from('group_members').select('user_id').eq('group_id', groupId);
          const memberIds = groupMembers?.map(m => m.user_id) || [];

          if (memberIds.length > 0) {
            const { data: logsToday } = await supabase.from('habit_logs')
              .select('user_id')
              .in('user_id', memberIds)
              .gte('created_at', today.toISOString());

            const uniqueCompleters = new Set(logsToday?.map(l => l.user_id));
            completed_count = uniqueCompleters.size;
          }
        }

        const { data: lastLog } = await supabase.from('habit_logs')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let hours = 24;
        if (lastLog) {
          const diff = Date.now() - new Date(lastLog.created_at).getTime();
          hours = Math.floor(diff / (1000 * 60 * 60));
        }

        const { data: allUserLogs } = await supabase.from('habit_logs')
          .select('completed_date')
          .eq('user_id', user.id);

        let streak = 0;
        if (allUserLogs && allUserLogs.length > 0) {
          const dates = allUserLogs.map(l => l.completed_date);
          const dateSet = new Set(dates);
          
          const todayStr = new Date().toLocaleDateString('en-CA');
          
          const getPrevDate = (dStr: string) => {
            const [y, m, d] = dStr.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            date.setDate(date.getDate() - 1);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          };

          let currentStr = todayStr;
          if (dateSet.has(todayStr)) {
            currentStr = todayStr;
          } else if (dateSet.has(getPrevDate(todayStr))) {
            currentStr = getPrevDate(todayStr);
          } else {
            currentStr = '';
          }

          if (currentStr) {
            while (dateSet.has(currentStr)) {
              streak++;
              currentStr = getPrevDate(currentStr);
            }
          }
        }

        const prompt = `You are a motivational coach for a habit tracking app called Seyal. User's name: ${userName}. Current streak: ${streak} days. Pet HP: ${pet_hp} out of 100. Time since last habit completion: ${hours} hours. Groupmates who have already completed today: ${completed_count} out of ${total_count}. Generate a short, punchy, emotionally targeted nudge message of maximum 2 sentences. Be direct and personal. Do not use generic phrases.`;

        const nudgeText = await askGemini(prompt);
        setNudge(nudgeText);
      } catch (err: any) {
        if (err?.status === 429 || err?.code === 429) {
          console.warn("Gemini API quota exceeded, using fallback nudge.");
        } else {
          console.error("Failed to fetch nudge:", err);
        }
        setNudge("Every action counts. Your pet and your group are counting on you today.");
      } finally {
        setNudgeLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      sendNotification('Notifications Enabled!', {
        body: 'You will now receive reminders and updates from Seyal.',
        icon: '/favicon.ico' // Assuming there's a favicon or we can just omit it
      });
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .insert([{ name: newGroupName, invite_code: code }])
      .select()
      .single();

    if (groupError) {
      setError(groupError.message);
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase
      .from('group_members')
      .insert([{ 
        group_id: groupData.id, 
        user_id: user.id,
        pet_name: createPetName,
        pet_type: createPetType
      }]);

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    navigate(`/group/${groupData.id}`);
  };

  const joinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data: groupData, error: findError } = await supabase
      .from('groups')
      .select('id')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (findError || !groupData) {
      setError('Invalid invite code or group not found.');
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase
      .from('group_members')
      .insert([{ 
        group_id: groupData.id, 
        user_id: user.id,
        pet_name: joinPetName,
        pet_type: joinPetType
      }]);

    if (memberError) {
      if (memberError.code === '23505') {
        navigate(`/group/${groupData.id}`);
        return;
      }
      setError(memberError.message);
      setLoading(false);
      return;
    }

    navigate(`/group/${groupData.id}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-500">Seyal</h1>
          <div className="flex items-center gap-4">
            <Link 
              to="/leaderboard" 
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-lg transition-colors border border-yellow-500/20"
            >
              <Trophy className="w-4 h-4" />
              Leaderboard
            </Link>
            <Link 
              to="/settings" 
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-800"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Sign out
            </button>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-10 h-10 rounded-full border border-zinc-700 object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <User className="w-5 h-5 text-zinc-500" />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-8 text-red-500 text-sm text-center bg-red-500/10 py-3 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}

        {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}
        
        {/* Gemini Nudge Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-900/40 to-zinc-900 border border-emerald-500/20 rounded-xl p-6 mb-10 shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="w-24 h-24 text-emerald-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">AI Coach Nudge</h2>
            </div>
            {nudgeLoading ? (
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                  <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
                </div>
              </div>
            ) : (
              <p className="text-lg text-zinc-200 font-medium leading-relaxed italic">
                "{nudge}"
              </p>
            )}
          </div>
        </motion.div>

        {/* Personal Habits & Pet */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-zinc-400" />
              Personal Quest
            </h2>
            {personalPet && (
              <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full shadow-lg">
                <span className="text-xl">
                  {personalPet.type === 'bird' ? '🐦' : 
                   personalPet.type === 'dog' ? '🐶' : 
                   personalPet.type === 'cat' ? '🐱' : 
                   personalPet.type === 'snake' ? '🐍' : 
                   personalPet.type === 'fish' ? '🐟' : '🐶'}
                </span>
                <Heart className={`w-4 h-4 ${personalPet.hp < 30 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`} />
                <span className="text-sm font-bold text-zinc-300">
                  {personalPet.name}: <span className={personalPet.hp < 30 ? 'text-red-400' : 'text-emerald-400'}>{personalPet.hp}%</span>
                </span>
                <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded-full text-zinc-500 uppercase tracking-tighter">
                  {personalPet.state}
                </span>
              </div>
            )}
          </div>
          <HabitList groupId={null} />
        </div>

        {/* Your Groups */}
        {userGroups.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-zinc-400" />
              Your Active Groups
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {userGroups.map(group => (
                <Link 
                  key={group.id} 
                  to={`/group/${group.id}`}
                  className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl p-6 transition-all group"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">{group.name}</h3>
                    <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <div className="text-sm text-zinc-400 flex justify-between">
                    <span>Boss: {group.boss_name}</span>
                    <span className={group.pet_hp < 30 ? 'text-red-400' : 'text-emerald-400'}>
                      Pet HP: {group.pet_hp}/100
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Create Group Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-xl">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-6">
              <Plus className="w-6 h-6 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Create a Group</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Start a new accountability group and invite your friends to join the adventure.
            </p>
            
            <form onSubmit={createGroup} className="space-y-4">
              <div>
                <label htmlFor="groupName" className="sr-only">Group Name</label>
                <input
                  id="groupName"
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-zinc-700 bg-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  placeholder="E.g. The Early Birds"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Your Pet in this Group</label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  className="w-full px-4 py-2 border border-zinc-700 bg-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  placeholder="Pet Name"
                  value={createPetName}
                  onChange={(e) => setCreatePetName(e.target.value)}
                />
                <div className="grid grid-cols-5 gap-2">
                  {petTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setCreatePetType(type.id)}
                      className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                        createPetType === type.id 
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      <span className="text-xl">{type.icon}</span>
                      <span className="text-[8px] font-medium">{type.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !newGroupName || !createPetName}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg disabled:opacity-50 transition-all"
              >
                Create Group
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Join Group Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-xl">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-6">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Join a Group</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Have an invite code? Enter it below to join your friends and start tracking.
            </p>
            
            <form onSubmit={joinGroup} className="space-y-4">
              <div>
                <label htmlFor="inviteCode" className="sr-only">Invite Code</label>
                <input
                  id="inviteCode"
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-zinc-700 bg-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase transition-all"
                  placeholder="Enter 6-digit code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  maxLength={6}
                />
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Your Pet in this Group</label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  className="w-full px-4 py-2 border border-zinc-700 bg-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  placeholder="Pet Name"
                  value={joinPetName}
                  onChange={(e) => setJoinPetName(e.target.value)}
                />
                <div className="grid grid-cols-5 gap-2">
                  {petTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setJoinPetType(type.id)}
                      className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                        joinPetType === type.id 
                          ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      <span className="text-xl">{type.icon}</span>
                      <span className="text-[8px] font-medium">{type.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || inviteCode.length < 6 || !joinPetName}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg disabled:opacity-50 transition-all"
              >
                Join Group
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
              {permission === 'granted' ? (
                <BellRing className="w-5 h-5 text-emerald-400" />
              ) : (
                <Bell className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold">Push Notifications</h2>
              <p className="text-zinc-400 text-sm">Get reminded to complete your habits and save your pet.</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50">
            <div>
              <p className="font-medium">Browser Notifications</p>
              <p className="text-sm text-zinc-400">
                {permission === 'granted' 
                  ? 'Notifications are currently enabled.' 
                  : permission === 'denied'
                    ? 'Notifications are blocked by your browser.'
                    : 'Enable notifications to stay on track.'}
              </p>
            </div>
            <button
              onClick={handleEnableNotifications}
              disabled={permission === 'granted' || permission === 'denied'}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg disabled:opacity-50 transition-all"
            >
              {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Enable'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
