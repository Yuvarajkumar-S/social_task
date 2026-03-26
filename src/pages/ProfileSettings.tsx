import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Camera, 
  Trophy, 
  Flame, 
  Heart, 
  Github, 
  Save, 
  ArrowLeft, 
  Sparkles,
  Loader2,
  CheckCircle2,
  Bell,
  Plus,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Reminder {
  id: string;
  user_id: string;
  title: string;
  time: string; // HH:MM
  days: number[]; // 0-6
  notes?: string;
  is_active: boolean;
}

export default function ProfileSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User Data
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [githubHandle, setGithubHandle] = useState('');
  const [leetcodeHandle, setLeetcodeHandle] = useState('');
  const [duolingoHandle, setDuolingoHandle] = useState('');
  
  // Stats
  const [totalXp, setTotalXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [petHp, setPetHp] = useState(100);

  // Pet Customization
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState('dog');

  // Reminders
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newReminder, setNewReminder] = useState({ title: '', time: '09:00', days: [1, 2, 3, 4, 5] });

  const petTypes = [
    { id: 'bird', name: 'Bird', icon: '🐦' },
    { id: 'dog', name: 'Dog', icon: '🐶' },
    { id: 'cat', name: 'Cat', icon: '🐱' },
    { id: 'snake', name: 'Snake', icon: '🐍' },
    { id: 'fish', name: 'Fish', icon: '🐟' },
  ];

  // Avatar Upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchUserData();
    fetchReminders();
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch User Profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (userError) throw userError;

      if (userData) {
        setUsername(userData.username || '');
        setAvatarUrl(userData.avatar_url);
        setGithubHandle(userData.github_handle || '');
        setLeetcodeHandle(userData.leetcode_handle || '');
        setDuolingoHandle(userData.duolingo_handle || '');
        setPetHp(userData.personal_pet_hp || 100);
        setPetName(userData.personal_pet_name || '');
        setPetType(userData.personal_pet_type || 'dog');
      }

      // 2. Fetch Total XP
      const { data: xpData, error: xpError } = await supabase
        .from('xp_ledger')
        .select('amount')
        .eq('user_id', user?.id);

      if (xpError) throw xpError;
      const total = xpData?.reduce((sum, entry) => sum + entry.amount, 0) || 0;
      setTotalXp(total);

      // 3. Calculate Streak
      const { data: logsData } = await supabase
        .from('personal_habit_logs')
        .select('completed_date')
        .eq('user_id', user?.id);
      
      if (logsData) {
        const dates = logsData.map(l => l.completed_date);
        const today = new Date().toLocaleDateString('en-CA');
        setStreak(calculateStreak(dates, today));
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReminders = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id);
    if (error) {
      console.error('Error fetching reminders:', error);
    } else {
      setReminders(data || []);
    }
  };

  const addReminder = async () => {
    if (!user || !newReminder.title) return;
    const { data, error } = await supabase
      .from('reminders')
      .insert([{ 
        user_id: user.id, 
        title: newReminder.title, 
        time: newReminder.time, 
        days: newReminder.days 
      }])
      .select()
      .single();
    
    if (error) {
      setError(error.message);
    } else {
      setReminders([...reminders, data]);
      setNewReminder({ title: '', time: '09:00', days: [1, 2, 3, 4, 5] });
    }
  };

  const deleteReminder = async (id: string) => {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id);
    
    if (error) {
      setError(error.message);
    } else {
      setReminders(reminders.filter(r => r.id !== id));
    }
  };

  const calculateStreak = (dates: string[], todayStr: string): number => {
    const dateSet = new Set(dates);
    if (dateSet.size === 0) return 0;
    
    const getPrevDate = (dStr: string) => {
      const d = new Date(dStr);
      d.setDate(d.getDate() - 1);
      return d.toLocaleDateString('en-CA');
    };

    let current = todayStr;
    let count = 0;

    if (!dateSet.has(todayStr)) {
      current = getPrevDate(todayStr);
    }

    while (dateSet.has(current)) {
      count++;
      current = getPrevDate(current);
    }

    return count;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        setError("File size must be less than 1MB");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      let finalAvatarUrl = avatarUrl;

      // 1. Upload Avatar if changed
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        finalAvatarUrl = publicUrlData.publicUrl;
      }

      // 2. Update User Profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username,
          avatar_url: finalAvatarUrl,
          github_handle: githubHandle,
          leetcode_handle: leetcodeHandle,
          duolingo_handle: duolingoHandle,
          personal_pet_name: petName,
          personal_pet_type: petType
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(finalAvatarUrl);
      setAvatarPreview(null);
      setAvatarFile(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Avatar & Stats */}
          <div className="space-y-6">
            {/* Avatar Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center shadow-xl">
              <div 
                className="relative w-32 h-32 rounded-full bg-zinc-800 border-4 border-zinc-800 shadow-2xl overflow-hidden group cursor-pointer mb-4"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 text-zinc-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold">{username || 'Anonymous'}</h2>
              <p className="text-zinc-500 text-sm mb-4">Member since {new Date(user?.created_at || '').toLocaleDateString()}</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                Change Profile Photo
              </button>
            </div>

            {/* Pet Customization Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-rose-500" />
                </div>
                <h2 className="text-xl font-bold">Pet Settings</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Pet Name</label>
                  <input
                    type="text"
                    maxLength={20}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="Name your pet..."
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                  />
                  <p className="text-[10px] text-zinc-500 mt-1 text-right">{petName.length}/20</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-3">Pet Type</label>
                  <div className="grid grid-cols-5 gap-2">
                    {petTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setPetType(type.id)}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                          petType === type.id 
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20' 
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        <span className="text-2xl">{type.icon}</span>
                        <span className="text-[10px] font-medium">{type.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Your Stats</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    </div>
                    <span className="text-sm font-medium text-zinc-400">Total XP</span>
                  </div>
                  <span className="font-bold text-white">{totalXp.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Flame className="w-4 h-4 text-orange-500" />
                    </div>
                    <span className="text-sm font-medium text-zinc-400">Current Streak</span>
                  </div>
                  <span className="font-bold text-white">{streak} Days</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-500/10 rounded-lg">
                      <Heart className="w-4 h-4 text-rose-500" />
                    </div>
                    <span className="text-sm font-medium text-zinc-400">Pet Health</span>
                  </div>
                  <span className="font-bold text-white">{petHp}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Settings Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSave} className="space-y-6">
              {/* Account Settings */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-xl font-semibold">Account Information</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Username</label>
                    <input 
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      placeholder="Your display name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Email Address</label>
                    <input 
                      type="email"
                      value={user?.email}
                      disabled
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed"
                    />
                    <p className="mt-2 text-[10px] text-zinc-600 italic">Email cannot be changed after registration.</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <h2 className="text-xl font-semibold mb-4">Onboarding</h2>
          <button 
            onClick={async () => {
              if (!user) return;
              await supabase.from('users').update({ has_seen_onboarding: false }).eq('id', user.id);
              alert('Onboarding reset. It will show again on your next dashboard visit.');
            }} 
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
          >
            Reset Onboarding Slideshow
          </button>
        </div>
        
        {/* Medication Reminders */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Bell className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-xl font-semibold">Medication Reminders</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Reminder title"
                      value={newReminder.title}
                      onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                    <input 
                      type="time"
                      value={newReminder.time}
                      onChange={(e) => setNewReminder({...newReminder, time: e.target.value})}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                    <button 
                      type="button"
                      onClick={addReminder}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {reminders.map(reminder => (
                      <div key={reminder.id} className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                        <div>
                          <p className="font-medium text-white">{reminder.title}</p>
                          <p className="text-sm text-zinc-400">{reminder.time}</p>
                        </div>
                        <button 
                          onClick={() => deleteReminder(reminder.id)}
                          className="text-zinc-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Integration Settings */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-xl font-semibold">Auto-Tracking Integrations</h2>
                </div>
                <p className="text-sm text-zinc-400">Link your coding and language learning accounts to automatically verify your habits.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">GitHub Username</label>
                    <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                      <span className="pl-4 text-zinc-600 text-sm">github.com/</span>
                      <input 
                        type="text"
                        value={githubHandle}
                        onChange={(e) => setGithubHandle(e.target.value)}
                        className="flex-1 bg-transparent px-2 py-3 text-white focus:outline-none"
                        placeholder="username"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">LeetCode Username</label>
                    <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                      <span className="pl-4 text-zinc-600 text-sm">leetcode.com/u/</span>
                      <input 
                        type="text"
                        value={leetcodeHandle}
                        onChange={(e) => setLeetcodeHandle(e.target.value)}
                        className="flex-1 bg-transparent px-2 py-3 text-white focus:outline-none"
                        placeholder="username"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Duolingo Username</label>
                    <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                      <span className="pl-4 text-zinc-600 text-sm">duolingo.com/profile/</span>
                      <input 
                        type="text"
                        value={duolingoHandle}
                        onChange={(e) => setDuolingoHandle(e.target.value)}
                        className="flex-1 bg-transparent px-2 py-3 text-white focus:outline-none"
                        placeholder="username"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-4">
                <AnimatePresence>
                  {success && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2 text-emerald-500 text-sm font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Changes saved successfully!
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 disabled:opacity-50 transition-all"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
