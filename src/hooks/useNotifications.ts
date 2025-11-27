// src/hooks/useNotifications.ts

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check notification permission on mount
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (permission === 'granted') {
      try {
        new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options,
        });
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  };

  const subscribeToNotices = (callback?: (notice: any) => void) => {
    const channel = supabase
      .channel('notice-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notices',
          filter: 'status=eq.approved'
        },
        (payload) => {
          const newNotice = payload.new;
          showNotification(
            'New Notice Published',
            {
              body: `${newNotice.title}`,
              tag: `notice-${newNotice.id}`,
              requireInteraction: newNotice.priority === 'urgent',
              silent: newNotice.priority !== 'urgent',
            }
          );

          callback?.(newNotice);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return {
    permission,
    requestPermission,
    showNotification,
    subscribeToNotices,
  };
};