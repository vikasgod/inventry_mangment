import { Globe } from "lucide-react";
import { OrderStatus, statusStyles } from "../dataType";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

export function ChannelIcon({ channel }: { channel: string }) {
  const styles: Record<string, string> = {
    Website: "bg-blue-50 text-blue-600",
    Amazon: "bg-amber-50 text-slate-900",
    Flipkart: "bg-yellow-100 text-blue-700",
    Meesho: "bg-pink-50 text-pink-700",
  };

  const letter: Record<string, string> = {
    Amazon: "a",
    Flipkart: "f",
    Meesho: "m",
  };

  return (
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${styles[channel] || "bg-slate-100"}`}
    >
      {channel === "Website" ? <Globe size={14} /> : letter[channel] || "?"}
    </span>
  );
}

export function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-800">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

export function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 break-words text-xs leading-5 text-slate-700">
        {value || "—"}
      </p>
    </div>
  );
}

export function MoneyLine({
  label,
  value,
  green,
  strong,
}: {
  label: string;
  value: string;
  green?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-1 ${
        strong ? "text-sm font-bold text-slate-900" : "text-xs text-slate-500"
      }`}
    >
      <span>{label}</span>
      <span className={`${green ? "text-emerald-600" : ""}`}>{value}</span>
    </div>
  );
}
