'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export function PaymentToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [toast, setToast] = useState<{ type: 'success' | 'cancelled'; visible: boolean } | null>(null);

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success' || payment === 'cancelled') {
      setToast({ type: payment, visible: true });

      // Clean URL params
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      router.replace(url.pathname, { scroll: false });

      // Auto-hide after 8 seconds
      const timer = setTimeout(() => {
        setToast((prev) => prev ? { ...prev, visible: false } : null);
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  if (!toast?.visible) return null;

  if (toast.type === 'success') {
    return (
      <div
        className="fixed top-4 right-4 z-50 max-w-md rounded-xl border p-5 shadow-2xl animate-in slide-in-from-right-5 duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
          borderColor: 'rgba(16,185,129,0.3)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-3xl">🎉</span>
          <div>
            <p className="font-bold text-base" style={{ color: '#10b981' }}>
              ¡Pago completado!
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Tu suscripción se está activando. En unos momentos tendrás acceso completo a tu plan.
              Recibirás un email de confirmación.
            </p>
            <a
              href="/dashboard/billing"
              className="text-xs font-medium mt-2 inline-block transition-colors hover:underline"
              style={{ color: '#10b981' }}
            >
              Ver facturación →
            </a>
          </div>
          <button
            onClick={() => setToast((prev) => prev ? { ...prev, visible: false } : null)}
            className="text-sm opacity-50 hover:opacity-100 transition-opacity ml-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 max-w-md rounded-xl border p-5 shadow-2xl animate-in slide-in-from-right-5 duration-300"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
        borderColor: 'rgba(245,158,11,0.3)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">⚠️</span>
        <div>
          <p className="font-bold text-base" style={{ color: '#f59e0b' }}>
            Pago cancelado
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            No se realizó ningún cargo. Puedes activar tu plan cuando estés listo.
          </p>
          <a
            href="/dashboard/plans"
            className="text-xs font-medium mt-2 inline-block transition-colors hover:underline"
            style={{ color: '#f59e0b' }}
          >
            Ver planes →
          </a>
        </div>
        <button
          onClick={() => setToast((prev) => prev ? { ...prev, visible: false } : null)}
          className="text-sm opacity-50 hover:opacity-100 transition-opacity ml-2"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
