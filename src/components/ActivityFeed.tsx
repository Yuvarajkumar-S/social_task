import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ActivityLog {
  id: string;
  user_id: string;
  habit_id: string;
  completed_date: string;
  users: {
    username: string;
  };
  habits: {
    title: string;
  };
}

interface ActivityFeedProps {
  groupId: string;
}

export default function ActivityFeed({ groupId }: ActivityFeedProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const table = groupId ? 'group_task_completions' : 'habit_logs';
    const habitIdField = groupId ? 'group_task_id' : 'habit_id';
    const habitTable = groupId ? 'group_tasks' : 'habits';

    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from(table)
        .select(`
          id,
          user_id,
          ${habitIdField},
          completed_date,
          users ( username ),
          ${habitTable}!inner ( title, group_id )
        `)
        .eq(`${habitTable}.group_id`, groupId)
        // Removed .order('created_at', { ascending: false }) as it might not exist
        .limit(10);

      if (error) {
        console.error("Error fetching activity logs:", error);
      } else if (data) {
        const filteredLogs = (data as any[]).filter(l => l[habitTable] !== null);
        setLogs(filteredLogs.map(l => ({
            ...l,
            habit_id: l[habitIdField],
            habits: l[habitTable]
        })));
      }
      setLoading(false);
    };

    fetchLogs();

    // Subscribe to new logs
    const channel = supabase
      .channel('activity_feed')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: table
      }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  if (loading) {
    return <div className="text-zinc-500 text-sm italic">Loading activity...</div>;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col h-[500px] shadow-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-2">
        <Clock className="w-5 h-5 text-emerald-500" />
        <h2 className="font-semibold">Group Activity</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
        {logs.length === 0 ? (
          <p className="text-zinc-500 text-sm italic text-center mt-4">No recent activity. Be the first!</p>
        ) : (
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3 p-3 bg-zinc-950/50 rounded-lg border border-zinc-800/50"
              >
                <div className="mt-1">
                  <CheckCircle2 className="w-5 h-5 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200">
                    <span className="font-bold text-white">{log.users.username}</span>
                    {" completed "}
                    <span className="text-emerald-400 font-medium">{log.habits.title}</span>
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
