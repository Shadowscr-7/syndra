'use client';

import { useState, useCallback, useRef } from 'react';

export type AssistantProfile = 'CREATIVE' | 'BUSINESS' | 'GENERATOR';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

const PROFILE_STORAGE_KEY = 'syndra_assistant_profile';
const SESSION_STORAGE_KEY = 'syndra_assistant_session';

function loadProfile(): AssistantProfile | null {
  if (typeof window === 'undefined') return null;
  return (localStorage.getItem(PROFILE_STORAGE_KEY) as AssistantProfile) ?? null;
}

function saveProfile(p: AssistantProfile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, p);
}

function loadSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(SESSION_STORAGE_KEY);
}

function saveSessionId(id: string) {
  sessionStorage.setItem(SESSION_STORAGE_KEY, id);
}

export function useAssistant(currentPage?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profile, setProfileState] = useState<AssistantProfile | null>(() =>
    loadProfile(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(loadSessionId());

  const selectProfile = useCallback((p: AssistantProfile) => {
    setProfileState(p);
    saveProfile(p);
  }, []);

  const sendMessage = useCallback(
    async (text: string, profileOverride?: AssistantProfile) => {
      if (!text.trim() || loading) return;

      const activeProfile = profileOverride ?? profile ?? 'GENERATOR';

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            profile: activeProfile,
            sessionId: sessionIdRef.current ?? undefined,
            currentPage,
          }),
        });

        if (!res.ok) throw new Error(`Error ${res.status}`);

        const data = (await res.json()) as {
          message: string;
          sessionId: string;
        };

        if (data.sessionId) {
          sessionIdRef.current = data.sessionId;
          saveSessionId(data.sessionId);
        }

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.message,
          ts: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        setError('No se pudo conectar con Aria. Intenta de nuevo.');
        // Remove the user message on error so they can retry
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      } finally {
        setLoading(false);
      }
    },
    [loading, profile, currentPage],
  );

  const clearConversation = useCallback(async () => {
    const sid = sessionIdRef.current;
    setMessages([]);
    setError(null);
    if (sid) {
      await fetch('/api/assistant', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
      }).catch(() => null);
      sessionIdRef.current = null;
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  return {
    messages,
    profile,
    loading,
    error,
    selectProfile,
    sendMessage,
    clearConversation,
  };
}
