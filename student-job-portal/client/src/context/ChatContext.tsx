import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

export interface ChatTarget {
  applicationId: number;
  name: string; // the other person (or company)
  subtitle: string; // the opportunity title
}

interface ChatWindow extends ChatTarget {
  minimized: boolean;
}

interface ChatState {
  windows: ChatWindow[];
  openChat: (target: ChatTarget) => void;
  closeChat: (applicationId: number) => void;
  toggleMinimize: (applicationId: number) => void;
}

const MAX_WINDOWS = 3; // like Messenger, only a few at the bottom of the screen

const ChatContext = createContext<ChatState | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<ChatWindow[]>([]);

  const openChat = useCallback((target: ChatTarget) => {
    setWindows((list) => {
      const existing = list.find((w) => w.applicationId === target.applicationId);
      if (existing) return list.map((w) => (w === existing ? { ...w, minimized: false } : w));
      return [...list, { ...target, minimized: false }].slice(-MAX_WINDOWS);
    });
  }, []);

  const closeChat = useCallback((applicationId: number) => {
    setWindows((list) => list.filter((w) => w.applicationId !== applicationId));
  }, []);

  const toggleMinimize = useCallback((applicationId: number) => {
    setWindows((list) => list.map((w) => (w.applicationId === applicationId ? { ...w, minimized: !w.minimized } : w)));
  }, []);

  return (
    <ChatContext.Provider value={{ windows, openChat, closeChat, toggleMinimize }}>{children}</ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used inside ChatProvider');
  return context;
}
