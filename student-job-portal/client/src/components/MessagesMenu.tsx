import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { api } from '../lib/api';
import { timeAgo } from '../lib/timeAgo';
import { useDropdown } from '../lib/useDropdown';
import Badge from './Badge';
import { MessageIcon } from './icons';

interface Conversation {
  applicationId: number;
  opportunityTitle: string;
  companyName: string;
  firstName: string;
  lastName: string;
  lastBody: string;
  lastSentAt: string;
  lastFromMe: boolean;
  unread: number;
}

/** The message icon in the navbar. Opens a list of conversations; clicking one opens a chat window. */
export default function MessagesMenu({ unread }: { unread: number }) {
  const { user } = useAuth();
  const { openChat } = useChat();
  const { open, setOpen, toggle, ref } = useDropdown();
  const [items, setItems] = useState<Conversation[] | null>(null);

  const isStudent = user?.role === 'student';

  // Load when opened, and keep fresh while it stays open
  useEffect(() => {
    if (!open) return;
    const load = () => api.get<Conversation[]>('/messages/inbox').then(setItems).catch(() => {});
    load();
    const timer = setInterval(load, 10_000);
    return () => clearInterval(timer);
  }, [open]);

  const otherName = (c: Conversation) => (isStudent ? c.companyName : `${c.firstName} ${c.lastName}`);

  const pick = (c: Conversation) => {
    openChat({ applicationId: c.applicationId, name: otherName(c), subtitle: c.opportunityTitle });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-label="Messages" aria-expanded={open} className="relative rounded-full p-2 text-brand hover:bg-brand-soft">
        <MessageIcon width={20} height={20} />
        <Badge count={unread} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-lg border border-line bg-white shadow-xl">
          <p className="border-b border-line px-4 py-3 text-sm font-semibold">Messages</p>
          <ul className="max-h-96 overflow-y-auto">
            {items === null && <li className="px-4 py-6 text-center text-xs text-muted">Loading...</li>}
            {items?.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-muted">
                No conversations yet.{' '}
                {isStudent ? 'Employers can message you after you apply.' : 'Message an applicant from your applicants list.'}
              </li>
            )}
            {items?.map((c) => (
              <li key={c.applicationId}>
                <button onClick={() => pick(c)} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-slate-50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                    {otherName(c).charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-sm ${c.unread ? 'font-semibold' : 'font-medium'}`}>{otherName(c)}</span>
                      <span className="shrink-0 text-[11px] text-muted">{timeAgo(c.lastSentAt)}</span>
                    </span>
                    <span className="block truncate text-[11px] text-muted">{c.opportunityTitle}</span>
                    <span className={`block truncate text-xs ${c.unread ? 'font-semibold text-ink' : 'text-muted'}`}>
                      {c.lastFromMe ? 'You: ' : ''}{c.lastBody}
                    </span>
                  </span>
                  {c.unread > 0 && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
