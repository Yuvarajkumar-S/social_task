import { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { Send, MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  users: {
    username: string;
    avatar_url: string | null;
  };
}

interface GroupChatProps {
  groupId: string;
}

export default function GroupChat({ groupId }: GroupChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('group_messages')
        .select(`
          id,
          user_id,
          content,
          created_at,
          users ( username, avatar_url )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error("Error fetching messages:", error);
      } else if (data) {
        setMessages(data as any[]);
      }
      setLoading(false);
    };

    fetchMessages();

    const channel = supabase
      .channel(`group_chat_${groupId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`
      }, (payload) => {
        // We need to fetch the user info for the new message
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase
      .from('group_messages')
      .insert([{
        group_id: groupId,
        user_id: user.id,
        content
      }]);

    if (error) {
      console.error("Error sending message:", error);
      setNewMessage(content); // Restore message so user doesn't lose it
      if (error.code === '42P01') {
        alert("Database table 'group_messages' is missing. Please run the SQL provided in the instructions.");
      } else {
        alert("Failed to send message: " + error.message);
      }
    }
  };

  if (loading) {
    return <div className="text-zinc-500 text-sm italic">Loading chat...</div>;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col h-[500px] shadow-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-emerald-500" />
        <h2 className="font-semibold">Group Chat</h2>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800"
      >
        {messages.length === 0 ? (
          <p className="text-zinc-500 text-sm italic text-center mt-4">No messages yet. Say hi!</p>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-3 ${msg.user_id === user?.id ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex-shrink-0 overflow-hidden mt-1">
                {msg.users.avatar_url ? (
                  <img src={msg.users.avatar_url} alt={msg.users.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-500">
                    {msg.users.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className={`flex flex-col ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    {msg.users.username}
                  </span>
                  <span className="text-[9px] text-zinc-600">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div 
                  className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.user_id === user?.id 
                      ? 'bg-emerald-600 text-white rounded-tr-none' 
                      : 'bg-zinc-800 text-zinc-200 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-zinc-800 bg-zinc-900/50">
        <div className="relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-full py-2 pl-4 pr-12 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full disabled:opacity-50 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
