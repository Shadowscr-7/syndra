'use client';

import { createContext, useContext, useCallback, useState, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'plan-limit';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  /** Optional detail text shown below message */
  detail?: string;
  /** Plan name to show upgrade CTA (only for plan-limit type) */
  requiredPlan?: string;
  /** Auto-dismiss duration in ms. Default 5000. 0 = manual dismiss only */
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => string;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  showToast: () => '',
  dismissToast: () => {},
  clearAll: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

// ── Provider ──────────────────────────────────────────────

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (toast: Omit<Toast, 'id'>): string => {
      const id = `toast-${++toastCounter}-${Date.now()}`;
      const newToast: Toast = { ...toast, id };
      const duration = toast.duration ?? (toast.type === 'plan-limit' ? 8000 : 5000);

      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep max 5

      if (duration > 0) {
        const timer = setTimeout(() => dismissToast(id), duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismissToast],
  );

  const clearAll = useCallback(() => {
    setToasts([]);
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, clearAll }}>
      {children}
    </ToastContext.Provider>
  );
}
