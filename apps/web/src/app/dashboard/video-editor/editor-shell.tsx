'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TextLayer {
  id: number; type: 'text';
  name: string; text: string;
  font: string; size: number; weight: number; color: string;
  style: 'normal' | 'gradient' | 'neon' | 'outlined' | 'capcut' | 'glitch' | '3d-shadow' | 'rainbow';
  animIn: string; animOut: string;
  x: number; y: number;
  startSec: number; endSec: number;
  letterSpacing: number; lineHeight: number; uppercase: boolean;
}
interface ImageLayer {
  id: number; type: 'img';
  name: string; file: string;
  fit: 'cover' | 'contain' | 'fill';
  animIn: string; kenBurns: string;
  startSec: number; endSec: number;
  opacity: number; radius: number;
}
interface MotionLayer {
  id: number; type: 'motion';
  name: string; element: string;
  text: string; color: string;
  startSec: number; endSec: number;
}
type AnyLayer = TextLayer | ImageLayer | MotionLayer;

interface DragState {
  clipId: number;
  mode: 'move' | 'resize-end' | 'resize-start';
  startX: number;
  origStart: number;
  origEnd: number;
}

interface RenderJob {
  id: string; status: 'pending' | 'processing' | 'ready' | 'failed';
  progress: number; url?: string; name: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const FORMATS = {
  tiktok: { w: 1080, h: 1920, label: 'TikTok', icon: '📱' },
  reels:  { w: 1080, h: 1920, label: 'Reels',  icon: '📸' },
  youtube:{ w: 1920, h: 1080, label: 'YouTube', icon: '▶️' },
  shorts: { w: 1080, h: 1920, label: 'Shorts',  icon: '📲' },
  square: { w: 1080, h: 1080, label: 'Square',  icon: '⬛' },
};

const KINETIC_ANIMS = [
  { id: 'word-by-word',  label: 'Palabra x palabra', icon: '💬' },
  { id: 'fly-random',    label: 'Fly from random',   icon: '🌀' },
  { id: 'bounce-stack',  label: 'Bounce stack',      icon: '🏀' },
  { id: 'zoom-punch',    label: 'Zoom punch',        icon: '💥' },
  { id: 'letters-cascade', label: 'Letras cascada',  icon: '🎇' },
  { id: 'split-reveal',  label: 'Split reveal',      icon: '✂️' },
  { id: 'typewriter',    label: 'Typewriter',        icon: '⌨️' },
  { id: 'glitch-appear', label: 'Glitch appear',    icon: '👾' },
  { id: 'slide-up',      label: 'Slide up',          icon: '⬆️' },
  { id: 'fade-in',       label: 'Fade in',           icon: '🌅' },
  { id: 'wipe-reveal',   label: 'Wipe reveal',       icon: '🔎' },
  { id: 'none',          label: 'Sin animación',     icon: '—' },
];

const TRANSITIONS = [
  { id: 'dissolve',    label: 'Dissolve',    icon: '🌊' },
  { id: 'wipe-right',  label: 'Wipe →',      icon: '▶' },
  { id: 'push-slide',  label: 'Push slide',  icon: '↔' },
  { id: 'zoom-blur',   label: 'Zoom blur',   icon: '🔍' },
  { id: 'flip-3d',     label: 'Flip 3D',     icon: '🔄' },
  { id: 'cube-3d',     label: 'Cube 3D',     icon: '🎲' },
  { id: 'film-burn',   label: 'Film burn',   icon: '🎞' },
  { id: 'glitch-cut',  label: 'Glitch cut',  icon: '⚡' },
  { id: 'ink-spread',  label: 'Ink spread',  icon: '🖋' },
  { id: 'swipe-ios',   label: 'Swipe iOS',   icon: '📱' },
  { id: 'whip-pan',    label: 'Whip pan',    icon: '🌪' },
  { id: 'ken-burns',   label: 'Ken Burns',   icon: '📷' },
  { id: 'ripple',      label: 'Ripple',      icon: '💧' },
  { id: 'shatter',     label: 'Shatter',     icon: '💎' },
  { id: 'color-flash', label: 'Color flash', icon: '🌈' },
  { id: 'none',        label: 'Ninguna',     icon: '—' },
];

const MOTION_ELEMENTS = [
  { id: 'counter',      label: 'Contador',        icon: '🔢' },
  { id: 'progress-bar', label: 'Barra progreso',  icon: '📊' },
  { id: 'lower-third',  label: 'Lower third',     icon: '📺' },
  { id: 'cta-badge',    label: 'CTA Badge',       icon: '🔔' },
  { id: 'price-tag',    label: 'Price tag',       icon: '💰' },
  { id: 'rating-stars', label: 'Rating stars',    icon: '⭐' },
  { id: 'emoji-burst',  label: 'Emoji burst',     icon: '🎉' },
  { id: 'arrow',        label: 'Arrow animado',   icon: '➡️' },
  { id: 'countdown',    label: 'Countdown',       icon: '⏱' },
  { id: 'social-proof', label: 'Social proof',    icon: '👥' },
  { id: 'viral-badge',  label: 'Viral badge',     icon: '🔥' },
  { id: 'logo-intro',   label: 'Logo intro',      icon: '✨' },
];

const PARTICLES = [
  { id: 'none',      label: 'Ninguno',   icon: '—' },
  { id: 'confetti',  label: 'Confetti',  icon: '🎊' },
  { id: 'sparkles',  label: 'Sparkles',  icon: '✨' },
  { id: 'snow',      label: 'Nieve',     icon: '❄️' },
  { id: 'hearts',    label: 'Corazones', icon: '❤️' },
  { id: 'money',     label: 'Money rain',icon: '💸' },
  { id: 'fire',      label: 'Fuego',     icon: '🔥' },
  { id: 'bubbles',   label: 'Burbujas',  icon: '🫧' },
  { id: 'stars',     label: 'Estrellas', icon: '⭐' },
  { id: 'bokeh',     label: 'Bokeh',     icon: '🔵' },
  { id: 'matrix',    label: 'Matrix',    icon: '🟩' },
  { id: 'glitter',   label: 'Glitter',   icon: '💎' },
];

const FILTERS = [
  { id: 'none',         label: 'Normal',        css: 'none' },
  { id: 'warm',         label: 'Warm',          css: 'sepia(0.2) saturate(1.4) brightness(1.05)' },
  { id: 'cool',         label: 'Cool',          css: 'hue-rotate(200deg) saturate(0.8)' },
  { id: 'dramatic',     label: 'Dramatic',      css: 'contrast(1.5) brightness(0.85)' },
  { id: 'vintage',      label: 'Vintage',       css: 'sepia(0.5) contrast(0.9) saturate(0.8)' },
  { id: 'neon',         label: 'Neon glow',     css: 'saturate(2.5) brightness(1.2) contrast(1.2)' },
  { id: 'noir',         label: 'Noir B&W',      css: 'grayscale(1) contrast(1.3)' },
  { id: 'dreamy',       label: 'Dreamy',        css: 'brightness(1.1) saturate(0.7) blur(0.5px)' },
  { id: 'cyberpunk',    label: 'Cyberpunk',     css: 'saturate(2) hue-rotate(60deg) contrast(1.2)' },
  { id: 'golden-hour',  label: 'Golden hour',   css: 'sepia(0.3) saturate(1.6) brightness(1.1) hue-rotate(-10deg)' },
  { id: 'teal-orange',  label: 'Teal & Orange', css: 'saturate(1.5) contrast(1.1)' },
];

const CAPTION_STYLES = [
  { id: 'capcut',        label: 'CapCut',         icon: '🎬' },
  { id: 'highlight',     label: 'Highlight',       icon: '🖊' },
  { id: 'typewriter',    label: 'Typewriter',      icon: '⌨️' },
  { id: 'word-pop',      label: 'Word Pop',        icon: '💥' },
  { id: 'karaoke',       label: 'Karaoke',         icon: '🎤' },
  { id: 'netflix',       label: 'Netflix',         icon: '🎥' },
  { id: 'tiktok-bold',   label: 'TikTok Bold',     icon: '📱' },
  { id: 'minimal',       label: 'Minimal',         icon: '▪' },
];

const TEXT_FONTS = ['Inter', 'Syne', 'Montserrat', 'Oswald', 'Bebas Neue', 'Impact', 'Arial Black', 'Courier New'];

// ─── Main Component ───────────────────────────────────────────────────────────
export function VideoEditorShell() {
  // ── Canvas / format
  const [format, setFormat] = useState<keyof typeof FORMATS>('tiktok');
  const [fps, setFps] = useState(30);
  const [durationSec, setDurationSec] = useState(10);

  // ── Background
  const [bgType, setBgType] = useState<'solid' | 'gradient' | 'gradient3' | 'mesh' | 'pattern'>('solid');
  const [bgColor, setBgColor] = useState('#06060f');
  const [g1, setG1] = useState('#0d0d2b');
  const [g2, setG2] = useState('#1a0033');
  const [g3, setG3] = useState('#001a33');
  const [gAngle, setGAngle] = useState(135);

  // ── Layers
  const [layers, setLayers] = useState<AnyLayer[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const layerCounter = useRef(0);

  // ── Effects
  const [colorFilter, setColorFilter] = useState('none');
  const [particles, setParticles] = useState('none');
  const [vignette, setVignette] = useState(false);
  const [grain, setGrain] = useState(false);
  const [scanlines, setScanlines] = useState(false);
  const [transition, setTransition] = useState('dissolve');
  const [introType, setIntroType] = useState('none');
  const [outroType, setOutroType] = useState('none');

  // ── Captions
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [captionStyle, setCaptionStyle] = useState('capcut');
  const [captionText, setCaptionText] = useState('');
  const [captionFont, setCaptionFont] = useState('Inter');
  const [captionSize, setCaptionSize] = useState(64);
  const [captionColor, setCaptionColor] = useState('#ffffff');
  const [captionHlColor, setCaptionHlColor] = useState('#ffee00');
  const [captionPos, setCaptionPos] = useState<'top' | 'center' | 'bottom'>('bottom');
  const [captionBg, setCaptionBg] = useState(false);

  // ── Audio / render config
  const [voices, setVoices] = useState<{ id: string; label: string }[]>([]);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsText, setTtsText] = useState('');
  const [ttsVoice, setTtsVoice] = useState('');
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicStyle, setMusicStyle] = useState('upbeat');
  const [outputFormat, setOutputFormat] = useState('mp4');
  const [resolution, setResolution] = useState('1080p');
  const [quality, setQuality] = useState(18);

  // ── Render state
  const [renderJobs, setRenderJobs] = useState<RenderJob[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatus, setRenderStatus] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Playback
  const [playing, setPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalFrames = Math.round(durationSec * fps);

  // ── Timeline drag
  const [drag, setDrag] = useState<DragState | null>(null);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const tlRef = useRef<HTMLDivElement>(null);

  // ── UI state
  const [activePanel, setActivePanel] = useState('layers');
  const [topTab, setTopTab] = useState<'compose' | 'effects' | 'export'>('compose');
  const [toast, setToast] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Load voices from backend
  useEffect(() => {
    fetch('/api/videos/compositor/voices', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data)) setVoices(data);
        else if (data?.voices) setVoices(data.voices);
      })
      .catch(() => {
        setVoices([
          { id: 'es-AR-ElenaNeural',    label: 'Elena — Argentina (F)' },
          { id: 'es-AR-TomasNeural',    label: 'Tomás — Argentina (M)' },
          { id: 'es-ES-ElviraNeural',   label: 'Elvira — España (F)' },
          { id: 'es-ES-AlvaroNeural',   label: 'Álvaro — España (M)' },
          { id: 'es-MX-DaliaNeural',    label: 'Dalia — México (F)' },
          { id: 'es-MX-JorgeNeural',    label: 'Jorge — México (M)' },
          { id: 'es-CO-SalomeNeural',   label: 'Salomé — Colombia (F)' },
          { id: 'es-CO-GonzaloNeural',  label: 'Gonzalo — Colombia (M)' },
        ]);
      });
  }, []);

  // ── Playback engine
  useEffect(() => {
    if (playing) {
      playRef.current = setInterval(() => {
        setCurrentFrame(f => {
          if (f >= totalFrames) { setPlaying(false); return 0; }
          return f + 1;
        });
      }, 1000 / fps);
    } else {
      if (playRef.current) clearInterval(playRef.current);
    }
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [playing, fps, totalFrames]);

  // ── Toast helper
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // ── Layer helpers
  const addLayer = (layer: AnyLayer) => {
    setLayers(prev => [...prev, layer]);
    setSelectedId(layer.id);
  };

  const addTextLayer = () => {
    layerCounter.current++;
    addLayer({
      id: layerCounter.current, type: 'text',
      name: `Texto ${layerCounter.current}`,
      text: 'Escribe aquí', font: 'Inter', size: 72, weight: 700,
      color: '#ffffff', style: 'normal',
      animIn: 'slide-up', animOut: 'fade-in',
      x: 50, y: 50, startSec: 0, endSec: durationSec,
      letterSpacing: 0, lineHeight: 1.2, uppercase: false,
    });
    setActivePanel('text');
  };

  const addImageLayer = () => {
    layerCounter.current++;
    addLayer({
      id: layerCounter.current, type: 'img',
      name: `Imagen ${layerCounter.current}`,
      file: '', fit: 'cover', animIn: 'fade-in', kenBurns: 'none',
      startSec: 0, endSec: durationSec, opacity: 100, radius: 0,
    });
    setActivePanel('images');
  };

  const addMotionLayer = (element: string) => {
    layerCounter.current++;
    const el = MOTION_ELEMENTS.find(e => e.id === element);
    addLayer({
      id: layerCounter.current, type: 'motion',
      name: el?.label ?? element,
      element, text: el?.label ?? '', color: '#7c3aed',
      startSec: 0, endSec: Math.min(3, durationSec),
    });
  };

  const updateLayer = useCallback(<T extends AnyLayer>(id: number, patch: Partial<T>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }, []);

  const deleteLayer = (id: number) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const selectedLayer = layers.find(l => l.id === selectedId) ?? null;

  // ── Timeline drag handlers
  const onClipMouseDown = (e: React.MouseEvent, clipId: number, mode: DragState['mode']) => {
    e.preventDefault();
    e.stopPropagation();
    const layer = layers.find(l => l.id === clipId);
    if (!layer) return;
    setSelectedId(clipId);
    setDrag({ clipId, mode, startX: e.clientX, origStart: (layer as TextLayer).startSec, origEnd: (layer as TextLayer).endSec });
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag || !tlRef.current) return;
      const rect = tlRef.current.getBoundingClientRect();
      const pxPerSec = (rect.width * timelineZoom) / durationSec;
      const deltaSec = (e.clientX - drag.startX) / pxPerSec;
      setLayers(prev => prev.map(l => {
        if (l.id !== drag.clipId) return l;
        const tl = l as TextLayer;
        if (drag.mode === 'move') {
          const dur = drag.origEnd - drag.origStart;
          const ns = Math.max(0, Math.min(durationSec - dur, drag.origStart + deltaSec));
          return { ...l, startSec: Math.round(ns * 10) / 10, endSec: Math.round((ns + dur) * 10) / 10 };
        } else if (drag.mode === 'resize-end') {
          return { ...l, endSec: Math.max(tl.startSec + 0.2, Math.min(durationSec, Math.round((drag.origEnd + deltaSec) * 10) / 10)) };
        } else {
          return { ...l, startSec: Math.max(0, Math.min(tl.endSec - 0.2, Math.round((drag.origStart + deltaSec) * 10) / 10)) };
        }
      }));
    };
    const onUp = () => setDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [drag, durationSec, timelineZoom]);

  // ── Render
  const handleRender = async () => {
    if (isRendering) return;
    const creditCost = 3 + (musicEnabled ? 3 : 0);
    if (!confirm(`¿Renderizar video? Costará ${creditCost} créditos.`)) return;

    setIsRendering(true);
    setRenderProgress(5);
    setRenderStatus('Preparando composición...');

    try {
      const body = {
        images: (layers.filter(l => l.type === 'img') as ImageLayer[]).map(l => l.file).filter(Boolean),
        textLayers: layers.filter(l => l.type === 'text'),
        narrationText: ttsEnabled ? ttsText : undefined,
        voice: ttsEnabled ? ttsVoice : undefined,
        musicStyle: musicEnabled ? musicStyle : undefined,
        subtitleStyle: captionsEnabled ? captionStyle : 'none',
        duration: durationSec * 1000,
        format: `${FORMATS[format].w}x${FORMATS[format].h}`,
        fps,
        quality: outputFormat === 'mp4' ? quality : 23,
      };

      const res = await fetch('/api/videos/compositor/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Error al iniciar render');
      const data = await res.json();
      const jobId = data?.jobId ?? data?.id ?? data?.data?.id;

      if (!jobId) throw new Error('No se recibió jobId');

      const newJob: RenderJob = { id: jobId, status: 'processing', progress: 5, name: `render_${Date.now()}.mp4` };
      setRenderJobs(prev => [newJob, ...prev.slice(0, 2)]);

      // Poll
      pollRef.current = setInterval(async () => {
        try {
          const pr = await fetch(`/api/videos/render/${jobId}`, { credentials: 'include' });
          if (!pr.ok) return;
          const pd = await pr.json();
          const status = pd?.status ?? pd?.data?.status;
          const progress = pd?.progress ?? pd?.data?.progress ?? 50;
          const url = pd?.url ?? pd?.data?.url;

          setRenderProgress(progress);
          setRenderStatus(
            status === 'processing' ? `Renderizando... ${progress}%` :
            status === 'ready' ? '✅ Video listo' :
            status === 'failed' ? '❌ Error en render' : `${status}...`
          );

          setRenderJobs(prev => prev.map(j => j.id === jobId ? { ...j, status, progress, url } : j));

          if (status === 'ready' || status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            setIsRendering(false);
            if (status === 'ready') showToast('✅ Video renderizado con éxito');
          }
        } catch { /* ignore poll errors */ }
      }, 3000);

    } catch (err) {
      setIsRendering(false);
      setRenderStatus('❌ Error al renderizar');
      showToast('Error al iniciar el render');
    }
  };

  const improveNarration = async () => {
    if (!ttsText.trim()) return;
    try {
      const res = await fetch('/api/videos/compositor/improve-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: ttsText, tone: 'persuasive' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const improved = data?.text ?? data?.data?.text;
      if (improved) { setTtsText(improved); showToast('✨ Narración mejorada'); }
    } catch { showToast('Error al mejorar narración'); }
  };

  // ── Canvas preview render
  const canvasW = FORMATS[format].w;
  const canvasH = FORMATS[format].h;
  const isPortrait = canvasH > canvasW;
  const previewH = 420;
  const previewW = isPortrait ? (previewH * canvasW) / canvasH : Math.min(680, previewH * (canvasW / canvasH));
  const scale = previewW / canvasW;

  const getBgStyle = (): React.CSSProperties => {
    if (bgType === 'solid') return { backgroundColor: bgColor };
    if (bgType === 'gradient') return { background: `linear-gradient(${gAngle}deg, ${g1}, ${g2})` };
    if (bgType === 'gradient3') return { background: `linear-gradient(${gAngle}deg, ${g1}, ${g2}, ${g3})` };
    if (bgType === 'mesh') return { background: `radial-gradient(ellipse at 20% 30%, ${g1} 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, ${g2} 0%, transparent 50%)`, backgroundColor: '#000' };
    if (bgType === 'pattern') return { backgroundColor: '#0a0a14', backgroundImage: 'radial-gradient(circle, #1a1a30 1px, transparent 1px)', backgroundSize: '20px 20px' };
    return { backgroundColor: bgColor };
  };

  const filterCss = FILTERS.find(f => f.id === colorFilter)?.css ?? 'none';

  const getTextStyle = (l: TextLayer): React.CSSProperties => {
    const fs = Math.max(8, l.size * scale);
    const base: React.CSSProperties = {
      position: 'absolute', left: `${l.x}%`, top: `${l.y}%`,
      transform: 'translate(-50%, -50%)',
      fontFamily: `'${l.font}', sans-serif`,
      fontSize: fs, fontWeight: l.weight,
      textAlign: 'center', width: '90%',
      letterSpacing: l.letterSpacing,
      lineHeight: l.lineHeight,
      textTransform: l.uppercase ? 'uppercase' : 'none',
      zIndex: 5, wordBreak: 'break-word',
    };
    if (l.style === 'gradient') return { ...base, background: 'linear-gradient(135deg, #ff3d7f, #7c3aed, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' };
    if (l.style === 'neon') return { ...base, color: l.color, textShadow: `0 0 10px ${l.color}, 0 0 20px ${l.color}, 0 0 40px ${l.color}` };
    if (l.style === 'outlined') return { ...base, color: 'transparent', WebkitTextStroke: `${Math.max(1, 2 * scale)}px ${l.color}` };
    if (l.style === 'capcut') return { ...base, color: l.color, textShadow: `${3*scale}px ${3*scale}px 0 #000, ${-3*scale}px ${-3*scale}px 0 #000` };
    if (l.style === '3d-shadow') return { ...base, color: l.color, textShadow: `${2*scale}px ${2*scale}px 0 rgba(0,0,0,.5), ${4*scale}px ${4*scale}px 0 rgba(0,0,0,.3)` };
    if (l.style === 'rainbow') return { ...base, background: 'linear-gradient(90deg, #f00, #f70, #ff0, #0f0, #00f, #80f)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' };
    if (l.style === 'glitch') return { ...base, color: l.color, animation: 'glitch 2s infinite' };
    return { ...base, color: l.color };
  };

  const renderMotion = (l: MotionLayer) => {
    const fs = 12 * scale;
    const motionStyles: Record<string, React.CSSProperties> = {
      'lower-third': { position: 'absolute', bottom: '12%', left: '5%', background: 'rgba(124,58,237,0.9)', padding: `${6*scale}px ${12*scale}px`, borderRadius: 4, color: '#fff', fontSize: fs, fontWeight: 600 },
      'cta-badge': { position: 'absolute', bottom: '8%', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', padding: `${8*scale}px ${16*scale}px`, borderRadius: 100, color: '#fff', fontSize: fs, fontWeight: 700 },
      'price-tag': { position: 'absolute', top: '8%', right: '5%', background: '#f59e0b', padding: `${6*scale}px ${10*scale}px`, borderRadius: 8, color: '#000', fontSize: fs, fontWeight: 900 },
      'viral-badge': { position: 'absolute', top: '5%', left: '5%', background: 'rgba(239,68,68,0.9)', padding: `${4*scale}px ${10*scale}px`, borderRadius: 100, color: '#fff', fontSize: fs*0.85, fontWeight: 700, letterSpacing: 1 },
      'social-proof': { position: 'absolute', top: '12%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', padding: `${6*scale}px ${14*scale}px`, borderRadius: 8, color: '#fff', fontSize: fs },
    };
    const st = motionStyles[l.element] ?? { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(124,58,237,0.8)', padding: `${6*scale}px ${12*scale}px`, borderRadius: 8, color: '#fff', fontSize: fs };
    const label: Record<string, string> = { 'lower-third': l.text || 'Nombre · Título', 'cta-badge': l.text || '👆 Link en Bio', 'price-tag': l.text || '$99', 'viral-badge': '🔥 VIRAL', 'social-proof': l.text || '2.5M vistas' };
    return <div key={l.id} style={st}>{label[l.element] ?? l.text}</div>;
  };

  const getLayerTrackColor = (type: string) => type === 'text' ? '#7c3aed' : type === 'img' ? '#06b6d4' : '#f59e0b';

  // ── Panel components
  const PanelSection = ({ title }: { title: string }) => (
    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase', color: '#404060', marginBottom: 8, marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
      {title}
      <div style={{ flex: 1, height: 1, background: 'rgba(124,58,237,0.1)' }} />
    </div>
  );

  const ToggleRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: '#a0a0c0', fontFamily: 'monospace' }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{ width: 32, height: 18, borderRadius: 100, background: checked ? '#7c3aed' : '#2a2a40', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
      >
        <span style={{ position: 'absolute', width: 12, height: 12, borderRadius: '50%', background: '#fff', top: 3, left: checked ? 17 : 3, transition: 'left 0.2s' }} />
      </button>
    </div>
  );

  const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 10, color: '#606080', marginBottom: 4, fontFamily: 'monospace' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="input-field" style={{ fontSize: 12, padding: '6px 10px' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const ChipGrid = ({ items, selected, onSelect, cols = 2 }: { items: { id: string; label: string; icon?: string }[]; selected: string; onSelect: (id: string) => void; cols?: number }) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 5, marginBottom: 10 }}>
      {items.map(item => (
        <button key={item.id} onClick={() => onSelect(item.id)}
          style={{
            padding: '7px 6px', borderRadius: 8, border: `1px solid ${selected === item.id ? '#7c3aed' : 'rgba(124,58,237,0.15)'}`,
            background: selected === item.id ? 'rgba(124,58,237,0.15)' : 'rgba(15,15,30,0.6)',
            color: selected === item.id ? '#a78bfa' : '#606080',
            fontSize: 10, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
          {item.icon && <span style={{ fontSize: 14 }}>{item.icon}</span>}
          <span style={{ fontFamily: 'monospace', letterSpacing: '0.3px' }}>{item.label}</span>
        </button>
      ))}
    </div>
  );

  // ── Left panels content
  const renderPanelContent = () => {
    if (topTab === 'effects') return renderEffectsPanel();
    if (topTab === 'export') return renderExportPanel();

    switch (activePanel) {
      case 'layers':   return renderLayersPanel();
      case 'format':   return renderFormatPanel();
      case 'text':     return renderTextPanel();
      case 'images':   return renderImagesPanel();
      case 'effects':  return renderEffectsPanel();
      case 'captions': return renderCaptionsPanel();
      case 'audio':    return renderAudioPanel();
      default:         return renderLayersPanel();
    }
  };

  const renderLayersPanel = () => (
    <div>
      <PanelSection title="Capas activas" />
      {layers.length === 0 && (
        <div style={{ textAlign: 'center', color: '#404060', fontSize: 11, padding: '24px 0', fontFamily: 'monospace' }}>
          Sin capas aún<br /><br />Usa los paneles para<br />agregar contenido
        </div>
      )}
      {layers.map(l => (
        <div key={l.id}
          onClick={() => setSelectedId(l.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 10, marginBottom: 4, cursor: 'pointer',
            background: selectedId === l.id ? 'rgba(124,58,237,0.15)' : 'rgba(15,15,30,0.4)',
            border: `1px solid ${selectedId === l.id ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.1)'}`,
            transition: 'all 0.15s',
          }}>
          <div style={{ width: 4, height: 28, borderRadius: 2, background: getLayerTrackColor(l.type), flexShrink: 0 }} />
          <span style={{ fontSize: 13 }}>{l.type === 'text' ? 'T' : l.type === 'img' ? '🖼' : '✨'}</span>
          <span style={{ flex: 1, fontSize: 12, color: '#c0c0e0' }}>{l.name}</span>
          <span style={{ fontSize: 9, color: '#404060', fontFamily: 'monospace' }}>
            {(l as TextLayer).startSec}s→{(l as TextLayer).endSec}s
          </span>
          <button onClick={e => { e.stopPropagation(); deleteLayer(l.id); }}
            style={{ fontSize: 10, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>✕</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <button onClick={addTextLayer} style={{ flex: 1, padding: '7px', border: '1px dashed rgba(124,58,237,0.3)', borderRadius: 8, background: 'transparent', color: '#7c3aed', fontSize: 11, cursor: 'pointer' }}>+ Texto</button>
        <button onClick={addImageLayer} style={{ flex: 1, padding: '7px', border: '1px dashed rgba(6,182,212,0.3)', borderRadius: 8, background: 'transparent', color: '#06b6d4', fontSize: 11, cursor: 'pointer' }}>+ Imagen</button>
      </div>

      {selectedLayer && selectedLayer.type === 'text' && renderSelectedTextLayer(selectedLayer as TextLayer)}
      {selectedLayer && selectedLayer.type === 'img' && renderSelectedImgLayer(selectedLayer as ImageLayer)}
    </div>
  );

  const renderSelectedTextLayer = (l: TextLayer) => (
    <div style={{ marginTop: 16, padding: 12, background: 'rgba(124,58,237,0.05)', borderRadius: 10, border: '1px solid rgba(124,58,237,0.15)' }}>
      <PanelSection title={`Editar: ${l.name}`} />
      <div style={{ marginBottom: 10 }}>
        <label className="input-label">Texto</label>
        <textarea value={l.text} onChange={e => updateLayer(l.id, { text: e.target.value } as Partial<TextLayer>)}
          className="input-field" style={{ minHeight: 56, fontSize: 12, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <SelectField label="Fuente" value={l.font} onChange={v => updateLayer(l.id, { font: v } as Partial<TextLayer>)}
          options={TEXT_FONTS.map(f => ({ value: f, label: f }))} />
        <SelectField label="Estilo" value={l.style} onChange={v => updateLayer(l.id, { style: v as TextLayer['style'] })}
          options={[
            { value: 'normal', label: 'Normal' }, { value: 'gradient', label: 'Gradient' },
            { value: 'neon', label: 'Neon' }, { value: 'outlined', label: 'Outlined' },
            { value: 'capcut', label: 'CapCut' }, { value: 'glitch', label: 'Glitch' },
            { value: '3d-shadow', label: '3D Shadow' }, { value: 'rainbow', label: 'Rainbow' },
          ]} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label className="input-label">Tamaño: {l.size}px</label>
        <input type="range" min={12} max={200} value={l.size} onChange={e => updateLayer(l.id, { size: +e.target.value } as Partial<TextLayer>)}
          style={{ width: '100%', accentColor: '#7c3aed' }} />
      </div>
      <SelectField label="Animación entrada" value={l.animIn} onChange={v => updateLayer(l.id, { animIn: v } as Partial<TextLayer>)}
        options={KINETIC_ANIMS.map(a => ({ value: a.id, label: `${a.icon} ${a.label}` }))} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, marginBottom: 10 }}>
          <label className="input-label">Color</label>
          <input type="color" value={l.color} onChange={e => updateLayer(l.id, { color: e.target.value } as Partial<TextLayer>)}
            style={{ width: '100%', height: 32, borderRadius: 6, border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(15,15,30,0.6)', cursor: 'pointer' }} />
        </div>
        <div style={{ flex: 1, marginBottom: 10 }}>
          <label className="input-label">Peso</label>
          <select value={l.weight} onChange={e => updateLayer(l.id, { weight: +e.target.value } as Partial<TextLayer>)} className="input-field" style={{ fontSize: 12 }}>
            {[300,400,500,600,700,800,900].map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label className="input-label">Pos X%</label>
          <input type="number" value={l.x} min={0} max={100} onChange={e => updateLayer(l.id, { x: +e.target.value } as Partial<TextLayer>)} className="input-field" style={{ fontSize: 12 }} />
        </div>
        <div>
          <label className="input-label">Pos Y%</label>
          <input type="number" value={l.y} min={0} max={100} onChange={e => updateLayer(l.id, { y: +e.target.value } as Partial<TextLayer>)} className="input-field" style={{ fontSize: 12 }} />
        </div>
        <div>
          <label className="input-label">Inicio (s)</label>
          <input type="number" value={l.startSec} min={0} step={0.1} onChange={e => updateLayer(l.id, { startSec: +e.target.value } as Partial<TextLayer>)} className="input-field" style={{ fontSize: 12 }} />
        </div>
        <div>
          <label className="input-label">Fin (s)</label>
          <input type="number" value={l.endSec} min={0} step={0.1} onChange={e => updateLayer(l.id, { endSec: +e.target.value } as Partial<TextLayer>)} className="input-field" style={{ fontSize: 12 }} />
        </div>
      </div>
      <ToggleRow label="MAYÚSCULAS" checked={l.uppercase} onChange={v => updateLayer(l.id, { uppercase: v } as Partial<TextLayer>)} />
    </div>
  );

  const renderSelectedImgLayer = (l: ImageLayer) => (
    <div style={{ marginTop: 16, padding: 12, background: 'rgba(6,182,212,0.05)', borderRadius: 10, border: '1px solid rgba(6,182,212,0.15)' }}>
      <PanelSection title={`Editar: ${l.name}`} />
      <div style={{ marginBottom: 10 }}>
        <label className="input-label">Archivo (public/)</label>
        <input type="text" value={l.file} placeholder="imagen.jpg" onChange={e => updateLayer(l.id, { file: e.target.value } as Partial<ImageLayer>)} className="input-field" style={{ fontSize: 12 }} />
      </div>
      <SelectField label="Animación" value={l.animIn} onChange={v => updateLayer(l.id, { animIn: v } as Partial<ImageLayer>)}
        options={[{ value: 'fade-in', label: '🌅 Fade in' }, { value: 'zoom-punch', label: '💥 Zoom punch' }, { value: 'slide-up', label: '⬆️ Slide up' }, { value: 'slide-left', label: '← Slide left' }, { value: 'wipe-reveal', label: '🔎 Wipe reveal' }, { value: 'ken-burns', label: '📷 Ken Burns' }]} />
      <SelectField label="Ken Burns" value={l.kenBurns} onChange={v => updateLayer(l.id, { kenBurns: v } as Partial<ImageLayer>)}
        options={[{ value: 'none', label: 'Ninguno' }, { value: 'zoom-in', label: 'Zoom in' }, { value: 'zoom-out', label: 'Zoom out' }, { value: 'pan-left', label: 'Pan ←' }, { value: 'pan-right', label: 'Pan →' }]} />
      <div style={{ marginBottom: 10 }}>
        <label className="input-label">Opacidad: {l.opacity}%</label>
        <input type="range" min={0} max={100} value={l.opacity} onChange={e => updateLayer(l.id, { opacity: +e.target.value } as Partial<ImageLayer>)} style={{ width: '100%', accentColor: '#06b6d4' }} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label className="input-label">Border radius: {l.radius}px</label>
        <input type="range" min={0} max={100} value={l.radius} onChange={e => updateLayer(l.id, { radius: +e.target.value } as Partial<ImageLayer>)} style={{ width: '100%', accentColor: '#06b6d4' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label className="input-label">Inicio (s)</label>
          <input type="number" value={l.startSec} min={0} step={0.1} onChange={e => updateLayer(l.id, { startSec: +e.target.value } as Partial<ImageLayer>)} className="input-field" style={{ fontSize: 12 }} />
        </div>
        <div>
          <label className="input-label">Fin (s)</label>
          <input type="number" value={l.endSec} min={0} step={0.1} onChange={e => updateLayer(l.id, { endSec: +e.target.value } as Partial<ImageLayer>)} className="input-field" style={{ fontSize: 12 }} />
        </div>
      </div>
    </div>
  );

  const renderFormatPanel = () => (
    <div>
      <PanelSection title="Formato de video" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
        {(Object.entries(FORMATS) as [keyof typeof FORMATS, typeof FORMATS[keyof typeof FORMATS]][]).map(([k, v]) => (
          <button key={k} onClick={() => setFormat(k)}
            style={{ padding: '8px 4px', borderRadius: 8, border: `1px solid ${format === k ? '#7c3aed' : 'rgba(124,58,237,0.15)'}`, background: format === k ? 'rgba(124,58,237,0.12)' : 'rgba(15,15,30,0.6)', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: 18 }}>{v.icon}</div>
            <div style={{ fontSize: 9, color: format === k ? '#a78bfa' : '#606080', fontFamily: 'monospace' }}>{v.label}</div>
            <div style={{ fontSize: 8, color: '#404060', fontFamily: 'monospace' }}>{v.w}×{v.h}</div>
          </button>
        ))}
      </div>
      <PanelSection title="Tiempo" />
      <div style={{ marginBottom: 10 }}>
        <label className="input-label">Duración: {durationSec}s ({totalFrames}f)</label>
        <input type="range" min={1} max={120} value={durationSec} onChange={e => setDurationSec(+e.target.value)} style={{ width: '100%', accentColor: '#7c3aed' }} />
      </div>
      <SelectField label="FPS" value={String(fps)} onChange={v => setFps(+v)}
        options={[{ value: '24', label: '24fps — Cinematic' }, { value: '30', label: '30fps — Standard' }, { value: '60', label: '60fps — Ultra smooth' }]} />
      <PanelSection title="Fondo" />
      <SelectField label="Tipo de fondo" value={bgType} onChange={v => setBgType(v as typeof bgType)}
        options={[{ value: 'solid', label: 'Color sólido' }, { value: 'gradient', label: 'Gradiente 2 colores' }, { value: 'gradient3', label: 'Gradiente 3 colores' }, { value: 'mesh', label: 'Gradient mesh' }, { value: 'pattern', label: 'Patrón geométrico' }]} />
      {bgType === 'solid' && (
        <div style={{ marginBottom: 10 }}>
          <label className="input-label">Color</label>
          <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ width: '100%', height: 32, borderRadius: 6, border: '1px solid rgba(124,58,237,0.2)', background: 'none', cursor: 'pointer' }} />
        </div>
      )}
      {(bgType === 'gradient' || bgType === 'gradient3' || bgType === 'mesh') && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div><label className="input-label">Color A</label><input type="color" value={g1} onChange={e => setG1(e.target.value)} style={{ width: '100%', height: 28, borderRadius: 6, border: '1px solid rgba(124,58,237,0.2)', cursor: 'pointer' }} /></div>
            <div><label className="input-label">Color B</label><input type="color" value={g2} onChange={e => setG2(e.target.value)} style={{ width: '100%', height: 28, borderRadius: 6, border: '1px solid rgba(124,58,237,0.2)', cursor: 'pointer' }} /></div>
            {(bgType === 'gradient3' || bgType === 'mesh') && <div style={{ gridColumn: '1/-1' }}><label className="input-label">Color C</label><input type="color" value={g3} onChange={e => setG3(e.target.value)} style={{ width: '100%', height: 28, borderRadius: 6, border: '1px solid rgba(124,58,237,0.2)', cursor: 'pointer' }} /></div>}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="input-label">Ángulo: {gAngle}°</label>
            <input type="range" min={0} max={360} value={gAngle} onChange={e => setGAngle(+e.target.value)} style={{ width: '100%', accentColor: '#7c3aed' }} />
          </div>
        </>
      )}
    </div>
  );

  const renderTextPanel = () => (
    <div>
      <PanelSection title="Presets de texto" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
        {[
          { label: 'Minimal', text: 'Tu historia aquí', style: 'normal' as const, animIn: 'slide-up' },
          { label: 'CapCut', text: 'WORD BY WORD', style: 'capcut' as const, animIn: 'word-by-word' },
          { label: 'Neon', text: 'NEON VIBES', style: 'neon' as const, animIn: 'zoom-punch', color: '#06b6d4' },
          { label: 'Gradient', text: 'Gradient Text', style: 'gradient' as const, animIn: 'split-reveal' },
          { label: 'Big Bold', text: 'BIG IMPACT', style: 'normal' as const, animIn: 'bounce-stack', color: '#f59e0b', size: 96 },
          { label: 'Glitch', text: 'GLITCH MODE', style: 'glitch' as const, animIn: 'glitch-appear' },
          { label: 'Rainbow', text: 'Rainbow Text', style: 'rainbow' as const, animIn: 'fade-in' },
          { label: '3D', text: '3D SHADOW', style: '3d-shadow' as const, animIn: 'zoom-punch' },
        ].map(preset => (
          <button key={preset.label} onClick={() => {
            layerCounter.current++;
            addLayer({
              id: layerCounter.current, type: 'text', name: preset.label,
              text: preset.text, font: 'Inter', size: (preset as { size?: number }).size ?? 72, weight: 800,
              color: (preset as { color?: string }).color ?? '#ffffff', style: preset.style,
              animIn: preset.animIn, animOut: 'fade-in',
              x: 50, y: 50, startSec: 0, endSec: durationSec,
              letterSpacing: 0, lineHeight: 1.2, uppercase: false,
            });
          }}
            style={{ padding: '5px 10px', borderRadius: 100, border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.08)', color: '#a78bfa', fontSize: 10, cursor: 'pointer', fontFamily: 'monospace' }}>
            {preset.label}
          </button>
        ))}
      </div>
      <PanelSection title="Animaciones kinetic" />
      <ChipGrid items={KINETIC_ANIMS} selected="" onSelect={() => {}} />
      <button onClick={addTextLayer} style={{ width: '100%', padding: 9, border: '1px dashed rgba(124,58,237,0.3)', borderRadius: 8, background: 'transparent', color: '#7c3aed', fontSize: 11, cursor: 'pointer', marginTop: 8 }}>+ Agregar capa de texto</button>
    </div>
  );

  const renderImagesPanel = () => (
    <div>
      <PanelSection title="Modo de imágenes" />
      <SelectField label="Comportamiento" value="slideshow" onChange={() => {}}
        options={[{ value: 'single', label: 'Imagen individual' }, { value: 'slideshow', label: 'Slideshow automático' }, { value: 'ken-burns', label: 'Ken Burns animado' }, { value: 'parallax', label: 'Parallax scroll' }, { value: 'split', label: 'Split screen' }]} />
      <PanelSection title="Transición entre slides" />
      <ChipGrid items={TRANSITIONS} selected={transition} onSelect={setTransition} />
      <button onClick={addImageLayer} style={{ width: '100%', padding: 9, border: '1px dashed rgba(6,182,212,0.3)', borderRadius: 8, background: 'transparent', color: '#06b6d4', fontSize: 11, cursor: 'pointer', marginTop: 8 }}>+ Agregar imagen</button>
    </div>
  );

  const renderEffectsPanel = () => (
    <div>
      <PanelSection title="Filtros cinematográficos" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 12 }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setColorFilter(f.id)}
            style={{ padding: '7px 4px', borderRadius: 8, border: `1px solid ${colorFilter === f.id ? '#7c3aed' : 'rgba(124,58,237,0.12)'}`, background: colorFilter === f.id ? 'rgba(124,58,237,0.15)' : 'rgba(15,15,30,0.6)', color: colorFilter === f.id ? '#a78bfa' : '#606080', fontSize: 9, cursor: 'pointer', fontFamily: 'monospace', textAlign: 'center' }}>
            {f.label}
          </button>
        ))}
      </div>
      <PanelSection title="Partículas & Overlays" />
      <ChipGrid items={PARTICLES} selected={particles} onSelect={setParticles} />
      <PanelSection title="Overlays especiales" />
      <ToggleRow label="Vignette (sombra bordes)" checked={vignette} onChange={setVignette} />
      <ToggleRow label="Film grain (ruido)" checked={grain} onChange={setGrain} />
      <ToggleRow label="CRT Scanlines" checked={scanlines} onChange={setScanlines} />
      <PanelSection title="Intro / Outro" />
      <SelectField label="Intro" value={introType} onChange={setIntroType}
        options={[{ value: 'none', label: 'Sin intro' }, { value: 'fade', label: 'Fade from black' }, { value: 'zoom', label: 'Zoom desde centro' }, { value: 'glitch', label: 'Glitch burst' }, { value: 'wipe', label: 'Wipe horizontal' }]} />
      <SelectField label="Outro" value={outroType} onChange={setOutroType}
        options={[{ value: 'none', label: 'Sin outro' }, { value: 'fade', label: 'Fade to black' }, { value: 'zoom-out', label: 'Zoom out' }, { value: 'freeze', label: 'Freeze frame' }]} />
      <PanelSection title="Motion graphics" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5 }}>
        {MOTION_ELEMENTS.map(el => (
          <button key={el.id} onClick={() => addMotionLayer(el.id)}
            style={{ padding: '7px 6px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.12)', background: 'rgba(15,15,30,0.6)', color: '#606080', fontSize: 9, cursor: 'pointer', textAlign: 'center', fontFamily: 'monospace' }}>
            <span style={{ display: 'block', fontSize: 14 }}>{el.icon}</span>
            {el.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderCaptionsPanel = () => (
    <div>
      <ToggleRow label="Activar subtítulos" checked={captionsEnabled} onChange={setCaptionsEnabled} />
      <PanelSection title="Estilo" />
      <ChipGrid items={CAPTION_STYLES} selected={captionStyle} onSelect={setCaptionStyle} />
      <PanelSection title="Texto" />
      <div style={{ marginBottom: 10 }}>
        <label className="input-label">Transcripción (una línea = un segmento)</label>
        <textarea value={captionText} onChange={e => setCaptionText(e.target.value)} placeholder={'0.0-1.5: Hola mundo\n1.5-3.0: Esto es un ejemplo'} className="input-field" style={{ minHeight: 80, fontSize: 11, resize: 'vertical' }} />
      </div>
      <PanelSection title="Tipografía" />
      <SelectField label="Fuente" value={captionFont} onChange={setCaptionFont} options={TEXT_FONTS.map(f => ({ value: f, label: f }))} />
      <div style={{ marginBottom: 10 }}>
        <label className="input-label">Tamaño: {captionSize}px</label>
        <input type="range" min={24} max={120} value={captionSize} onChange={e => setCaptionSize(+e.target.value)} style={{ width: '100%', accentColor: '#7c3aed' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div><label className="input-label">Color texto</label><input type="color" value={captionColor} onChange={e => setCaptionColor(e.target.value)} style={{ width: '100%', height: 28, borderRadius: 6, border: '1px solid rgba(124,58,237,0.2)', cursor: 'pointer' }} /></div>
        <div><label className="input-label">Color highlight</label><input type="color" value={captionHlColor} onChange={e => setCaptionHlColor(e.target.value)} style={{ width: '100%', height: 28, borderRadius: 6, border: '1px solid rgba(124,58,237,0.2)', cursor: 'pointer' }} /></div>
      </div>
      <SelectField label="Posición" value={captionPos} onChange={v => setCaptionPos(v as typeof captionPos)}
        options={[{ value: 'top', label: 'Arriba' }, { value: 'center', label: 'Centro' }, { value: 'bottom', label: 'Abajo' }]} />
      <ToggleRow label="Fondo detrás del texto" checked={captionBg} onChange={setCaptionBg} />
    </div>
  );

  const renderAudioPanel = () => (
    <div>
      <PanelSection title="Narración TTS" />
      <ToggleRow label="Activar voz en off" checked={ttsEnabled} onChange={setTtsEnabled} />
      <div style={{ marginBottom: 10 }}>
        <label className="input-label">Texto de narración</label>
        <textarea value={ttsText} onChange={e => setTtsText(e.target.value)} placeholder="Escribe el texto que narrará la IA..." className="input-field" style={{ minHeight: 80, fontSize: 12, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button onClick={improveNarration} style={{ flex: 1, padding: '7px', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, background: 'rgba(124,58,237,0.1)', color: '#a78bfa', fontSize: 11, cursor: 'pointer' }}>✨ Mejorar con IA</button>
      </div>
      <SelectField label="Voz" value={ttsVoice} onChange={setTtsVoice}
        options={[{ value: '', label: 'Selecciona una voz' }, ...voices.map(v => ({ value: v.id, label: v.label }))]} />
      <PanelSection title="Música de fondo" />
      <ToggleRow label="Música generada por IA (Suno)" checked={musicEnabled} onChange={setMusicEnabled} />
      <SelectField label="Estilo musical" value={musicStyle} onChange={setMusicStyle}
        options={[{ value: 'upbeat', label: '⚡ Upbeat / Energético' }, { value: 'calm', label: '🌊 Calm / Tranquilo' }, { value: 'corporate', label: '💼 Corporate / Profesional' }, { value: 'cinematic', label: '🎬 Cinematic / Épico' }, { value: 'lofi', label: '🎧 Lo-Fi / Relajante' }, { value: 'trap', label: '🔥 Trap / Hip-Hop' }]} />
    </div>
  );

  const renderExportPanel = () => (
    <div>
      <PanelSection title="Configuración de exportación" />
      <SelectField label="Formato" value={outputFormat} onChange={setOutputFormat}
        options={[{ value: 'mp4', label: '📹 MP4 — H.264' }, { value: 'mp4-h265', label: '📹 MP4 — H.265 (HEVC)' }, { value: 'webm', label: '🌐 WebM — VP9' }]} />
      <SelectField label="Resolución" value={resolution} onChange={setResolution}
        options={[{ value: '720p', label: '720p — HD (rápido)' }, { value: '1080p', label: '1080p — Full HD' }, { value: '4k', label: '4K — Ultra HD (lento)' }]} />
      <SelectField label="FPS salida" value={String(fps)} onChange={v => setFps(+v)}
        options={[{ value: '24', label: '24fps' }, { value: '30', label: '30fps' }, { value: '60', label: '60fps' }]} />
      <div style={{ marginBottom: 10 }}>
        <label className="input-label">Calidad (CRF): {quality} — {quality <= 18 ? 'Alta' : quality <= 23 ? 'Media' : 'Comprimida'}</label>
        <input type="range" min={12} max={35} value={quality} onChange={e => setQuality(+e.target.value)} style={{ width: '100%', accentColor: '#7c3aed' }} />
      </div>
      <div style={{ height: 1, background: 'rgba(124,58,237,0.1)', margin: '12px 0' }} />
      <PanelSection title="Renderizado rápido" />
      <ToggleRow label="TTS activado" checked={ttsEnabled} onChange={setTtsEnabled} />
      <ToggleRow label="Música IA" checked={musicEnabled} onChange={setMusicEnabled} />
      <ToggleRow label="Subtítulos" checked={captionsEnabled} onChange={setCaptionsEnabled} />
    </div>
  );

  // ── Right panel (render / export)
  const renderRightPanel = () => (
    <div style={{ width: 280, flexShrink: 0, background: 'rgba(10,10,20,0.95)', borderLeft: '1px solid rgba(124,58,237,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(124,58,237,0.1)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--head, Inter)', fontSize: 14, fontWeight: 700, color: '#f0f0ff', marginBottom: 2 }}>📹 Exportar Video</div>
        <div style={{ fontSize: 10, color: '#404060', fontFamily: 'monospace' }}>{FORMATS[format].w}×{FORMATS[format].h} · {fps}fps · {durationSec}s</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {/* Credit cost */}
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#a0a0c0', marginBottom: 6, fontFamily: 'monospace' }}>Costo estimado:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#c0c0e0' }}><span>Base (render)</span><span style={{ color: '#a78bfa', fontWeight: 700 }}>3 créditos</span></div>
            {musicEnabled && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#c0c0e0' }}><span>Música IA</span><span style={{ color: '#f59e0b', fontWeight: 700 }}>+3 créditos</span></div>}
            <div style={{ height: 1, background: 'rgba(124,58,237,0.1)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}><span style={{ color: '#f0f0ff' }}>Total</span><span style={{ color: '#06b6d4' }}>{3 + (musicEnabled ? 3 : 0)} créditos</span></div>
          </div>
        </div>

        {/* Render button */}
        <button onClick={handleRender} disabled={isRendering}
          className="btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 700, cursor: isRendering ? 'not-allowed' : 'pointer', opacity: isRendering ? 0.7 : 1, marginBottom: 12 }}>
          {isRendering ? '⏳ Renderizando...' : '✦ Renderizar MP4'}
        </button>

        {/* Progress */}
        {isRendering && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#606080', marginBottom: 6, fontFamily: 'monospace' }}>
              <span>{renderStatus}</span>
              <span>{renderProgress}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(124,58,237,0.1)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${renderProgress}%`, background: 'linear-gradient(90deg, #7c3aed, #06b6d4)', borderRadius: 2, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )}

        {/* Export settings summary */}
        <div style={{ fontSize: 10, color: '#404060', marginBottom: 10, fontFamily: 'monospace' }}>Configuración:</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
          {[
            ['Formato', outputFormat.toUpperCase()],
            ['Resolución', resolution],
            ['FPS', `${fps}fps`],
            ['Calidad', `CRF ${quality}`],
            ['TTS', ttsEnabled ? (ttsVoice || 'Sin voz') : 'Desactivado'],
            ['Música', musicEnabled ? musicStyle : 'Sin música'],
            ['Subtítulos', captionsEnabled ? captionStyle : 'Sin subtítulos'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '3px 0', borderBottom: '1px solid rgba(124,58,237,0.06)' }}>
              <span style={{ color: '#606080', fontFamily: 'monospace' }}>{k}</span>
              <span style={{ color: '#a0a0c0', fontFamily: 'monospace' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* History */}
        {renderJobs.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: '#404060', marginBottom: 8, fontFamily: 'monospace' }}>Historial de renders:</div>
            {renderJobs.map(job => (
              <div key={job.id} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(15,15,30,0.6)', border: '1px solid rgba(124,58,237,0.1)', marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: '#a0a0c0', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{job.name}</span>
                  <span style={{ fontSize: 9, color: job.status === 'ready' ? '#10b981' : job.status === 'failed' ? '#ef4444' : '#f59e0b', fontFamily: 'monospace' }}>
                    {job.status === 'ready' ? '✅ Listo' : job.status === 'failed' ? '❌ Error' : `🔄 ${job.progress}%`}
                  </span>
                </div>
                {job.status === 'processing' && (
                  <div style={{ height: 2, background: 'rgba(124,58,237,0.1)', borderRadius: 1 }}>
                    <div style={{ height: '100%', width: `${job.progress}%`, background: '#7c3aed', borderRadius: 1, transition: 'width 0.5s' }} />
                  </div>
                )}
                {job.status === 'ready' && job.url && (
                  <a href={job.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#7c3aed', textDecoration: 'none', fontFamily: 'monospace' }}>⬇ Descargar</a>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );

  // ── Format time
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1);
    return `${m}:${s.padStart(4, '0')}`;
  };

  // ── Main render
  return (
    <div style={{ position: 'fixed', inset: 0, marginLeft: 260, background: '#06060f', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 30 }}>

      {/* ── Topbar ─────────────────────────────────────────────────────── */}
      <div style={{ height: 48, background: 'rgba(10,10,20,0.95)', borderBottom: '1px solid rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0, padding: '0 16px 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderRight: '1px solid rgba(124,58,237,0.1)', height: '100%', flexShrink: 0 }}>
          <span style={{ fontSize: 14 }}>✂️</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#e0d4ff', letterSpacing: '-0.3px' }}>Editor de Video</span>
        </div>
        <div style={{ display: 'flex', gap: 2, padding: '0 12px' }}>
          {(['compose', 'effects', 'export'] as const).map(tab => (
            <button key={tab} onClick={() => setTopTab(tab)}
              style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11, color: topTab === tab ? '#a78bfa' : '#606080', background: topTab === tab ? 'rgba(124,58,237,0.12)' : 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '0.3px', transition: 'all 0.15s' }}>
              {tab === 'compose' ? 'Componer' : tab === 'effects' ? 'Efectos' : 'Exportar'}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#404060', fontFamily: 'monospace' }}>{FORMATS[format].w}×{FORMATS[format].h} · {fps}fps</span>
          <button onClick={handleRender} disabled={isRendering}
            className="btn-primary"
            style={{ padding: '6px 16px', fontSize: 11, cursor: isRendering ? 'not-allowed' : 'pointer', opacity: isRendering ? 0.7 : 1 }}>
            {isRendering ? '⏳ Renderizando...' : `✦ Renderizar MP4 · ${3 + (musicEnabled ? 3 : 0)} créditos`}
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Icon rail */}
        <div style={{ width: 52, flexShrink: 0, background: 'rgba(10,10,20,0.95)', borderRight: '1px solid rgba(124,58,237,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', gap: 4 }}>
          {topTab === 'compose' && [
            { id: 'layers', icon: '≡', tip: 'Capas' },
            { id: 'format', icon: '⬛', tip: 'Formato' },
            { id: 'text',   icon: 'T',  tip: 'Texto' },
            { id: 'images', icon: '🖼', tip: 'Imágenes' },
            { id: 'sep' },
            { id: 'captions', icon: '💬', tip: 'Subtítulos' },
            { id: 'audio',    icon: '🎵', tip: 'Audio' },
          ].map((item, i) => {
            if (item.id === 'sep') return <div key={i} style={{ width: 28, height: 1, background: 'rgba(124,58,237,0.1)', margin: '4px 0' }} />;
            return (
              <button key={item.id} onClick={() => setActivePanel(item.id)}
                title={item.tip}
                style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer', border: `1px solid ${activePanel === item.id ? 'rgba(124,58,237,0.4)' : 'transparent'}`, background: activePanel === item.id ? 'rgba(124,58,237,0.15)' : 'none', color: activePanel === item.id ? '#a78bfa' : '#606080', transition: 'all 0.15s' }}>
                {item.icon}
              </button>
            );
          })}
        </div>

        {/* Context panel */}
        <div style={{ width: 280, flexShrink: 0, background: 'rgba(10,10,20,0.95)', borderRight: '1px solid rgba(124,58,237,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(124,58,237,0.1)', flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0ff' }}>
              {topTab === 'effects' ? '✦ Efectos Visuales' : topTab === 'export' ? '📤 Exportar' : activePanel === 'layers' ? '≡ Capas' : activePanel === 'format' ? '⬛ Formato & Canvas' : activePanel === 'text' ? 'T Texto' : activePanel === 'images' ? '🖼 Imágenes' : activePanel === 'captions' ? '💬 Subtítulos' : '🎵 Audio'}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.15) transparent' }}>
            {renderPanelContent()}
          </div>
        </div>

        {/* Canvas stage */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {/* Dot grid bg */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(124,58,237,0.12) 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />

          {/* Canvas preview */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, padding: 24, overflow: 'hidden' }}>
            <div ref={canvasRef}
              style={{ width: previewW, height: previewH, position: 'relative', overflow: 'hidden', borderRadius: 6, boxShadow: '0 32px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(124,58,237,0.15)', flexShrink: 0, filter: filterCss, ...getBgStyle() }}>

              {/* Image layers */}
              {(layers.filter(l => l.type === 'img') as ImageLayer[]).map((l, i) => {
                const visible = currentFrame >= l.startSec * fps && currentFrame <= l.endSec * fps;
                if (!visible) return null;
                const bg = ['#1a1a3e', '#1a2a1a', '#3a1a1a', '#2a1a3a'][i % 4];
                return (
                  <div key={l.id} style={{ position: 'absolute', inset: 0, background: l.file ? undefined : bg, opacity: l.opacity / 100, borderRadius: l.radius * scale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setSelectedId(l.id)}>
                    {!l.file && <span style={{ fontSize: 11 * scale, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{l.name}</span>}
                  </div>
                );
              })}

              {/* Text layers */}
              {(layers.filter(l => l.type === 'text') as TextLayer[]).map(l => {
                const visible = currentFrame >= l.startSec * fps && currentFrame <= l.endSec * fps;
                if (!visible) return null;
                return (
                  <div key={l.id} style={getTextStyle(l)} onClick={() => setSelectedId(l.id)}>
                    {l.text}
                  </div>
                );
              })}

              {/* Motion layers */}
              {(layers.filter(l => l.type === 'motion') as MotionLayer[]).map(l => {
                const visible = currentFrame >= l.startSec * fps && currentFrame <= l.endSec * fps;
                if (!visible) return null;
                return renderMotion(l);
              })}

              {/* Captions preview */}
              {captionsEnabled && (
                <div style={{ position: 'absolute', [captionPos === 'top' ? 'top' : captionPos === 'center' ? 'top' : 'bottom']: captionPos === 'top' ? '8%' : captionPos === 'center' ? '45%' : '10%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', zIndex: 10 }}>
                  <span style={{ fontFamily: `'${captionFont}', sans-serif`, fontSize: captionSize * scale, fontWeight: 900, color: captionColor, background: captionBg ? 'rgba(0,0,0,0.6)' : 'none', padding: captionBg ? `${4 * scale}px ${10 * scale}px` : 0, borderRadius: 6, display: 'inline-block' }}>
                    {captionText.split('\n')[Math.floor(currentFrame / (fps * 1.5)) % Math.max(1, captionText.split('\n').length)] || 'Subtítulo'}
                  </span>
                </div>
              )}

              {/* FX overlays */}
              {(vignette || grain || scanlines) && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 19, boxShadow: vignette ? 'inset 0 0 80px rgba(0,0,0,0.7)' : 'none', backgroundImage: scanlines ? 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)' : 'none', opacity: grain ? 0.4 : 1 }} />
              )}

              {/* Selected layer indicator */}
              {selectedId && <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(124,58,237,0.5)', borderRadius: 6, pointerEvents: 'none', zIndex: 20 }} />}
            </div>
          </div>

          {/* ── Timeline ─────────────────────────────────────────────── */}
          <div style={{ height: 120, borderTop: '1px solid rgba(124,58,237,0.1)', background: 'rgba(10,10,20,0.95)', flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '0 16px' }}>
            {/* Transport */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 44 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[['⏮', () => setCurrentFrame(0)], ['⏪', () => setCurrentFrame(Math.max(0, currentFrame - fps))], [playing ? '⏸' : '▶', () => setPlaying(p => !p)], ['⏩', () => setCurrentFrame(Math.min(totalFrames, currentFrame + fps))], ['⏭', () => setCurrentFrame(totalFrames)]].map(([icon, fn], i) => (
                  <button key={i} onClick={fn as () => void}
                    style={{ width: 28, height: 28, borderRadius: 6, background: (icon === '⏸' || (icon === '▶' && !playing)) && i === 2 && playing ? '#7c3aed' : 'rgba(20,20,40,0.8)', border: '1px solid rgba(124,58,237,0.15)', color: '#a0a0c0', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon as string}
                  </button>
                ))}
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#606080' }}>{formatTime(currentFrame / fps)} / {formatTime(durationSec)}</span>
              <div style={{ flex: 1, position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, top: '50%', transform: 'translateY(-50%)', height: 3, background: 'rgba(124,58,237,0.1)', borderRadius: 2 }} />
                <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', height: 3, width: `${(currentFrame / totalFrames) * 100}%`, background: 'linear-gradient(90deg, #7c3aed, #06b6d4)', borderRadius: 2, boxShadow: '0 0 8px rgba(124,58,237,0.5)' }} />
                <input type="range" min={0} max={totalFrames} value={currentFrame} onChange={e => setCurrentFrame(+e.target.value)}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#606080', fontFamily: 'monospace' }}>
                <span>Zoom:</span>
                <input type="range" min={1} max={4} value={timelineZoom} step={0.5} onChange={e => setTimelineZoom(+e.target.value)} style={{ width: 60, accentColor: '#7c3aed' }} />
              </div>
            </div>

            {/* Tracks */}
            <div ref={tlRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', paddingBottom: 8, userSelect: 'none' }}>
              {layers.length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#404060', fontSize: 11, fontFamily: 'monospace' }}>
                  Agrega capas para verlas aquí
                </div>
              )}
              {layers.map((l, i) => {
                const tl = l as TextLayer;
                const left = (tl.startSec / durationSec) * 100;
                const width = Math.max(1, ((tl.endSec - tl.startSec) / durationSec) * 100);
                const color = getLayerTrackColor(l.type);
                const top = 4 + i * 20;
                return (
                  <div key={l.id}
                    style={{ position: 'absolute', top, height: 16, left: `${left}%`, width: `${width}%`, background: `${color}33`, border: `1px solid ${selectedId === l.id ? color : `${color}55`}`, borderRadius: 3, display: 'flex', alignItems: 'center', overflow: 'hidden', cursor: 'grab' }}
                    onMouseDown={e => onClipMouseDown(e, l.id, 'move')}
                    onClick={() => setSelectedId(l.id)}>
                    {/* Left resize handle */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, cursor: 'ew-resize', background: `${color}88` }}
                      onMouseDown={e => { e.stopPropagation(); onClipMouseDown(e, l.id, 'resize-start'); }} />
                    <span style={{ fontSize: 9, color, fontFamily: 'monospace', paddingLeft: 8, paddingRight: 4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', pointerEvents: 'none' }}>{l.name}</span>
                    {/* Right resize handle */}
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 5, cursor: 'ew-resize', background: `${color}88` }}
                      onMouseDown={e => { e.stopPropagation(); onClipMouseDown(e, l.id, 'resize-end'); }} />
                  </div>
                );
              })}
              {/* Scrubber line */}
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(currentFrame / totalFrames) * 100}%`, width: 1, background: '#7c3aed', pointerEvents: 'none', boxShadow: '0 0 4px rgba(124,58,237,0.8)' }} />
            </div>
          </div>
        </div>

        {/* Right panel */}
        {renderRightPanel()}
      </div>

      {/* ── Status bar ─────────────────────────────────────────────────── */}
      <div style={{ height: 24, background: 'rgba(8,8,16,0.95)', borderTop: '1px solid rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16, flexShrink: 0, fontFamily: 'monospace', fontSize: 10, color: '#404060' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
          <span>Listo</span>
        </div>
        <span>{FORMATS[format].w} × {FORMATS[format].h}</span>
        <span>{fps}fps</span>
        <span>{durationSec}s · {totalFrames}f</span>
        <span>{layers.length} capa{layers.length !== 1 ? 's' : ''}</span>
        <span style={{ marginLeft: 'auto' }}>Syndra Editor v1.0 · Remotion v4</span>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, right: 24, background: 'rgba(15,15,30,0.95)', border: '1px solid rgba(6,182,212,0.4)', color: '#06b6d4', padding: '9px 16px', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, zIndex: 999, boxShadow: '0 4px 24px rgba(0,0,0,0.5)', animation: 'fadeInUp 0.3s ease' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
