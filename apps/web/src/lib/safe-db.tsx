import { prisma } from '@automatismos/db';

/**
 * Safe DB query wrapper — returns fallback value if DB is unreachable.
 * Useful for development without a running database.
 */
export async function safeDb<T>(fn: (db: typeof prisma) => Promise<T>, fallback: T): Promise<{ data: T; dbOk: boolean }> {
  try {
    const data = await fn(prisma);
    return { data, dbOk: true };
  } catch {
    return { data: fallback, dbOk: false };
  }
}

export function DbWarningBanner({ dbOk }: { dbOk: boolean }) {
  if (dbOk) return null;
  return (
    <div
      className="mb-6 rounded-lg border px-4 py-3 text-sm"
      style={{ borderColor: '#f59e0b40', backgroundColor: '#f59e0b10', color: '#f59e0b' }}
    >
      ⚠️ Base de datos no disponible — mostrando datos vacíos. Inicia Docker y PostgreSQL para ver datos reales.
    </div>
  );
}
