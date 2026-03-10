'use client';

import { useEffect, useState, useCallback } from 'react';

interface CreditBalance {
  balance: number;
  unlimited: boolean;
}

interface CreditCosts {
  [key: string]: number;
}

interface CreditPackage {
  key: string;
  credits: number;
  price: number;
  label: string;
  popular?: boolean;
}

interface CreditHistory {
  id: string;
  operation: string;
  amount: number;
  source: string;
  description: string;
  createdAt: string;
}

const OPERATION_LABELS: Record<string, string> = {
  IMAGE_STANDARD: '🖼️ Imagen estándar',
  IMAGE_TEXT: '📝 Imagen c/ texto',
  IMAGE_HD: '✨ Imagen HD',
  ANIMATION_5S: '🎬 Animación 5s',
  ANIMATION_10S: '🎬 Animación 10s',
  VIDEO_AVATAR_30S: '🗣️ Avatar 30s',
  VIDEO_AVATAR_60S: '🗣️ Avatar 60s',
  VIDEO_COMPOSITE: '🎥 Video compuesto',
  VIDEO_AI_SHORT: '🤖 AI Short',
};

const SOURCE_LABELS: Record<string, string> = {
  PLAN: '📋 Plan',
  PURCHASE: '💳 Compra',
  ADDON: '🔧 Add-on',
  PROMO: '🎁 Promo',
  REFUND: '↩️ Reembolso',
};

export default function CreditsPage() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [costs, setCosts] = useState<CreditCosts>({});
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [history, setHistory] = useState<CreditHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [balRes, costRes, histRes] = await Promise.all([
        fetch('/api/credits/balance', { credentials: 'include' }),
        fetch('/api/credits/costs', { credentials: 'include' }),
        fetch('/api/credits/history', { credentials: 'include' }),
      ]);

      if (balRes.ok) setBalance(await balRes.json());
      if (costRes.ok) {
        const data = await costRes.json();
        setCosts(data.costs ?? {});
        setPackages(data.packages ?? []);
      }
      if (histRes.ok) {
        const data = await histRes.json();
        setHistory(data.history ?? []);
      }
    } catch (err) {
      console.error('Error loading credits:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handlePurchase = async (packageKey: string) => {
    setPurchasing(packageKey);
    try {
      const res = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ packageKey }),
      });

      if (!res.ok) throw new Error('Error al crear orden');

      const data = await res.json();

      if (data.approveUrl) {
        // Redirect to PayPal approval
        window.location.href = data.approveUrl;
      } else if (data.directCredit) {
        // Dev mode: credits added directly
        await fetchAll();
        alert(`✅ ${data.creditsAdded} créditos agregados (modo desarrollo)`);
      }
    } catch (err) {
      console.error('Purchase error:', err);
      alert('Error al procesar la compra');
    } finally {
      setPurchasing(null);
    }
  };

  // Handle PayPal return (capture order)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('token'); // PayPal redirects with ?token=ORDER_ID
    if (orderId) {
      (async () => {
        try {
          const res = await fetch('/api/credits/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ orderId }),
          });
          if (res.ok) {
            const data = await res.json();
            alert(`✅ ¡${data.creditsAdded} créditos agregados exitosamente!`);
            // Clean URL
            window.history.replaceState({}, '', '/dashboard/credits');
            fetchAll();
          }
        } catch {
          alert('Error al capturar el pago');
        }
      })();
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#e0d4ff' }}>
          💎 Créditos IA
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(160,160,192,0.7)' }}>
          Compra créditos para generar imágenes HD, videos con IA y avatares realistas.
        </p>
      </div>

      {/* Balance Card */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.08))',
          border: '1px solid rgba(124,58,237,0.2)',
        }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }}
        />
        <div className="relative">
          <p className="text-sm font-medium" style={{ color: 'rgba(167,139,250,0.8)' }}>
            Balance actual
          </p>
          <div className="flex items-end gap-3 mt-2">
            <span className="text-4xl font-bold" style={{ color: '#e0d4ff' }}>
              {balance?.unlimited ? '∞' : (balance?.balance ?? 0).toLocaleString()}
            </span>
            <span className="text-sm pb-1.5" style={{ color: 'rgba(160,160,192,0.6)' }}>
              {balance?.unlimited ? 'Plan Pro — Ilimitados' : 'créditos disponibles'}
            </span>
          </div>
        </div>
      </div>

      {/* Packages */}
      {!balance?.unlimited && (
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#e0d4ff' }}>
            Paquetes de créditos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.key}
                className="rounded-2xl p-5 relative transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: pkg.popular
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.1))'
                    : 'rgba(20,20,40,0.6)',
                  border: pkg.popular
                    ? '2px solid rgba(124,58,237,0.4)'
                    : '1px solid rgba(124,58,237,0.1)',
                }}
              >
                {pkg.popular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: '#fff' }}
                  >
                    Popular
                  </div>
                )}
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: '#e0d4ff' }}>
                    {pkg.credits.toLocaleString()}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(160,160,192,0.6)' }}>créditos</p>
                  <p className="text-xl font-bold mt-3" style={{ color: '#a78bfa' }}>
                    ${pkg.price}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(160,160,192,0.5)' }}>
                    ${(pkg.price / pkg.credits).toFixed(3)} / crédito
                  </p>
                  <button
                    onClick={() => handlePurchase(pkg.key)}
                    disabled={purchasing !== null}
                    className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-50"
                    style={{
                      background: pkg.popular
                        ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                        : 'rgba(124,58,237,0.15)',
                      color: '#fff',
                      border: '1px solid rgba(124,58,237,0.3)',
                    }}
                  >
                    {purchasing === pkg.key ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Procesando...
                      </span>
                    ) : (
                      `Comprar con PayPal`
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#e0d4ff' }}>
          Tabla de costos
        </h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(20,20,40,0.6)',
            border: '1px solid rgba(124,58,237,0.1)',
          }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(124,58,237,0.1)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(160,160,192,0.6)' }}>
                  Operación
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(160,160,192,0.6)' }}>
                  Créditos
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(costs).map(([op, cost]) => (
                <tr
                  key={op}
                  style={{ borderBottom: '1px solid rgba(124,58,237,0.05)' }}
                >
                  <td className="px-5 py-3 text-sm" style={{ color: 'rgba(224,212,255,0.8)' }}>
                    {OPERATION_LABELS[op] ?? op}
                  </td>
                  <td className="px-5 py-3 text-sm text-right font-mono font-semibold" style={{ color: '#a78bfa' }}>
                    {cost}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#e0d4ff' }}>
          Historial reciente
        </h2>
        {history.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: 'rgba(20,20,40,0.6)', border: '1px solid rgba(124,58,237,0.1)' }}
          >
            <p className="text-sm" style={{ color: 'rgba(160,160,192,0.5)' }}>
              No hay movimientos aún
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(20,20,40,0.6)', border: '1px solid rgba(124,58,237,0.1)' }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(124,58,237,0.1)' }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(160,160,192,0.6)' }}>
                    Fecha
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(160,160,192,0.6)' }}>
                    Operación
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(160,160,192,0.6)' }}>
                    Fuente
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(160,160,192,0.6)' }}>
                    Créditos
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid rgba(124,58,237,0.05)' }}>
                    <td className="px-5 py-3 text-xs" style={{ color: 'rgba(160,160,192,0.5)' }}>
                      {new Date(h.createdAt).toLocaleDateString('es', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'rgba(224,212,255,0.8)' }}>
                      {OPERATION_LABELS[h.operation] ?? h.operation}
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'rgba(160,160,192,0.6)' }}>
                      {SOURCE_LABELS[h.source] ?? h.source}
                    </td>
                    <td className="px-5 py-3 text-sm text-right font-mono font-semibold" style={{
                      color: h.amount > 0 ? '#34d399' : '#f87171',
                    }}>
                      {h.amount > 0 ? '+' : ''}{h.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
