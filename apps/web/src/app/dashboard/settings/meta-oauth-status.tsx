'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Shows a toast notification when redirected back from Meta OAuth.
 * Reads ?meta_success= or ?meta_error= from URL params.
 */
export function MetaOAuthStatus() {
  const params = useSearchParams();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const success = params.get('meta_success');
    const error = params.get('meta_error');
    if (success) {
      setToast({ type: 'success', message: success });
    } else if (error) {
      setToast({ type: 'error', message: error });
    }
  }, [params]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Clean URL params after reading
  useEffect(() => {
    if (params.get('meta_success') || params.get('meta_error')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('meta_success');
      url.searchParams.delete('meta_error');
      window.history.replaceState({}, '', url.toString());
    }
  }, [params]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div
      className="fixed top-4 right-4 z-50 max-w-md animate-fade-in"
      style={{
        padding: '16px 20px',
        borderRadius: '12px',
        backgroundColor: isSuccess ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
        color: isSuccess ? '#10b981' : '#ef4444',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{isSuccess ? '✅' : '❌'}</span>
        <div>
          <p className="text-sm font-medium">{isSuccess ? 'Meta conectado' : 'Error al conectar'}</p>
          <p className="text-xs mt-0.5 opacity-80">{toast.message}</p>
        </div>
        <button
          onClick={() => setToast(null)}
          className="ml-auto text-xs opacity-60 hover:opacity-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
