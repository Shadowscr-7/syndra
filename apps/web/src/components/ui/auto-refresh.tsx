'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client component that auto-refreshes the page (server components re-render)
 * when certain statuses indicate the pipeline is actively processing.
 */
export function AutoRefresh({
  status,
  intervalMs = 5000,
}: {
  status: string;
  intervalMs?: number;
}) {
  const router = useRouter();

  const ACTIVE_STATUSES = [
    'PENDING',
    'RESEARCH',
    'STRATEGY',
    'CONTENT',
    'MEDIA',
    'COMPLIANCE',
    'PUBLISHING',
  ];

  const isActive = ACTIVE_STATUSES.includes(status);

  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isActive, intervalMs, router]);

  if (!isActive) return null;

  return (
    <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full animate-pulse"
      style={{ backgroundColor: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
      </span>
      Pipeline en progreso — actualizando cada {intervalMs / 1000}s
    </div>
  );
}
