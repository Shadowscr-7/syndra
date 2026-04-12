'use client';

import { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { AssistantPanel } from './AssistantPanel';

export function AssistantBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Show notification dot on first visit
  useEffect(() => {
    const seen = localStorage.getItem('syndra_assistant_seen');
    if (!seen) setHasNotification(true);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setHasNotification(false);
    localStorage.setItem('syndra_assistant_seen', '1');
  };

  const handleClose = () => setIsOpen(false);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        const bubble = document.getElementById('aria-bubble-btn');
        if (!bubble?.contains(e.target as Node)) handleClose();
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [isOpen]);

  return (
    <>
      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className={clsx(
          'fixed bottom-24 right-5 z-50 w-[340px] h-[560px] max-h-[calc(100vh-120px)]',
          'rounded-2xl shadow-2xl border border-zinc-700/60 overflow-hidden',
          'transition-all duration-300 ease-in-out origin-bottom-right',
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-90 pointer-events-none',
        )}
        style={{ backdropFilter: 'blur(24px)' }}
      >
        <AssistantPanel onClose={handleClose} />
      </div>

      {/* Floating button */}
      <button
        id="aria-bubble-btn"
        onClick={isOpen ? handleClose : handleOpen}
        aria-label={isOpen ? 'Cerrar asistente Aria' : 'Abrir asistente Aria'}
        className={clsx(
          'fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-2xl',
          'bg-gradient-to-br from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600',
          'flex items-center justify-center transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-black',
          isOpen ? 'rotate-0' : 'hover:scale-110',
        )}
      >
        {/* Notification dot */}
        {hasNotification && !isOpen && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-900 animate-pulse" />
        )}

        {/* Icon: sparkle when closed, X when open */}
        <span
          className={clsx(
            'transition-all duration-200',
            isOpen ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90 absolute',
          )}
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </span>
        <span
          className={clsx(
            'transition-all duration-200',
            !isOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90 absolute',
          )}
        >
          {/* Sparkle / AI icon */}
          <svg
            className="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
          </svg>
        </span>
      </button>
    </>
  );
}
