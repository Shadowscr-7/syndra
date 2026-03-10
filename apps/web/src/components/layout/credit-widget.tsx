'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CreditBalance {
  balance: number;
  unlimited: boolean;
}

/**
 * Small credit balance widget for sidebar or header.
 * Shows current balance with a link to the credits page.
 */
export function CreditWidget() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/credits/balance', { credentials: 'include' });
        if (res.ok) setBalance(await res.json());
      } catch { /* ignore */ }
    };
    load();
    // Refresh every 60s
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!balance) return null;

  const isLow = !balance.unlimited && balance.balance < 20;

  return (
    <Link
      href="/dashboard/credits"
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 group"
      style={{
        background: isLow
          ? 'rgba(239,68,68,0.08)'
          : 'rgba(124,58,237,0.06)',
        border: isLow
          ? '1px solid rgba(239,68,68,0.2)'
          : '1px solid rgba(124,58,237,0.1)',
      }}
    >
      <span className="text-sm">💎</span>
      <span
        className="text-xs font-semibold"
        style={{
          color: balance.unlimited
            ? '#a78bfa'
            : isLow
              ? '#f87171'
              : '#e0d4ff',
        }}
      >
        {balance.unlimited ? '∞' : balance.balance.toLocaleString()}
      </span>
      <span
        className="text-[10px] hidden sm:inline"
        style={{ color: 'rgba(160,160,192,0.5)' }}
      >
        créditos
      </span>
    </Link>
  );
}
