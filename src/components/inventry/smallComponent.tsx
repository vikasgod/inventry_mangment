import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { formatNumber } from "../dataType";

export function SummaryCard({
  title,
  value,
  subtitle,
  change,
  positive,
  icon,
  tone,
}: {
  title: string;
  value: number;
  subtitle: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
  tone: "blue" | "teal" | "orange" | "rose";
}) {
  const tones = {
    blue: "bg-blue-100 text-blue-600",
    teal: "bg-teal-100 text-teal-600",
    orange: "bg-orange-100 text-orange-600",
    rose: "bg-rose-100 text-rose-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-full p-3 ${tones[tone]}`}>{icon}</div>
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold ${
            positive ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {positive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
          {change}
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
        {formatNumber(value)}
      </p>
      <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

export function FilterSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option, i) => (
          <option key={i + 1} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "In Stock": "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "Low Stock": "bg-amber-50 text-amber-700 ring-amber-200",
    "Out of Stock": "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
        styles[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function QuickAction({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-blue-50"
    >
      <span className="rounded-lg bg-blue-50 p-2 text-blue-600 group-hover:bg-blue-100">
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium text-slate-700">{title}</span>
      <ChevronRight
        size={16}
        className="text-slate-400 transition group-hover:translate-x-0.5"
      />
    </button>
  );
}

export function DetailBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {formatNumber(value)}
      </p>
    </div>
  );
}
