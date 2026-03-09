'use client';

import { useToast, type Toast } from '@/lib/toast-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const TYPE_CONFIG: Record<string, { icon: string; bg: string; border: string; accent: string }> = {
  success: {
    icon: '✓',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)',
    accent: '#34d399',
  },
  error: {
    icon: '✕',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.25)',
    accent: '#f87171',
  },
  warning: {
    icon: '⚠',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
    accent: '#fbbf24',
  },
  info: {
    icon: 'ℹ',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.25)',
    accent: '#60a5fa',
  },
  'plan-limit': {
    icon: '🔒',
    bg: 'rgba(124,58,237,0.12)',
    border: 'rgba(124,58,237,0.25)',
    accent: '#a78bfa',
  },
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);
  const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info!;

  useEffect(() => {
    const dur = toast.duration ?? (toast.type === 'plan-limit' ? 8000 : 5000);
    if (dur <= 0) return;
    const exitTimer = setTimeout(() => setIsExiting(true), dur - 300);
    return () => clearTimeout(exitTimer);
  }, [toast]);

  return (
    <div
      className="rounded-xl p-3.5 pr-10 relative overflow-hidden backdrop-blur-lg"
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.3)`,
        animation: isExiting
          ? 'toast-exit 0.3s ease-in forwards'
          : 'toast-enter 0.3s ease-out forwards',
      }}
    >
      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-0.5 rounded-full"
        style={{
          background: config.accent,
          animation: `toast-progress ${toast.duration ?? (toast.type === 'plan-limit' ? 8000 : 5000)}ms linear forwards`,
        }}
      />

      <div className="flex items-start gap-2.5">
        <span className="text-base flex-shrink-0 mt-0.5">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: config.accent }}>
            {toast.message}
          </p>
          {toast.detail && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {toast.detail}
            </p>
          )}
          {toast.type === 'plan-limit' && toast.requiredPlan && (
            <button
              className="text-xs font-semibold mt-1.5 px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
              style={{
                background: 'rgba(124,58,237,0.2)',
                color: '#c4b5fd',
                border: '1px solid rgba(124,58,237,0.3)',
              }}
              onClick={() => {
                onDismiss(toast.id);
                router.push('/dashboard/plans');
              }}
            >
              Upgrade a {toast.requiredPlan} →
            </button>
          )}
        </div>
      </div>

      {/* Close button */}
      <button
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-xs opacity-40 hover:opacity-80 transition-opacity"
        style={{ color: config.accent }}
        onClick={() => onDismiss(toast.id)}
      >
        ✕
      </button>

      <style jsx>{`
        @keyframes toast-enter {
          from {
            opacity: 0;
            transform: translateX(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes toast-exit {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(20px) scale(0.95);
          }
        }
        @keyframes toast-progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
