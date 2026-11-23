import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

/** Unread notification and message counts for the navbar badges. Refreshes every 30 seconds. */
export function useUnreadCounts(canMessage: boolean) {
  const [notifications, setNotifications] = useState(0);
  const [messages, setMessages] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setNotifications((await api.get<{ unread: number }>('/notifications/unread-count')).unread);
      if (canMessage) setMessages((await api.get<{ unread: number }>('/messages/unread-count')).unread);
    } catch {
      /* a failed refresh just keeps the old numbers */
    }
  }, [canMessage]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30_000);
    // Chat windows announce when they mark messages as read
    window.addEventListener('sc:unread-changed', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('sc:unread-changed', refresh);
    };
  }, [refresh]);

  return { notifications, messages, refresh, setNotifications };
}
