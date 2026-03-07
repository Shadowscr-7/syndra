import { prisma } from '@automatismos/db';
import { getSession } from '@/lib/session';
import { saveApiCredential } from '@/lib/actions';

const providerLabels: Record<string, string> = {
  META: '📱 Meta (Instagram/Facebook)',
  TELEGRAM: '💬 Telegram Bot',
  LLM: '🤖 LLM Provider (OpenAI/Anthropic)',
  IMAGE_GEN: '🖼️ Image Generation (DALL-E/Stability)',
  CLOUDINARY: '☁️ Cloudinary',
  HEYGEN: '🎬 HeyGen (Video/Avatar)',
};

const providerPlaceholders: Record<string, { key: string; scopes: string }> = {
  META: { key: 'EAAxxxxxxx...', scopes: 'pages_manage_posts, instagram_basic' },
  TELEGRAM: { key: '7123456789:AAH...', scopes: '' },
  LLM: { key: 'sk-...', scopes: 'gpt-4o, claude-sonnet' },
  IMAGE_GEN: { key: 'sk-...', scopes: 'dall-e-3' },
  CLOUDINARY: { key: 'cloudinary://api_key:api_secret@cloud_name', scopes: '' },
  HEYGEN: { key: 'hg-...', scopes: '' },
};

const providerGradients: Record<string, string> = {
  META: 'from-blue-600/20 to-purple-600/20',
  TELEGRAM: 'from-sky-500/20 to-blue-600/20',
  LLM: 'from-emerald-500/20 to-cyan-500/20',
  IMAGE_GEN: 'from-pink-500/20 to-rose-500/20',
  CLOUDINARY: 'from-amber-500/20 to-orange-500/20',
  HEYGEN: 'from-violet-500/20 to-fuchsia-500/20',
};

export default async function CredentialsPage() {
  const session = await getSession();
  const wsId = session?.workspaceId ?? 'ws_default';
  let credentials: any[] = [];
  try {
    credentials = await prisma.apiCredential.findMany({
      where: { workspaceId: wsId },
      orderBy: { provider: 'asc' },
    });
  } catch (e) {
    console.error('[CredentialsPage] DB error:', e);
  }

  const allProviders = ['META', 'TELEGRAM', 'LLM', 'IMAGE_GEN', 'CLOUDINARY', 'HEYGEN'];
  const configuredProviders = credentials.map((c) => c.provider);

  return (
    <div className="space-y-8">
      <div className="page-header animate-fade-in">
        <h1 className="page-title">Credenciales API</h1>
        <p className="page-subtitle">Gestiona los tokens y API keys de los servicios conectados.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {allProviders.map((provider, i) => {
          const isConfigured = configuredProviders.includes(provider as any);
          const cred = credentials.find((c) => c.provider === provider);
          const ph = providerPlaceholders[provider] ?? { key: '', scopes: '' };
          const grad = providerGradients[provider] ?? 'from-gray-500/20 to-gray-600/20';
          const delayClass = i < 2 ? 'animate-fade-in-delay-1' : i < 4 ? 'animate-fade-in-delay-2' : 'animate-fade-in-delay-3';

          return (
            <div key={provider} className={`glass-card p-6 ${delayClass}`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${grad} rounded-2xl opacity-50 pointer-events-none`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                    {providerLabels[provider] ?? provider}
                  </h3>
                  {isConfigured ? (
                    <span className="badge" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                      <span className="badge-dot" style={{ backgroundColor: '#22c55e' }} />
                      Configurado
                    </span>
                  ) : (
                    <span className="badge" style={{ backgroundColor: 'rgba(100,116,139,0.15)', color: 'var(--color-text-muted)' }}>
                      Sin configurar
                    </span>
                  )}
                </div>

                {cred && (
                  <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                    Scopes: {cred.scopes.join(', ') || 'N/A'}
                    {cred.expiresAt && ` · Expira: ${new Date(cred.expiresAt).toLocaleDateString()}`}
                  </p>
                )}

                <details>
                  <summary className="cursor-pointer text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                    {isConfigured ? '🔄 Actualizar' : '⚙️ Configurar'}
                  </summary>
                  <form action={saveApiCredential} className="mt-4 space-y-3">
                    <input type="hidden" name="provider" value={provider} />
                    <div>
                      <label className="input-label">API Key / Token</label>
                      <input
                        name="apiKey"
                        type="password"
                        required
                        placeholder={ph.key}
                        className="input-field font-mono"
                      />
                    </div>
                    {ph.scopes && (
                      <div>
                        <label className="input-label">Scopes (separados por coma)</label>
                        <input
                          name="scopes"
                          type="text"
                          defaultValue={cred?.scopes?.join(', ') ?? ''}
                          placeholder={ph.scopes}
                          className="input-field"
                        />
                      </div>
                    )}
                    <button type="submit" className="btn-primary text-sm">
                      💾 Guardar
                    </button>
                  </form>
                </details>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
