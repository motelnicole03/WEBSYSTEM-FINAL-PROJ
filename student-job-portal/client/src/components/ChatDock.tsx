import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChatTarget, useChat } from '../context/ChatContext';
import { api, errorMessage } from '../lib/api';

interface Message {
  messageId: number;
  senderId: number;
  body: string;
  sentAt: string;
}

interface Thread {
  messages: Message[];
}

const WIDTH = 328; // px
const GAP = 12;
const MARGIN = 16;

/** Tells the navbar to re-read its unread counts. */
const announceChange = () => window.dispatchEvent(new Event('sc:unread-changed'));

/** The chat windows docked to the bottom-right of the screen, like Messenger. */
export default function ChatDock() {
  const { user } = useAuth();
  const { windows } = useChat();

  if (!user || (user.role !== 'student' && user.role !== 'employer')) return null;

  return (
    <>
      {windows.map((w, index) => (
        <ChatBox
          key={w.applicationId}
          target={w}
          minimized={w.minimized}
          // The newest window is on the left of the older ones, so they never overlap
          offset={MARGIN + (windows.length - 1 - index) * (WIDTH + GAP)}
          hiddenOnPhone={index < windows.length - 1}
        />
      ))}
    </>
  );
}

function ChatBox({
  target,
  minimized,
  offset,
  hiddenOnPhone,
}: {
  target: ChatTarget;
  minimized: boolean;
  offset: number;
  hiddenOnPhone: boolean;
}) {
  const { user } = useAuth();
  const { closeChat, toggleMinimize } = useChat();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Loading a thread also marks the incoming messages as read on the server
  const load = useCallback(async () => {
    try {
      const thread = await api.get<Thread>(`/messages?applicationId=${target.applicationId}`);
      setMessages(thread.messages);
      announceChange();
    } catch {
      /* keep what we have; the next refresh tries again */
    }
  }, [target.applicationId]);

  // Refresh every 5 seconds while the window is expanded
  useEffect(() => {
    if (minimized) return;
    load();
    const timer = setInterval(load, 5_000);
    return () => clearInterval(timer);
  }, [load, minimized]);

  // Keep the newest message in view
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, minimized]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await api.post<Message>('/messages', { applicationId: target.applicationId, body });
      setMessages((list) => [...list, saved]);
      setText('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      style={{ right: offset, width: WIDTH }}
      className={`fixed bottom-0 z-40 flex flex-col overflow-hidden rounded-t-lg border border-line bg-white shadow-2xl max-sm:!right-0 max-sm:!w-full ${hiddenOnPhone ? 'max-sm:hidden' : ''}`}
    >
      <header className="flex items-center justify-between bg-brand px-3 py-2 text-white">
        <button onClick={() => toggleMinimize(target.applicationId)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-label={minimized ? 'Expand chat' : 'Minimize chat'}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
            {target.name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight">{target.name}</span>
            <span className="block truncate text-[11px] leading-tight text-white/80">{target.subtitle}</span>
          </span>
        </button>
        <button onClick={() => toggleMinimize(target.applicationId)} className="px-2 text-lg leading-none hover:text-white/70" aria-label="Minimize">&minus;</button>
        <button onClick={() => closeChat(target.applicationId)} className="px-1 text-lg leading-none hover:text-white/70" aria-label="Close chat">&times;</button>
      </header>

      {!minimized && (
        <>
          <div className="h-80 space-y-2 overflow-y-auto bg-slate-50 p-3">
            {messages.length === 0 && <p className="pt-10 text-center text-xs text-muted">No messages yet. Say hello!</p>}
            {messages.map((m) => {
              const mine = m.senderId === user?.id;
              return (
                <div key={m.messageId} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-brand text-white' : 'bg-white text-ink shadow-sm'}`}>
                    {m.body}
                    <span className={`mt-0.5 block text-[10px] ${mine ? 'text-white/70' : 'text-muted'}`}>
                      {new Date(m.sentAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="border-t border-line p-2">
            {error && <p className="px-1 pb-1 text-xs text-brand">{error}</p>}
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={2000}
                placeholder="Aa"
                aria-label="Message"
                className="flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30"
              />
              <button disabled={busy || !text.trim()} className="rounded-full bg-brand px-4 py-2 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50">
                Send
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
