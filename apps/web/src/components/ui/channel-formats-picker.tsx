'use client';

import { useState } from 'react';

/**
 * Available content formats per social platform.
 * Instagram: Feed Post, Carousel, Reel, Story
 * Facebook: Feed Post, Story
 * Discord: Announcement (webhook)
 */
const PLATFORM_FORMATS: Record<string, { value: string; label: string }[]> = {
  instagram: [
    { value: 'post', label: 'Publicación' },
    { value: 'carousel', label: 'Carousel' },
    { value: 'reel', label: 'Reel' },
    { value: 'story', label: 'Historia' },
  ],
  facebook: [
    { value: 'post', label: 'Publicación' },
    { value: 'story', label: 'Historia' },
  ],
  threads: [
    { value: 'post', label: 'Publicación' },
    { value: 'carousel', label: 'Carousel' },
    { value: 'image', label: 'Imagen' },
  ],
  discord: [
    { value: 'post', label: 'Anuncio' },
  ],
};

const CHANNEL_ICONS: Record<string, string> = {
  instagram: '📸',
  facebook: '📘',
  threads: '🧵',
  discord: '💜',
};

interface ChannelFormatsPickerProps {
  /** Pre-selected channels */
  defaultChannels?: string[];
  /** Pre-selected formats per channel, e.g. { instagram: ["post", "carousel"] } */
  defaultChannelFormats?: Record<string, string[]>;
}

/**
 * Interactive channel + format picker for campaigns.
 * Renders hidden inputs: name="channels" and name="channelFormats" (JSON string).
 */
export function ChannelFormatsPicker({
  defaultChannels = ['instagram'],
  defaultChannelFormats = {},
}: ChannelFormatsPickerProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>(defaultChannels);
  const [formatsByChannel, setFormatsByChannel] = useState<Record<string, string[]>>(() => {
    // Initialize: if defaults exist use them, otherwise select all formats for selected channels
    const initial: Record<string, string[]> = {};
    for (const ch of defaultChannels) {
      const available = PLATFORM_FORMATS[ch] ?? [];
      initial[ch] = defaultChannelFormats[ch] ?? available.map((f) => f.value);
    }
    return initial;
  });

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) => {
      if (prev.includes(channel)) {
        // Remove channel
        const updated = prev.filter((c) => c !== channel);
        setFormatsByChannel((fbc) => {
          const copy = { ...fbc };
          delete copy[channel];
          return copy;
        });
        return updated;
      } else {
        // Add channel with all formats selected
        const available = PLATFORM_FORMATS[channel] ?? [];
        setFormatsByChannel((fbc) => ({
          ...fbc,
          [channel]: available.map((f) => f.value),
        }));
        return [...prev, channel];
      }
    });
  };

  const toggleFormat = (channel: string, format: string) => {
    setFormatsByChannel((prev) => {
      const current = prev[channel] ?? [];
      const updated = current.includes(format)
        ? current.filter((f) => f !== format)
        : [...current, format];
      return { ...prev, [channel]: updated };
    });
  };

  // Build the JSON value for the hidden input
  const channelFormatsJson = JSON.stringify(formatsByChannel);

  return (
    <div className="space-y-3">
      <label className="input-label">Canales y formatos de publicación</label>

      {/* Channel toggles */}
      <div className="flex gap-4">
        {Object.keys(PLATFORM_FORMATS).map((ch) => (
          <label
            key={ch}
            className="flex items-center gap-2 text-sm cursor-pointer"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <input
              type="checkbox"
              checked={selectedChannels.includes(ch)}
              onChange={() => toggleChannel(ch)}
              className="accent-purple-500"
            />
            {CHANNEL_ICONS[ch]} {ch.charAt(0).toUpperCase() + ch.slice(1)}
          </label>
        ))}
      </div>

      {/* Per-channel format selection */}
      {selectedChannels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          {selectedChannels.map((ch) => {
            const formats = PLATFORM_FORMATS[ch] ?? [];
            const selected = formatsByChannel[ch] ?? [];
            return (
              <div
                key={ch}
                className="rounded-lg p-3 space-y-2"
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                }}
              >
                <div className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  {CHANNEL_ICONS[ch]} {ch.charAt(0).toUpperCase() + ch.slice(1)} — Formatos
                </div>
                <div className="flex flex-wrap gap-2">
                  {formats.map((f) => {
                    const isSelected = selected.includes(f.value);
                    return (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => toggleFormat(ch, f.value)}
                        className="text-xs px-2.5 py-1 rounded-md font-medium transition-all"
                        style={{
                          backgroundColor: isSelected ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                          color: isSelected ? '#818cf8' : 'var(--color-text-muted)',
                          border: `1px solid ${isSelected ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        {isSelected ? '✓ ' : ''}{f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden inputs for form submission */}
      {selectedChannels.map((ch) => (
        <input key={ch} type="hidden" name="channels" value={ch} />
      ))}
      <input type="hidden" name="channelFormats" value={channelFormatsJson} />
    </div>
  );
}
