'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useAssistant, type AssistantProfile } from './useAssistant';
import { ChatMessage, TypingIndicator } from './ChatMessage';
import { ProfileSelector } from './ProfileSelector';

const PROFILE_LABELS: Record<AssistantProfile, string> = {
  CREATIVE: '🎨 Creativo',
  BUSINESS: '💼 Negocio',
  GENERATOR: '⚡ Generador',
};

const QUICK_PROMPTS: Record<AssistantProfile, string[]> = {
  CREATIVE: [
    '¿Qué debo configurar primero?',
    'Ayúdame a definir mi voz',
    '¿Cómo conecto Instagram?',
  ],
  BUSINESS: [
    '¿Cómo cargo mis productos?',
    '¿Qué debo configurar primero?',
    '¿Cómo publico una oferta?',
  ],
  GENERATOR: [
    '¿Cómo activo el piloto automático?',
    '¿Qué debo configurar primero?',
    'Explícame el flujo editorial',
  ],
};

interface AssistantPanelProps {
  onClose: () => void;
}

export function AssistantPanel({ onClose }: AssistantPanelProps) {
  const pathname = usePathname();
  const { messages, profile, loading, error, selectProfile, sendMessage, clearConversation } =
    useAssistant(pathname ?? undefined);

  const [input, setInput] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (profile) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [profile]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleProfileSelect = (p: AssistantProfile) => {
    selectProfile(p);
    setShowProfileMenu(false);
    // Send welcome message after profile selection
    setTimeout(() => {
      sendMessage('Hola, acabo de seleccionar mi perfil', p);
    }, 100);
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Aria</div>
            <div className="text-xs text-zinc-500">Asistente Syndra</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Profile switcher */}
          {profile && (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((v) => !v)}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                {PROFILE_LABELS[profile]}
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-10 py-1">
                  {(Object.entries(PROFILE_LABELS) as [AssistantProfile, string][]).map(
                    ([id, label]) => (
                      <button
                        key={id}
                        onClick={() => {
                          selectProfile(id);
                          setShowProfileMenu(false);
                        }}
                        className={clsx(
                          'w-full text-left px-3 py-2 text-xs hover:bg-zinc-700 transition-colors',
                          profile === id ? 'text-violet-400' : 'text-zinc-300',
                        )}
                      >
                        {label}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
          {/* Clear button */}
          {messages.length > 0 && (
            <button
              onClick={clearConversation}
              title="Nueva conversación"
              className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
          {/* Close button */}
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {!profile ? (
          // Profile selector (first-time)
          <ProfileSelector onSelect={handleProfileSelect} />
        ) : messages.length === 0 && !loading ? (
          // Empty state with quick prompts
          <div className="px-4 py-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-3">
              <span className="text-xl font-bold text-white">A</span>
            </div>
            <p className="text-sm text-zinc-300 mb-1">
              Hola, soy <strong>Aria</strong>
            </p>
            <p className="text-xs text-zinc-500 mb-5">
              Pregúntame cualquier cosa sobre Syndra
            </p>
            <div className="flex flex-col gap-2 w-full">
              {QUICK_PROMPTS[profile].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="w-full text-left text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl px-3 py-2.5 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Messages list
          <div className="flex flex-col gap-3 px-3 py-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {loading && <TypingIndicator />}
            {error && (
              <div className="text-xs text-red-400 text-center bg-red-900/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      {profile && (
        <div className="px-3 py-3 border-t border-zinc-800 shrink-0">
          <div className="flex gap-2 items-end bg-zinc-800 rounded-2xl px-3 py-2 border border-zinc-700 focus-within:border-violet-500/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta..."
              rows={1}
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 resize-none focus:outline-none max-h-32 leading-relaxed disabled:opacity-50"
              style={{ scrollbarWidth: 'none' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="shrink-0 w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-zinc-600 text-center mt-2">
            Enter para enviar · Shift+Enter para salto de línea
          </p>
        </div>
      )}
    </div>
  );
}
