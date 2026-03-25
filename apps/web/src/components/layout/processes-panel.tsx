'use client';

import { useBackgroundTasks } from '@/lib/background-tasks-context';

const TYPE_ICONS: Record<string, string> = {
  music: '🎵',
  'image-pro': '🖼️',
  video: '🎬',
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  running: { color: '#60a5fa', label: 'En proceso' },
  completed: { color: '#34d399', label: 'Completado' },
  failed: { color: '#f87171', label: 'Error' },
};

export function ProcessesPanel() {
  const { tasks, showPanel, setShowPanel, dismissTask } = useBackgroundTasks();

  if (!showPanel) return null;

  return (
    <div className="fixed inset-0 z-[9998]" onClick={() => setShowPanel(false)}>
      <div
        className="absolute right-4 top-16 w-96 max-h-[70vh] overflow-y-auto rounded-xl shadow-2xl"
        style={{
          background: 'var(--color-bg-card, #1e1e2e)',
          border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text, #fff)' }}>
            ⚙️ Procesos
          </h3>
          <button
            onClick={() => setShowPanel(false)}
            className="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: 'var(--color-text-muted, #888)' }}
          >
            ✕
          </button>
        </div>

        {/* Tasks */}
        <div className="p-2">
          {tasks.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted, #888)' }}>
              No hay procesos activos
            </p>
          ) : (
            tasks.map((task) => {
              const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.running;
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 group"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  {/* Spinner or icon */}
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    {task.status === 'running' ? (
                      <div
                        className="w-4 h-4 border-2 rounded-full animate-spin"
                        style={{ borderColor: `${cfg.color} transparent transparent transparent` }}
                      />
                    ) : (
                      <span className="text-sm">{task.status === 'completed' ? '✅' : '❌'}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{TYPE_ICONS[task.type] ?? '⚙️'}</span>
                      <span className="text-xs font-medium truncate" style={{ color: 'var(--color-text, #fff)' }}>
                        {task.label}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: cfg.color }}>
                      {cfg.label}
                      {task.error ? `: ${task.error.slice(0, 60)}` : ''}
                    </span>
                  </div>

                  {/* Dismiss */}
                  {task.status !== 'running' && (
                    <button
                      onClick={() => dismissTask(task.id)}
                      className="flex-shrink-0 text-xs opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded hover:bg-white/10 transition-all"
                      style={{ color: 'var(--color-text-muted, #888)' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
