import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

export interface GradientBackgroundProps {
  colors: string[];
  angle?: number;
  animateAngle?: boolean;
  animateSpeed?: number;
  type?: 'linear' | 'radial';
  style?: React.CSSProperties;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  colors,
  angle = 135,
  animateAngle = false,
  animateSpeed = 0.3,
  type = 'linear',
  style,
}) => {
  const frame = useCurrentFrame();
  const currentAngle = animateAngle ? angle + frame * animateSpeed : angle;
  const colorStops = colors
    .map((c, i) => `${c} ${(i / (colors.length - 1)) * 100}%`)
    .join(', ');
  const gradient =
    type === 'radial'
      ? `radial-gradient(circle, ${colorStops})`
      : `linear-gradient(${currentAngle}deg, ${colorStops})`;
  return <AbsoluteFill style={{ background: gradient, ...style }} />;
};
