'use client';

interface CredentialProps {
  credential?: {
    isActive: boolean;
    lastUsedAt: string | null;
  } | null;
}

export function CredentialStatus({ credential }: CredentialProps) {
  if (!credential) {
    return (
      <span
        className="badge text-xs"
        style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
      >
        <span className="badge-dot" style={{ backgroundColor: '#ef4444' }} />
        No conectado
      </span>
    );
  }

  if (!credential.isActive) {
    return (
      <span
        className="badge text-xs"
        style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        <span className="badge-dot" style={{ backgroundColor: '#f59e0b' }} />
        Inactivo
      </span>
    );
  }

  return (
    <span
      className="badge text-xs"
      style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
    >
      <span className="badge-dot" style={{ backgroundColor: '#10b981' }} />
      Conectado
    </span>
  );
}
