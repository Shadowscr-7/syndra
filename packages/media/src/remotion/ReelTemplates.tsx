/**
 * Reel Templates — Phase 4
 * Visual overlays that render on top of the base VideoComposition.
 * Each template targets a specific content type:
 *   product     → price badge, CTA bar, product name
 *   negocio     → brand bar top, professional title, logo prominent
 *   testimonial → quote marks, centered hero text, minimal style
 */

import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export type ReelTemplate = 'product' | 'negocio' | 'testimonial' | 'default';

// ── Product Template ───────────────────────────────────────────────────────────

export const ProductReelOverlay: React.FC<{
  accentColor: string;
  productName?: string;
  productPrice?: string;
  productCta?: string;
  logoUrl?: string;
}> = ({ accentColor, productName, productPrice, productCta = '¡Descubrí más!', logoUrl }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const spring1 = spring({ frame, fps, delay: 5,  config: { stiffness: 120, damping: 14, mass: 0.7 } });
  const spring2 = spring({ frame, fps, delay: 12, config: { stiffness: 100, damping: 14, mass: 0.8 } });
  const spring3 = spring({ frame, fps, delay: 20, config: { stiffness: 90,  damping: 14, mass: 0.9 } });

  const pulse = 0.88 + 0.12 * Math.sin(frame * 0.1);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Bottom brand gradient bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: Math.round(height * 0.28),
        background: `linear-gradient(0deg, ${accentColor}ee 0%, ${accentColor}88 40%, transparent 100%)`,
        zIndex: 10,
      }} />

      {/* Product name */}
      {productName && (
        <div style={{
          position: 'absolute',
          bottom: Math.round(height * 0.18),
          left: Math.round(width * 0.06),
          right: Math.round(width * 0.06),
          opacity: spring1,
          transform: `translateY(${interpolate(spring1, [0, 1], [30, 0])}px)`,
          zIndex: 11,
        }}>
          <span style={{
            color: '#fff',
            fontSize: Math.round(width * 0.065),
            fontWeight: 800,
            fontFamily: 'Impact, Arial Black, sans-serif',
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            letterSpacing: '0.02em',
            lineHeight: 1.15,
          }}>
            {productName}
          </span>
        </div>
      )}

      {/* Price badge */}
      {productPrice && (
        <div style={{
          position: 'absolute',
          bottom: Math.round(height * 0.09),
          left: Math.round(width * 0.06),
          opacity: spring2,
          transform: `scale(${spring2})`,
          zIndex: 11,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: Math.round(width * 0.025),
            padding: `${Math.round(height * 0.008)}px ${Math.round(width * 0.04)}px`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: Math.round(width * 0.015),
            boxShadow: `0 4px 20px ${accentColor}66`,
          }}>
            <span style={{ color: accentColor, fontSize: Math.round(width * 0.055), fontWeight: 900, fontFamily: 'Arial Black, sans-serif' }}>
              {productPrice}
            </span>
          </div>
        </div>
      )}

      {/* CTA button */}
      <div style={{
        position: 'absolute',
        bottom: Math.round(height * 0.025),
        left: Math.round(width * 0.06),
        right: Math.round(width * 0.06),
        opacity: spring3,
        transform: `translateY(${interpolate(spring3, [0, 1], [20, 0])}px)`,
        zIndex: 11,
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: Math.round(width * 0.02),
          padding: `${Math.round(height * 0.008)}px ${Math.round(width * 0.04)}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: '#fff', fontSize: Math.round(width * 0.038), fontWeight: 700, fontFamily: 'sans-serif' }}>
            {productCta}
          </span>
          <span style={{ color: '#fff', fontSize: Math.round(width * 0.04) }}>→</span>
        </div>
      </div>

      {/* Top-right logo */}
      {logoUrl && (
        <div style={{
          position: 'absolute',
          top: Math.round(width * 0.05),
          right: Math.round(width * 0.05),
          opacity: interpolate(frame, [5, 18], [0, 0.9], { extrapolateRight: 'clamp' }),
          zIndex: 12,
        }}>
          <Img src={logoUrl} style={{ width: Math.round(width * 0.15), height: Math.round(width * 0.15), objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }} />
        </div>
      )}

      {/* Pulsing accent dot (corner) */}
      <div style={{
        position: 'absolute', top: Math.round(width * 0.05), left: Math.round(width * 0.05),
        width: Math.round(width * 0.025), height: Math.round(width * 0.025),
        borderRadius: '50%', background: accentColor,
        opacity: 0.6 * pulse, zIndex: 12,
        boxShadow: `0 0 ${Math.round(width * 0.015)}px ${accentColor}`,
      }} />
    </AbsoluteFill>
  );
};

// ── Negocio (Business) Template ────────────────────────────────────────────────

export const NegocioReelOverlay: React.FC<{
  accentColor: string;
  brandName?: string;
  tagline?: string;
  logoUrl?: string;
}> = ({ accentColor, brandName, tagline, logoUrl }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const barSpring = spring({ frame, fps, config: { stiffness: 200, damping: 20 } });
  const contentSpring = spring({ frame, fps, delay: 8, config: { stiffness: 120, damping: 15, mass: 0.8 } });

  // Parse accent color for RGBA
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  };
  const rgb = hexToRgb(accentColor.startsWith('#') ? accentColor : '#7C3AED');

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Top brand bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: Math.round(height * 0.1),
        background: `linear-gradient(180deg, rgba(${rgb},0.85) 0%, rgba(${rgb},0) 100%)`,
        zIndex: 10,
        transform: `scaleY(${barSpring})`,
        transformOrigin: 'top',
      }} />

      {/* Brand name top-left */}
      {brandName && (
        <div style={{
          position: 'absolute',
          top: Math.round(height * 0.025),
          left: Math.round(width * 0.06),
          opacity: contentSpring,
          transform: `translateX(${interpolate(contentSpring, [0, 1], [-20, 0])}px)`,
          zIndex: 11,
        }}>
          <span style={{
            color: '#fff',
            fontSize: Math.round(width * 0.045),
            fontWeight: 800,
            fontFamily: 'sans-serif',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            textShadow: '0 1px 8px rgba(0,0,0,0.7)',
          }}>
            {brandName}
          </span>
        </div>
      )}

      {/* Logo top-right */}
      {logoUrl && (
        <div style={{
          position: 'absolute',
          top: Math.round(height * 0.015),
          right: Math.round(width * 0.05),
          opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateRight: 'clamp' }),
          zIndex: 11,
        }}>
          <Img src={logoUrl} style={{ width: Math.round(width * 0.13), height: Math.round(width * 0.08), objectFit: 'contain', filter: 'drop-shadow(0 1px 6px rgba(0,0,0,0.6))' }} />
        </div>
      )}

      {/* Bottom gradient + tagline */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: Math.round(height * 0.22),
        background: `linear-gradient(0deg, rgba(0,0,0,0.75) 0%, transparent 100%)`,
        zIndex: 10,
      }} />

      {tagline && (
        <div style={{
          position: 'absolute',
          bottom: Math.round(height * 0.06),
          left: Math.round(width * 0.06),
          right: Math.round(width * 0.06),
          opacity: contentSpring,
          transform: `translateY(${interpolate(contentSpring, [0, 1], [15, 0])}px)`,
          zIndex: 11,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: Math.round(width * 0.025),
          }}>
            <div style={{ width: Math.round(width * 0.012), height: Math.round(height * 0.025), background: accentColor, borderRadius: '2px', flexShrink: 0 }} />
            <span style={{
              color: '#fff',
              fontSize: Math.round(width * 0.038),
              fontWeight: 600,
              fontFamily: 'sans-serif',
              letterSpacing: '0.01em',
              textShadow: '0 1px 8px rgba(0,0,0,0.8)',
            }}>
              {tagline}
            </span>
          </div>
        </div>
      )}

      {/* Bottom accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: Math.round(height * 0.005),
        background: accentColor,
        opacity: 0.8, zIndex: 12,
        transform: `scaleX(${barSpring})`,
        transformOrigin: 'left',
      }} />
    </AbsoluteFill>
  );
};

// ── Testimonial Template ───────────────────────────────────────────────────────

export const TestimonialReelOverlay: React.FC<{
  accentColor: string;
  quote?: string;
  author?: string;
}> = ({ accentColor, quote, author }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const quoteSpring = spring({ frame, fps, delay: 10, config: { stiffness: 80, damping: 16, mass: 1.2 } });
  const authorSpring = spring({ frame, fps, delay: 22, config: { stiffness: 100, damping: 14, mass: 0.8 } });

  if (!quote) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Full overlay gradient for readability */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.35) 100%)',
        zIndex: 10,
      }} />

      {/* Giant quote mark top */}
      <div style={{
        position: 'absolute',
        top: Math.round(height * 0.08),
        left: Math.round(width * 0.06),
        opacity: interpolate(frame, [5, 20], [0, 0.25], { extrapolateRight: 'clamp' }),
        zIndex: 11,
        fontSize: Math.round(width * 0.35),
        color: accentColor,
        fontFamily: 'Georgia, serif',
        lineHeight: 0.8,
        fontWeight: 900,
      }}>
        "
      </div>

      {/* Center quote text */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: Math.round(width * 0.08),
        right: Math.round(width * 0.08),
        opacity: quoteSpring,
        transform: `translateY(calc(-50% + ${interpolate(quoteSpring, [0, 1], [30, 0])}px)) scale(${quoteSpring})`,
        zIndex: 11,
      }}>
        <p style={{
          color: '#fff',
          fontSize: Math.round(width * 0.052),
          fontWeight: 700,
          fontFamily: 'Georgia, Noto Sans, serif',
          lineHeight: 1.45,
          textAlign: 'center',
          textShadow: '0 2px 16px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.5)',
          letterSpacing: '0.01em',
        }}>
          "{quote}"
        </p>
      </div>

      {/* Author attribution */}
      {author && (
        <div style={{
          position: 'absolute',
          bottom: Math.round(height * 0.12),
          left: Math.round(width * 0.08),
          right: Math.round(width * 0.08),
          textAlign: 'center',
          opacity: authorSpring,
          transform: `translateY(${interpolate(authorSpring, [0, 1], [15, 0])}px)`,
          zIndex: 11,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Math.round(width * 0.02) }}>
            <div style={{ flex: 1, height: 1, background: `rgba(255,255,255,0.3)` }} />
            <span style={{ color: accentColor, fontSize: Math.round(width * 0.035), fontWeight: 600, fontFamily: 'sans-serif', letterSpacing: '0.06em' }}>
              {author}
            </span>
            <div style={{ flex: 1, height: 1, background: `rgba(255,255,255,0.3)` }} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
