import { Package, TrendingDown, TrendingUp } from "lucide-react";

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  negative = false,
}: {
  title: string;
  value: string;
  change: string;
  icon: typeof Package;
  color: string;
  negative?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-blue-100 bg-white p-4 shadow-sm shadow-slate-100/70">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${color}`}
      >
        <Icon size={23} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-600">{title}</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <span
            className={`flex items-center gap-0.5 whitespace-nowrap text-xs font-semibold ${
              negative ? "text-red-500" : "text-emerald-600"
            }`}
          >
            {negative ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
            {change}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-slate-400">vs. last week</p>
      </div>
    </div>
  );
}
