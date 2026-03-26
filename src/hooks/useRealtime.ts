import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

export function useRealtime(groupId: string | undefined) {
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [groupState, setGroupState] = useState<any>(null);

  useEffect(() => {
    if (!groupId) return;

    // 1. Initial Fetch
    const fetchInitialData = async () => {
      // Fetch group state
      const { data: groupData } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      
      if (groupData) setGroupState(groupData);

      // Fetch all members with their user profiles
      const { data: membersData } = await supabase
        .from('group_members')
        .select(`
          *,
          users (
            username,
            avatar_url,
            github_handle,
            leetcode_handle,
            duolingo_handle
          )
        `)
        .eq('group_id', groupId);
      
      if (membersData) setGroupMembers(membersData);
    };

    fetchInitialData();

    // 2. Set up Realtime Subscriptions
    const channel = supabase.channel(`group_${groupId}`);

    // Listen for changes to the group (e.g., character state/hp)
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` },
      (payload) => {
        setGroupState(payload.new);
      }
    );

    // Listen for changes to group members (e.g., pet hp, streak, new members)
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
      async (payload) => {
        console.log("Realtime payload received:", payload);
        if (payload.eventType === 'INSERT') {
          // Fetch the user profile for the new member
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', payload.new.user_id)
            .single();
            
          setGroupMembers((prev) => [...prev, { ...payload.new, users: userData }]);
        } else if (payload.eventType === 'UPDATE') {
          console.log("Updating group member:", payload.new);
          setGroupMembers((prev) => 
            prev.map((member) => 
              member.id === payload.new.id ? { ...member, ...payload.new } : member
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setGroupMembers((prev) => prev.filter((member) => member.id !== payload.old.id));
        }
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  return { groupMembers, groupState };
}
