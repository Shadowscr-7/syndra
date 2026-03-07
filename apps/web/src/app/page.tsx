import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>
          Syndra
        </h1>
        <p className="text-xl mb-8" style={{ color: 'var(--color-text-secondary)' }}>
          Automatización inteligente de contenido para Instagram y Facebook.
          IA generativa + aprobación humana.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-lg px-6 py-3 font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Iniciar sesión
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg px-6 py-3 font-semibold transition-colors border"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
