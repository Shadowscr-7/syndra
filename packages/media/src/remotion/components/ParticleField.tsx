import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

export interface ParticleFieldProps {
  count?: number;
  color?: string;
  speed?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  style?: React.CSSProperties;
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  count = 45,
  color = 'rgba(255,255,255,0.35)',
  speed = 0.4,
  direction = 'up',
  style,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const particles = React.useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      x: seededRandom(i * 3 + 1) * width,
      y: seededRandom(i * 3 + 2) * height,
      size: 1.5 + seededRandom(i * 3 + 3) * 3,
      spd: 0.15 + seededRandom(i * 3 + 4) * 0.7,
      opacity: 0.15 + seededRandom(i * 3 + 5) * 0.5,
    })),
  [count, width, height]);

  return (
    <AbsoluteFill style={style}>
      <svg width={width} height={height}>
        {particles.map((p, i) => {
          const m = frame * p.spd * speed;
          let cx = p.x, cy = p.y;
          if (direction === 'up')    cy = ((p.y - m) % height + height) % height;
          if (direction === 'down')  cy = (p.y + m) % height;
          if (direction === 'left')  cx = ((p.x - m) % width + width) % width;
          if (direction === 'right') cx = (p.x + m) % width;
          return <circle key={i} cx={cx} cy={cy} r={p.size} fill={color} opacity={p.opacity} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};
