import { getApiUrl } from '@/lib/api';

// ============================================================
// Video Templates Gallery — Galería de templates de video disponibles
// ============================================================

interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  mode: string;
  targetDuration: number;
  aspectRatio: string;
  scriptStructure: Array<{
    role: string;
    label: string;
    suggestedDuration: number;
    promptHint: string;
  }>;
  avatarConfig: {
    showAvatar: boolean;
    position?: string;
    size?: string;
  };
  subtitleStyle: {
    enabled: boolean;
    position: string;
    fontSize: string;
    style: string;
  };
}

async function getTemplates(): Promise<VideoTemplate[]> {
  try {
    const res = await fetch(`${getApiUrl()}/api/videos/templates`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

const modeIcons: Record<string, string> = {
  news: '📰',
  educational: '📚',
  cta: '🎯',
  hybrid_motion: '✨',
};

const modeColors: Record<string, string> = {
  news: 'from-red-500 to-orange-500',
  educational: 'from-blue-500 to-cyan-500',
  cta: 'from-green-500 to-emerald-500',
  hybrid_motion: 'from-purple-500 to-pink-500',
};

export default async function VideoTemplatesPage() {
  let templates: VideoTemplate[] = [];
  let error = '';

  try {
    templates = await getTemplates();
  } catch (e) {
    error = String(e);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📐 Templates de Video</h1>
        <p className="text-gray-500 mt-1">
          Cada template define estructura, duración, estilo visual y subtítulos
        </p>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          ⚠️ API no disponible: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-lg border overflow-hidden hover:shadow-lg transition-shadow">
            {/* Header gradient */}
            <div className={`bg-gradient-to-r ${modeColors[template.mode] ?? 'from-gray-500 to-gray-700'} p-6 text-white`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{modeIcons[template.mode] ?? '🎬'}</span>
                <div>
                  <h3 className="text-lg font-bold">{template.name}</h3>
                  <p className="text-sm opacity-90">{template.description}</p>
                </div>
              </div>
              <div className="flex gap-4 mt-4 text-sm">
                <span>⏱ {template.targetDuration}s</span>
                <span>📐 {template.aspectRatio}</span>
                <span>💬 {template.subtitleStyle.style}</span>
              </div>
            </div>

            {/* Script Structure */}
            <div className="p-4">
              <h4 className="text-sm font-semibold text-gray-500 mb-3">ESTRUCTURA DEL SCRIPT</h4>
              <div className="space-y-2">
                {template.scriptStructure.map((block, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 bg-gray-50 rounded">
                    <div className="flex-shrink-0">
                      <span className={`inline-block w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white ${
                        block.role === 'hook' ? 'bg-red-500' :
                        block.role === 'cta' || block.role === 'outro' ? 'bg-green-500' :
                        block.role === 'highlight' ? 'bg-yellow-500' :
                        block.role === 'intro' ? 'bg-indigo-500' :
                        'bg-blue-500'
                      }`}>
                        {i + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{block.label}</span>
                        <span className="text-xs text-gray-400">{block.suggestedDuration}s</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{block.promptHint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Avatar & Subtitle Config */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-4 text-xs text-gray-600">
                <span>
                  🤖 Avatar: {template.avatarConfig.showAvatar ? `${template.avatarConfig.size ?? 'full'} (${template.avatarConfig.position ?? 'center'})` : 'Desactivado'}
                </span>
                <span>
                  💬 Subtítulos: {template.subtitleStyle.enabled ? `${template.subtitleStyle.style} @ ${template.subtitleStyle.position}` : 'No'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && !error && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <div className="text-4xl mb-4">📐</div>
          <h3 className="text-lg font-semibold text-gray-700">No hay templates</h3>
          <p className="text-gray-500 mt-2">Los templates se cargan desde la API.</p>
        </div>
      )}
    </div>
  );
}
