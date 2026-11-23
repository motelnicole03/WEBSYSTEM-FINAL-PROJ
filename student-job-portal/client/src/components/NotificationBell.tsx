import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { timeAgo } from '../lib/timeAgo';
import { useDropdown } from '../lib/useDropdown';
import Badge from './Badge';
import { BellIcon } from './icons';

interface Notification {
  notificationId: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface Props {
  unread: number;
  onUnreadChange: (count: number) => void;
}

export default function NotificationBell({ unread, onUnreadChange }: Props) {
  const { open, toggle, ref } = useDropdown();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Load the latest notifications each time the dropdown opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get<Notification[]>('/notifications?limit=8')
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const markRead = async (n: Notification) => {
    if (n.isRead) return;
    setItems((list) => list.map((x) => (x.notificationId === n.notificationId ? { ...x, isRead: true } : x)));
    onUnreadChange(Math.max(0, unread - 1));
    await api.post(`/notifications/${n.notificationId}/read`).catch(() => {});
  };

  const markAll = async () => {
    setItems((list) => list.map((x) => ({ ...x, isRead: true })));
    onUnreadChange(0);
    await api.post('/notifications/read-all').catch(() => {});
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-label="Notifications" aria-expanded={open} className="relative rounded-full p-2 text-brand hover:bg-brand-soft">
        <BellIcon width={20} height={20} />
        <Badge count={unread} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-lg border border-line bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-brand hover:underline">Mark all as read</button>
            )}
          </div>

          <ul className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 && <li className="px-4 py-6 text-center text-xs text-muted">Loading...</li>}
            {!loading && items.length === 0 && <li className="px-4 py-6 text-center text-xs text-muted">No notifications yet.</li>}
            {items.map((n) => (
              <li key={n.notificationId}>
                <button
                  onClick={() => markRead(n)}
                  className={`flex w-full gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-slate-50 ${n.isRead ? '' : 'bg-brand-soft/60'}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-brand'}`} />
                  <span className="text-xs leading-relaxed">
                    {n.message}
                    <span className="mt-0.5 block text-[11px] text-muted">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
