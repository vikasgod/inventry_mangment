export function StatCard({
  title,
  value,
  label,
  icon,
  color,
}: {
  title: string;
  value: number;
  label: string;
  icon: React.ReactNode;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${colors[color]}`}
        >
          {icon}
        </div>

        <div>
          <p className="text-xs text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-[11px] text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
