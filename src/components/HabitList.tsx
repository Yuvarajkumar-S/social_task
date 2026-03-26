import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle2, Circle, Plus, Trash2, Github, RefreshCw, Flame, Camera, Loader2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { checkGithubCommitsToday } from '../services/githubClient';
import { checkLeetCodeSolvedToday } from '../services/leetcodeClient';
import { checkDuolingoStreakToday } from '../services/duolingoClient';
import { useNotifications } from '../hooks/useNotifications';
import { askGeminiWithImage } from '../services/geminiClient';

function getPreviousDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  const nd = String(date.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

function calculateStreak(dates: string[], todayStr: string): number {
  const dateSet = new Set(dates);
  if (dateSet.size === 0) return 0;
  
  const yesterdayStr = getPreviousDateStr(todayStr);
  
  let streak = 0;
  let currentDateStr = todayStr;
  
  if (dateSet.has(todayStr)) {
    currentDateStr = todayStr;
  } else if (dateSet.has(yesterdayStr)) {
    currentDateStr = yesterdayStr;
  } else {
    return 0;
  }
  
  while (dateSet.has(currentDateStr)) {
    streak++;
    currentDateStr = getPreviousDateStr(currentDateStr);
  }
  
  return streak;
}

interface Habit {
  id: string;
  title: string;
  is_rescue_habit?: boolean;
  group_id?: string; // To identify if it's a group task
}

interface HabitLog {
  id: string;
  habit_id?: string;
  group_task_id?: string;
  completed_date: string;
  verified?: boolean;
  confidence?: number;
  reasoning?: string;
  user_id?: string; // Added for group task completions
}

interface FloatingText {
  id: number;
  habitId: string;
  text: string;
  color: string;
}

export default function HabitList({ groupId }: { groupId: string | null }) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  
  const [githubHandle, setGithubHandle] = useState<string | null>(null);
  const [leetcodeHandle, setLeetcodeHandle] = useState<string | null>(null);
  const [duolingoHandle, setDuolingoHandle] = useState<string | null>(null);
  const [syncingIntegrations, setSyncingIntegrations] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [verifyingHabitId, setVerifyingHabitId] = useState<string | null>(null);

  const { sendNotification } = useNotifications();

  // Get today's date in YYYY-MM-DD format based on local timezone
  const today = new Date().toLocaleDateString('en-CA'); 

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch user data for integrations
      const { data: userData } = await supabase.from('users').select('github_handle, leetcode_handle, duolingo_handle').eq('id', user.id).single();
      if (userData?.github_handle) setGithubHandle(userData.github_handle);
      if (userData?.leetcode_handle) setLeetcodeHandle(userData.leetcode_handle);
      if (userData?.duolingo_handle) setDuolingoHandle(userData.duolingo_handle);

      // Determine which table to use
      const habitTable = groupId ? 'group_tasks' : 'personal_habits';
      const logTable = groupId ? 'group_task_completions' : 'personal_habit_logs';
      const habitIdField = groupId ? 'group_task_id' : 'habit_id';

      // Fetch user's habits
      let query = supabase
        .from(habitTable)
        .select('*')
        .eq(groupId ? 'group_id' : 'user_id', groupId || user.id);
      
      if (groupId) {
        const { data: membersData } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', groupId);
        if (membersData) setGroupMembers(membersData);
      }

      const { data: habitsData, error: habitsError } = await query.order('created_at', { ascending: true });

      if (habitsError) console.error("Error fetching habits:", habitsError);
      if (habitsData) setHabits(habitsData);

      // Fetch ALL logs for these habits to calculate streaks
      let logsQuery = supabase.from(logTable).select('*');
      if (groupId) {
        // For group tasks, we need all logs for the tasks in this group
        logsQuery = logsQuery.in(habitIdField, habitsData?.map(h => h.id) || []);
      } else {
        logsQuery = logsQuery.eq('user_id', user.id);
      }

      const { data: allLogsData, error: logsError } = await logsQuery;

      if (logsError) console.error("Error fetching logs:", logsError);
      if (allLogsData) {
        const todaysLogs = allLogsData.filter(l => l.completed_date === today);
        setLogs(todaysLogs);

        const newStreaks: Record<string, number> = {};
        habitsData?.forEach(h => {
          const habitDates = allLogsData.filter(l => l[habitIdField] === h.id).map(l => l.completed_date);
          newStreaks[h.id] = calculateStreak(habitDates, today);
        });
        setStreaks(newStreaks);
      }
      setLoading(false);
    };

    fetchData();
  }, [groupId, user, today]);

  const addHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newHabitTitle.trim() || !user) return;

    const habitTable = groupId ? 'group_tasks' : 'personal_habits';
    const insertData: any = { title: newHabitTitle.trim() };
    if (groupId) insertData.group_id = groupId;
    else insertData.user_id = user.id;

    const { data, error: insertError } = await supabase
      .from(habitTable)
      .insert([insertData])
      .select()
      .single();

    if (insertError) {
      console.error("Error adding habit:", insertError);
      setError(insertError.message);
    } else if (data) {
      setHabits([...habits, data]);
      setNewHabitTitle('');
    }
  };

  const deleteHabit = async (habitId: string) => {
    const habitTable = groupId ? 'group_tasks' : 'personal_habits';
    const { error } = await supabase.from(habitTable).delete().eq('id', habitId);
    if (!error) {
      setHabits(habits.filter(h => h.id !== habitId));
      setLogs(logs.filter(l => (groupId ? l.habit_id : l.habit_id) !== habitId));
    }
  };

  const spawnFloatingText = (habitId: string) => {
    const id1 = Date.now();
    const id2 = id1 + 1;
    
    setFloatingTexts(prev => [
      ...prev, 
      { id: id1, habitId, text: "+5 Pet HP", color: "text-emerald-400" },
      { id: id2, habitId, text: "-10 Boss HP", color: "text-purple-400" }
    ]);

    // Clean up after animation
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== id1 && ft.id !== id2));
    }, 2000);
  };

  const isIntegrationHabit = (title: string) => {
    const t = title.toLowerCase();
    return t.includes('github') || t.includes('leetcode') || t.includes('duolingo');
  };

  const toggleHabit = async (habitId: string, forceCheck = false, verificationData?: { verified: boolean, confidence: number, reasoning: string }) => {
    if (!user) return;
    const habitTable = groupId ? 'group_tasks' : 'personal_habits';
    const logTable = groupId ? 'group_task_completions' : 'personal_habit_logs';
    const habitIdField = groupId ? 'group_task_id' : 'habit_id';
    
    const existingLog = logs.find(l => {
      const logHabitId = (l as any)[habitIdField];
      return logHabitId === habitId && (groupId ? l.user_id === user.id : true);
    });
    const habit = habits.find(h => h.id === habitId);

    if (existingLog && !forceCheck) {
      // Uncheck
      await supabase.from(logTable).delete().eq('id', existingLog.id);
      setLogs(logs.filter(l => l.id !== existingLog.id));
      setStreaks(prev => ({ ...prev, [habitId]: Math.max(0, (prev[habitId] || 1) - 1) }));
    } else if (existingLog && forceCheck && verificationData) {
      // Update verification data for existing log
      const { data, error } = await supabase
        .from(logTable)
        .update({
          verified: verificationData.verified,
          confidence: verificationData.confidence,
          reasoning: verificationData.reasoning
        })
        .eq('id', existingLog.id)
        .select()
        .single();

      if (!error && data) {
        setLogs(prev => prev.map(l => l.id === data.id ? data : l));
        
        // Add bonus XP for verification if it wasn't verified before
        if (verificationData.verified && !existingLog.verified) {
          await supabase.from('xp_ledger').insert([{
            user_id: user.id,
            amount: 100,
            reason: 'Verified Activity Log (Bonus)'
          }]);
        }
      }
    } else if (!existingLog) {
      // Check
      const insertData: any = { [habitIdField]: habitId, user_id: user.id, completed_date: today };
      if (verificationData) {
        insertData.verified = verificationData.verified;
        insertData.confidence = verificationData.confidence;
        insertData.reasoning = verificationData.reasoning;
      }

      const { data, error } = await supabase
        .from(logTable)
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error("Error inserting log:", error);
        setError(error.message);
        alert("Error checking habit: " + error.message);
      } else if (data) {
        console.log("Log inserted successfully:", data);
        setLogs(prev => [...prev, data]);
        const newStreak = (streaks[habitId] || 0) + 1;
        setStreaks(prev => ({ ...prev, [habitId]: newStreak }));
        spawnFloatingText(habitId);
        
        // Heal pet by 5, damage boss by 10!
        console.log("Calling complete_habit_action RPC...");
        const { error: rpcError } = await supabase.rpc('complete_habit_action', { 
          target_user_id: user.id, 
          target_group_id: groupId || null,
          pet_heal_amount: 5,
          boss_damage_amount: 10
        });
        
        if (rpcError) {
          console.error("Error calling complete_habit_action RPC:", rpcError);
        } else {
          console.log("complete_habit_action RPC called successfully.");
        }

        // Add XP for habit completion
        await supabase.from('xp_ledger').insert([{
          user_id: user.id,
          amount: 10,
          reason: 'Habit Completion'
        }]);

        if (newStreak === 7) {
          await supabase.from('xp_ledger').insert([{
            user_id: user.id,
            amount: 50,
            reason: '7-Day Streak'
          }]);
        }

        if (verificationData?.verified) {
          await supabase.from('xp_ledger').insert([{
            user_id: user.id,
            amount: 100,
            reason: 'Verified Activity Log'
          }]);
        }

        // Send push notification
        const habitTitle = habits.find(h => h.id === habitId)?.title || 'Habit';
        sendNotification('Habit Completed!', {
          body: `You completed "${habitTitle}". +5 Pet HP, -10 Boss HP!`,
          icon: '/favicon.ico'
        });

        // Rescue habit completion logic
        if (habit?.is_rescue_habit) {
          const { data: allLogs } = await supabase
            .from(logTable)
            .select('user_id')
            .eq(habitIdField, habitId)
            .eq('completed_date', today);
          
          if (allLogs && allLogs.length === groupMembers.length) {
            // All completed!
            const { data: group } = await supabase.from('groups').select('previous_streak').eq('id', groupId).single();
            if (group) {
              await supabase.from('groups').update({ group_streak: group.previous_streak }).eq('id', groupId);
            }
            await supabase.from(habitTable).delete().eq('id', habitId);
            setHabits(habits.filter(h => h.id !== habitId));
          }
        }
      }
    }
  };

  const syncIntegrations = async () => {
    if (!user) return;
    setSyncingIntegrations(true);
    setError(null);
    setSyncSuccess(null);

    try {
      let syncedFeatures: string[] = [];
      // GitHub
      if (githubHandle) {
        const hasCommits = await checkGithubCommitsToday(githubHandle);
        if (hasCommits) {
          let githubHabit = habits.find(h => h.title.toLowerCase().includes('github') || h.title.toLowerCase().includes('code'));
          if (!githubHabit) {
            const habitTable = groupId ? 'habits' : 'personal_habits';
            const insertData: any = { title: 'GitHub Commits', user_id: user.id };
            if (groupId) insertData.group_id = groupId;
            const { data, error: insertError } = await supabase.from(habitTable).insert([insertData]).select().single();
            if (!insertError) { githubHabit = data; setHabits(prev => [...prev, data]); }
          }
          if (githubHabit && !logs.some(l => l.habit_id === githubHabit.id)) {
            await toggleHabit(githubHabit.id, true, { verified: true, confidence: 100, reasoning: 'Found GitHub commits today.' });
            syncedFeatures.push('GitHub (+110 XP)');
          }
        }
      }

      // LeetCode
      if (leetcodeHandle) {
        const hasSolved = await checkLeetCodeSolvedToday(leetcodeHandle);
        if (hasSolved) {
          let leetcodeHabit = habits.find(h => h.title.toLowerCase().includes('leetcode'));
          if (!leetcodeHabit) {
            const habitTable = groupId ? 'habits' : 'personal_habits';
            const insertData: any = { title: 'LeetCode Problem', user_id: user.id };
            if (groupId) insertData.group_id = groupId;
            const { data, error: insertError } = await supabase.from(habitTable).insert([insertData]).select().single();
            if (!insertError) { leetcodeHabit = data; setHabits(prev => [...prev, data]); }
          }
          if (leetcodeHabit && !logs.some(l => l.habit_id === leetcodeHabit.id)) {
            await toggleHabit(leetcodeHabit.id, true, { verified: true, confidence: 100, reasoning: 'Found LeetCode submission today.' });
            syncedFeatures.push('LeetCode (+110 XP)');
          }
        }
      }

      // Duolingo
      if (duolingoHandle) {
        const hasActiveStreak = await checkDuolingoStreakToday(duolingoHandle);
        if (hasActiveStreak) {
          let duolingoHabit = habits.find(h => h.title.toLowerCase().includes('duolingo'));
          if (!duolingoHabit) {
            const habitTable = groupId ? 'habits' : 'personal_habits';
            const insertData: any = { title: 'Duolingo Lesson', user_id: user.id };
            if (groupId) insertData.group_id = groupId;
            const { data, error: insertError } = await supabase.from(habitTable).insert([insertData]).select().single();
            if (!insertError) { duolingoHabit = data; setHabits(prev => [...prev, data]); }
          }
          if (duolingoHabit && !logs.some(l => l.habit_id === duolingoHabit.id)) {
            await toggleHabit(duolingoHabit.id, true, { verified: true, confidence: 100, reasoning: 'Found active Duolingo streak today.' });
            syncedFeatures.push('Duolingo (+110 XP)');
          }
        }
      }

      if (syncedFeatures.length > 0) {
        setSyncSuccess(`Synced: ${syncedFeatures.join(', ')}`);
        setTimeout(() => setSyncSuccess(null), 5000);
      } else {
        setError("No new activity found in your linked accounts for today.");
      }
    } catch (err: any) {
      setError("Failed to sync integrations: " + err.message);
    } finally {
      setSyncingIntegrations(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, habit: Habit) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVerifyingHabitId(habit.id);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const mimeType = file.type;

        const prompt = `Look at this screenshot carefully. The user claims it proves they completed the following habit: ${habit.title}. Does this screenshot plausibly prove this habit was completed? Respond in JSON format only with three fields: verified (boolean), confidence (integer from 0 to 100), and reasoning (one sentence string).`;

        const responseText = await askGeminiWithImage(prompt, base64String, mimeType);
        
        try {
          // Clean up the response text in case Gemini wraps it in markdown code blocks
          const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const result = JSON.parse(cleanedText);
          
          if (result.verified) {
            await toggleHabit(habit.id, true, {
              verified: result.verified,
              confidence: result.confidence,
              reasoning: result.reasoning
            });
            sendNotification('Habit Verified!', {
              body: `AI verified "${habit.title}" with ${result.confidence}% confidence.`,
              icon: '/favicon.ico'
            });
          } else {
            setError(`Verification failed for "${habit.title}": ${result.reasoning}`);
          }
        } catch (parseError) {
          console.error("Failed to parse Gemini response:", responseText);
          setError("Failed to parse verification result.");
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError("Failed to verify image: " + err.message);
    } finally {
      // Small delay to let the UI update if checked
      setTimeout(() => setVerifyingHabitId(null), 500);
    }
  };

  if (loading) return <div className="text-zinc-500 animate-pulse">Loading habits...</div>;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">{groupId ? 'Group Habits' : 'Personal Habits'}</h2>
        {(githubHandle || leetcodeHandle || duolingoHandle) && (
          <button 
            onClick={syncIntegrations}
            disabled={syncingIntegrations}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors disabled:opacity-50"
            title="Check for integrations today"
          >
            <RefreshCw className={`w-4 h-4 ${syncingIntegrations ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync Integrations</span>
          </button>
        )}
      </div>
      
      {syncSuccess && (
        <div className="mb-4 text-emerald-400 text-sm bg-emerald-500/10 py-2 px-3 rounded-lg border border-emerald-500/20 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          {syncSuccess}
        </div>
      )}

      {error && (
        <div className="mb-4 text-red-500 text-sm bg-red-500/10 py-2 px-3 rounded-lg border border-red-500/20">
          {error}
        </div>
      )}

      <div className="space-y-3 mb-6">
        {habits.length === 0 ? (
          <p className="text-zinc-500 text-sm italic">No habits added yet. Start small!</p>
        ) : (
          habits.map(habit => {
            const habitIdField = groupId ? 'group_task_id' : 'habit_id';
            const completedLog = logs.find(l => 
              (l as any)[habitIdField] === habit.id && 
              (groupId ? l.user_id === user?.id : true)
            );
            const isCompleted = !!completedLog;
            const isVerified = completedLog?.verified;
            const activeFloatingTexts = floatingTexts.filter(ft => ft.habitId === habit.id);

            return (
              <div 
                key={habit.id} 
                className={`relative flex items-center justify-between p-3 rounded-lg border transition-all ${
                  isCompleted 
                    ? 'bg-emerald-950/20 border-emerald-900/30' 
                    : habit.is_rescue_habit
                      ? 'bg-red-950/20 border-red-900/50'
                      : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <AnimatePresence>
                  {activeFloatingTexts.map((ft, index) => (
                    <motion.div
                      key={ft.id}
                      initial={{ opacity: 0, y: 0, x: "-50%", scale: 0.5 }}
                      animate={{ opacity: 1, y: index % 2 === 0 ? -25 : -45, x: "-50%", scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: index % 2 === 0 ? 0 : 0.15 }}
                      className={`absolute left-1/2 font-bold text-sm pointer-events-none z-10 whitespace-nowrap ${ft.color}`}
                      style={{ top: '0px' }}
                    >
                      {ft.text}
                    </motion.div>
                  ))}
                </AnimatePresence>

                <button 
                  onClick={() => !isIntegrationHabit(habit.title) && toggleHabit(habit.id)}
                  disabled={isIntegrationHabit(habit.title)}
                  className={`flex items-center gap-3 flex-1 text-left ${isIntegrationHabit(habit.title) ? 'cursor-default' : ''}`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Circle className={`w-6 h-6 flex-shrink-0 ${isIntegrationHabit(habit.title) ? 'text-zinc-800' : 'text-zinc-600'}`} />
                  )}
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isCompleted ? 'text-emerald-500 line-through opacity-70' : 'text-zinc-200'}`}>
                        {habit.title}
                      </span>
                      {groupId && (
                        <span className="text-xs text-zinc-500">
                          ({logs.filter(l => (groupId ? l.habit_id : l.habit_id) === habit.id).length}/{groupMembers.length})
                        </span>
                      )}
                      {isIntegrationHabit(habit.title) && (
                        <span className="px-1.5 py-0.5 bg-zinc-800 text-[10px] text-zinc-400 rounded uppercase tracking-wider font-bold">Auto</span>
                      )}
                      {isVerified && (
                        <span title={`Verified by AI (${completedLog.confidence}% confidence)`}>
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        </span>
                      )}
                    </div>
                    {(streaks[habit.id] || 0) > 0 && (
                      <div className={`flex items-center gap-1 text-xs font-medium mt-0.5 ${
                        (streaks[habit.id] || 0) >= 7 
                          ? 'text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20' 
                          : 'text-orange-400'
                      }`}>
                        <Flame className={`w-3 h-3 ${(streaks[habit.id] || 0) >= 7 ? 'animate-pulse text-rose-500' : ''}`} />
                        {streaks[habit.id]} {streaks[habit.id] === 1 ? 'Day' : 'Days'} Streak
                      </div>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <label 
                    className={`p-2 transition-colors rounded-md cursor-pointer ${
                      isCompleted ? 'text-emerald-600/50 cursor-not-allowed' : 'text-zinc-600 hover:text-emerald-400 hover:bg-zinc-800'
                    }`}
                    title={isCompleted ? "Already completed" : "Upload proof"}
                  >
                    {verifyingHabitId === habit.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFileUpload(e, habit)}
                      disabled={isCompleted || verifyingHabitId === habit.id}
                    />
                  </label>
                  <button 
                    onClick={() => deleteHabit(habit.id)}
                    className="p-2 text-zinc-600 hover:text-red-400 transition-colors rounded-md hover:bg-zinc-800"
                    title="Delete habit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={addHabit} className="flex gap-2">
        <input
          type="text"
          value={newHabitTitle}
          onChange={(e) => setNewHabitTitle(e.target.value)}
          placeholder="E.g. Read 10 pages, Drink water..."
          className="flex-1 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button 
          type="submit"
          disabled={!newHabitTitle.trim()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </form>
    </div>
  );
}
