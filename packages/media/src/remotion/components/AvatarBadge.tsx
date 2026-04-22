import React from 'react';

interface AvatarBadgeProps {
  size?: number;
  style?: React.CSSProperties;
  accentColor?: string;
  label?: string;
}

/**
 * Inline SVG anime-style AI avatar — no external assets needed.
 * Renders a tech character with big anime eyes, circuit details, and a
 * double-ring frame in the palette accent color.
 */
export const AvatarBadge: React.FC<AvatarBadgeProps> = ({
  size = 200,
  style,
  accentColor = '#00D4FF',
  label = '@syndra',
}) => {
  const a = accentColor;

  return (
    <div style={{ width: size, height: size, ...style }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 220 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── outer glow ring ── */}
        <circle cx={110} cy={110} r={106} fill={`${a}12`} stroke={`${a}55`} strokeWidth={1.5} />
        {/* ── dashed middle ring ── */}
        <circle cx={110} cy={110} r={100} fill="none" stroke={a} strokeWidth={1.5} strokeDasharray="6 5" />
        {/* ── inner background ── */}
        <circle cx={110} cy={110} r={92} fill="#0A1628" />

        {/* ── face shape ── */}
        <ellipse cx={110} cy={116} rx={52} ry={58} fill="#0d1f35" />

        {/* ── hair / top element ── */}
        <path
          d="M 68 90 C 60 60 80 40 110 38 C 140 40 160 60 152 90"
          fill="#0a1a2a"
          stroke={`${a}66`}
          strokeWidth={1.5}
        />
        <path d="M 78 78 C 80 58 95 46 110 44" stroke={a} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
        <path d="M 82 86 C 86 68 98 54 112 50" stroke={a} strokeWidth={1} strokeLinecap="round" opacity={0.3} />

        {/* ── antenna ── */}
        <line x1={110} y1={38} x2={110} y2={20} stroke={a} strokeWidth={2} strokeLinecap="round" />
        <circle cx={110} cy={16} r={5} fill={a} />
        <circle cx={110} cy={16} r={9} fill="none" stroke={`${a}66`} strokeWidth={1} />

        {/* ── tech visor band ── */}
        <rect x={62} y={87} width={96} height={28} rx={5} fill={`${a}18`} stroke={`${a}55`} strokeWidth={1} />

        {/* ── LEFT EYE ── */}
        <ellipse cx={84} cy={101} rx={17} ry={17} fill="#061018" stroke={`${a}44`} strokeWidth={1} />
        <ellipse cx={84} cy={101} rx={13} ry={13} fill={`${a}28`} />
        <circle cx={84} cy={101} r={8} fill={a} />
        <circle cx={84} cy={101} r={4.5} fill="#061018" />
        <circle cx={79} cy={96} r={3} fill="white" opacity={0.9} />
        <circle cx={83} cy={107} r={1.5} fill="white" opacity={0.4} />
        <line x1={71} y1={91} x2={75} y2={94} stroke={a} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
        <line x1={84} y1={88} x2={84} y2={93} stroke={a} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
        <line x1={97} y1={91} x2={93} y2={94} stroke={a} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />

        {/* ── RIGHT EYE ── */}
        <ellipse cx={136} cy={101} rx={17} ry={17} fill="#061018" stroke={`${a}44`} strokeWidth={1} />
        <ellipse cx={136} cy={101} rx={13} ry={13} fill={`${a}28`} />
        <circle cx={136} cy={101} r={8} fill={a} />
        <circle cx={136} cy={101} r={4.5} fill="#061018" />
        <circle cx={131} cy={96} r={3} fill="white" opacity={0.9} />
        <circle cx={135} cy={107} r={1.5} fill="white" opacity={0.4} />
        <line x1={123} y1={91} x2={127} y2={94} stroke={a} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
        <line x1={136} y1={88} x2={136} y2={93} stroke={a} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
        <line x1={149} y1={91} x2={145} y2={94} stroke={a} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />

        {/* ── nose ── */}
        <path d="M 107 110 L 103 122 L 117 122" stroke={`${a}44`} strokeWidth={1.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />

        {/* ── mouth smile ── */}
        <path d="M 92 133 Q 110 145 128 133" stroke={a} strokeWidth={2} fill="none" strokeLinecap="round" />
        <path d="M 92 133 Q 110 143 128 133" fill={`${a}22`} />

        {/* ── cheek circuit traces ── */}
        <line x1={62} y1={108} x2={48} y2={108} stroke={a} strokeWidth={1.5} opacity={0.7} />
        <circle cx={46} cy={108} r={2.5} fill={a} opacity={0.8} />
        <line x1={46} y1={108} x2={46} y2={96} stroke={a} strokeWidth={1} opacity={0.5} />
        <circle cx={46} cy={94} r={1.5} fill={a} opacity={0.6} />
        <line x1={46} y1={108} x2={38} y2={116} stroke={a} strokeWidth={1} opacity={0.4} />
        <line x1={158} y1={108} x2={172} y2={108} stroke={a} strokeWidth={1.5} opacity={0.7} />
        <circle cx={174} cy={108} r={2.5} fill={a} opacity={0.8} />
        <line x1={174} y1={108} x2={174} y2={96} stroke={a} strokeWidth={1} opacity={0.5} />
        <circle cx={174} cy={94} r={1.5} fill={a} opacity={0.6} />
        <line x1={174} y1={108} x2={182} y2={116} stroke={a} strokeWidth={1} opacity={0.4} />

        {/* ── neck + collar ── */}
        <rect x={96} y={168} width={28} height={18} rx={3} fill="#0d1f35" stroke={`${a}44`} strokeWidth={1} />
        <line x1={102} y1={172} x2={102} y2={182} stroke={`${a}66`} strokeWidth={1} />
        <line x1={110} y1={170} x2={110} y2={184} stroke={a} strokeWidth={1.5} opacity={0.6} />
        <line x1={118} y1={172} x2={118} y2={182} stroke={`${a}66`} strokeWidth={1} />

        {/* ── label badge at bottom ── */}
        <rect x={50} y={186} width={120} height={22} rx={5} fill={`${a}22`} stroke={a} strokeWidth={1} />
        <text
          x={110}
          y={201}
          textAnchor="middle"
          fill={a}
          fontSize={11}
          fontFamily="monospace, sans-serif"
          fontWeight="bold"
          letterSpacing={1}
        >
          {label}
        </text>
      </svg>
    </div>
  );
};
