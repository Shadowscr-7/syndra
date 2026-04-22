import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';

interface TechGridProps {
  accentColor?: string;
  opacity?: number;
}

/**
 * Decorative SVG tech background: dot grid, circuit traces, corner brackets,
 * and subtle hex nodes — all static for reliable still export.
 */
export const TechGrid: React.FC<TechGridProps> = ({
  accentColor = '#00D4FF',
  opacity = 0.8,
}) => {
  const { width, height } = useVideoConfig();
  const a = accentColor;
  const mid = `${a}44`;
  const dim = `${a}18`;

  // dot grid every 80px
  const dots: React.ReactNode[] = [];
  for (let x = 80; x < width; x += 80) {
    for (let y = 80; y < height; y += 80) {
      dots.push(<circle key={`d-${x}-${y}`} cx={x} cy={y} r={1.5} fill={mid} />);
    }
  }

  // hex nodes at strategic points (proportional to video size)
  const hexRatios = [
    [0.15, 0.17], [0.85, 0.25], [0.19, 0.42], [0.81, 0.5],
    [0.5, 0.29], [0.13, 0.73], [0.87, 0.68], [0.5, 0.57],
    [0.24, 0.89], [0.76, 0.86],
  ];

  const hexNodes = hexRatios.map(([rx, ry]) => [Math.round(rx! * width), Math.round(ry! * height)]);

  const Hex = ({ cx, cy, r = 14 }: { cx: number; cy: number; r?: number }) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
    return (
      <>
        <polygon points={pts} fill={dim} stroke={mid} strokeWidth={1.2} />
        <circle cx={cx} cy={cy} r={3} fill={a} opacity={0.7} />
      </>
    );
  };

  // corner brackets
  const br = 28;
  const corners = [
    // top-left
    `M ${br} 24 L 24 24 L 24 ${br}`,
    // top-right
    `M ${width - br} 24 L ${width - 24} 24 L ${width - 24} ${br}`,
    // bottom-left
    `M ${br} ${height - 24} L 24 ${height - 24} L 24 ${height - br}`,
    // bottom-right
    `M ${width - br} ${height - 24} L ${width - 24} ${height - 24} L ${width - 24} ${height - br}`,
  ];

  // circuit traces
  const traces = [
    `M 24 ${Math.round(height * 0.3)} L ${Math.round(width * 0.18)} ${Math.round(height * 0.3)} L ${Math.round(width * 0.22)} ${Math.round(height * 0.26)}`,
    `M ${width - 24} ${Math.round(height * 0.45)} L ${Math.round(width * 0.82)} ${Math.round(height * 0.45)} L ${Math.round(width * 0.78)} ${Math.round(height * 0.49)}`,
    `M ${Math.round(width * 0.5)} 24 L ${Math.round(width * 0.5)} ${Math.round(height * 0.08)}`,
    `M ${Math.round(width * 0.5)} ${height - 24} L ${Math.round(width * 0.5)} ${height - Math.round(height * 0.08)}`,
  ];

  return (
    <AbsoluteFill style={{ opacity, pointerEvents: 'none' }}>
      <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg">
        {/* dot grid */}
        {dots}
        {/* hex nodes */}
        {hexNodes.map(([cx, cy], i) => <Hex key={i} cx={cx!} cy={cy!} />)}
        {/* corner brackets */}
        {corners.map((d, i) => (
          <path key={i} d={d} stroke={`${a}88`} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        ))}
        {/* circuit traces */}
        {traces.map((d, i) => (
          <path key={i} d={d} stroke={`${a}55`} strokeWidth={1.5} fill="none" strokeLinecap="round" />
        ))}
        {/* center cross-hair subtle */}
        <circle cx={width / 2} cy={height / 2} r={6} fill="none" stroke={`${a}33`} strokeWidth={1} />
        <line x1={width / 2 - 14} y1={height / 2} x2={width / 2 + 14} y2={height / 2} stroke={`${a}33`} strokeWidth={1} />
        <line x1={width / 2} y1={height / 2 - 14} x2={width / 2} y2={height / 2 + 14} stroke={`${a}33`} strokeWidth={1} />
      </svg>
    </AbsoluteFill>
  );
};
