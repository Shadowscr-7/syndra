import Link from 'next/link';
import Image from 'next/image';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl py-4 px-6"
        style={{ background: 'rgba(10,10,12,0.85)', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logosyndra.png" alt="Syndra" width={90} height={26} />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/legal/terms" className="text-xs font-medium hover:underline" style={{ color: 'var(--color-text-secondary)' }}>
              Términos
            </Link>
            <Link href="/legal/privacy" className="text-xs font-medium hover:underline" style={{ color: 'var(--color-text-secondary)' }}>
              Privacidad
            </Link>
            <Link href="/legal/refund" className="text-xs font-medium hover:underline" style={{ color: 'var(--color-text-secondary)' }}>
              Reembolsos
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          © 2026 Syndra by AI Vanguard. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
