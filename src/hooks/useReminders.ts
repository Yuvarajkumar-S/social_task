import { useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../hooks/useAuth';

export const useReminders = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkReminders = async () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const currentDay = now.getDay(); // 0-6

      const { data: reminders, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('time', currentTime)
        .contains('days', [currentDay]);

      if (error) {
        console.error('Error checking reminders:', error);
        return;
      }

      reminders?.forEach(reminder => {
        if (Notification.permission === 'granted') {
          new Notification(reminder.title, {
            body: reminder.notes || 'Time for your medication!',
          });
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user]);
};
