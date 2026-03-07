interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  trend?: string;
  gradient?: string;
}

const gradients = [
  'stat-gradient-purple',
  'stat-gradient-cyan',
  'stat-gradient-green',
  'stat-gradient-amber',
];

export function StatCard({ title, value, icon, trend, gradient }: StatCardProps) {
  return (
    <div
      className={`glass-card p-5 border ${gradient ?? ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          {title}
        </span>
        <span className="text-2xl animate-float">{icon}</span>
      </div>
      <p className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>{value}</p>
      {trend && (
        <p className="text-xs mt-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>
          {trend}
        </p>
      )}
    </div>
  );
}
