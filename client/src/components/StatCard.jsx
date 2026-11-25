export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  progress,
  accent = 'neon',
  action,
}) {
  const accentClasses = {
    neon: 'text-[#39ff14] bg-[#39ff14]/10 border-[#39ff14]/25',
    amber: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
    sky: 'text-sky-400 bg-sky-400/10 border-sky-400/25',
    emerald: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
    purple: 'text-violet-400 bg-violet-400/10 border-violet-400/25',
  };

  const barColors = {
    neon: 'bg-[#39ff14]',
    amber: 'bg-amber-400',
    sky: 'bg-sky-400',
    emerald: 'bg-emerald-400',
    purple: 'bg-violet-400',
  };

  return (
    <div className="fitnex-card p-5 flex flex-col justify-between gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">{title}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 tabular-nums">{value}</p>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${accentClasses[accent] || accentClasses.neon}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {typeof progress === 'number' && (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColors[accent] || barColors.neon}`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
        <span>{subtitle}</span>
        {action}
      </div>
    </div>
  );
}
