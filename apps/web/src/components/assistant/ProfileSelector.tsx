'use client';

import type { AssistantProfile } from './useAssistant';

interface ProfileOption {
  id: AssistantProfile;
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
}

const PROFILES: ProfileOption[] = [
  {
    id: 'CREATIVE',
    emoji: '🎨',
    title: 'Creativo',
    subtitle: 'Marca personal, creador de contenido, influencer',
    color: 'from-purple-500/20 to-pink-500/20 border-purple-500/40',
  },
  {
    id: 'BUSINESS',
    emoji: '💼',
    title: 'Negocio',
    subtitle: 'Empresa, emprendimiento, servicios, ecommerce',
    color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40',
  },
  {
    id: 'GENERATOR',
    emoji: '⚡',
    title: 'Generador',
    subtitle: 'Quiero automatizar rápido y publicar en piloto automático',
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40',
  },
];

interface ProfileSelectorProps {
  onSelect: (profile: AssistantProfile) => void;
}

export function ProfileSelector({ onSelect }: ProfileSelectorProps) {
  return (
    <div className="px-4 py-3">
      <p className="text-sm text-zinc-400 mb-3 text-center">
        Hola 👋 Soy <strong className="text-white">Aria</strong>, tu asistente en Syndra.
        <br />
        ¿Cuál es tu perfil?
      </p>
      <div className="flex flex-col gap-2">
        {PROFILES.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`w-full text-left p-3 rounded-xl border bg-gradient-to-r ${p.color} hover:opacity-90 transition-opacity`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{p.emoji}</span>
              <div>
                <div className="text-sm font-semibold text-white">{p.title}</div>
                <div className="text-xs text-zinc-400">{p.subtitle}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
