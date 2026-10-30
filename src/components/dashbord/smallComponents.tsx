export function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </h2>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${accent}`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}


export function statusStyle(status = "") {
  const value = status.toLowerCase();

  if (["delivered", "completed", "paid"].includes(value)) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (["cancelled", "failed", "refunded"].includes(value)) {
    return "bg-red-50 text-red-700";
  }

  if (["shipped", "processing"].includes(value)) {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-amber-50 text-amber-700";
}

export const money = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export const number = (value = 0) => new Intl.NumberFormat("en-IN").format(value);
 