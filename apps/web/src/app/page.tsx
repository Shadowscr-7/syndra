import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <Image
          src="/images/logosyndra.png"
          alt="Syndra"
          width={280}
          height={78}
          className="mx-auto mb-4"
          priority
        />
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
