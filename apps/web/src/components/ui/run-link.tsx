'use client';

import Link from 'next/link';

interface RunLinkProps {
  href: string;
  status: string;
  angle?: string;
  campaignName?: string;
  runId: string;
  updatedAt: string;
  format?: string;
  tone?: string;
  index: number;
}

const STATUS_ICON: Record<string, string> = {
  PENDING: '⏳',
  RESEARCH: '🔍',
  STRATEGY: '🧠',
  CONTENT: '✍️',
  MEDIA: '🎨',
  COMPLIANCE: '✅',
  REVIEW: '👀',
  APPROVED: '✅',
  PUBLISHING: '📤',
  PUBLISHED: '🟢',
  REJECTED: '❌',
  FAILED: '💥',
  POSTPONED: '⏸️',
};

export function RunLink({ href, status, angle, campaignName, runId, updatedAt, format, tone, index }: RunLinkProps) {
  return (
    <Link
      key={runId}
      href={href}
      className="flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 group"
      style={{
        borderColor: 'var(--color-border-subtle)',
        background: 'rgba(15,15,30,0.4)',
        animationDelay: `${index * 50}ms`,
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
        e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)';
        e.currentTarget.style.background = 'rgba(124,58,237,0.04)';
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
        e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
        e.currentTarget.style.background = 'rgba(15,15,30,0.4)';
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{STATUS_ICON[status] ?? '⚙️'}</span>
        <div>
          <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
            {angle?.substring(0, 50) ?? campaignName ?? `Run ${runId.substring(0, 8)}`}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {new Date(updatedAt).toLocaleDateString('es-MX', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
            {format && tone && ` · ${format} · ${tone}`}
          </div>
        </div>
      </div>
      <span className="badge" style={{
        backgroundColor: status === 'PUBLISHED' ? 'rgba(16,185,129,0.12)' : status === 'REVIEW' ? 'rgba(251,191,36,0.12)' : 'rgba(124,58,237,0.1)',
        color: status === 'PUBLISHED' ? '#10b981' : status === 'REVIEW' ? '#fbbf24' : '#a78bfa',
      }}>
        {status}
      </span>
    </Link>
  );
}
