import { BarChart3 } from "lucide-react";
import React from "react";
import { formatNumber } from "../dataType";

function Summary({
  warehouseTotals,
  totalStock,
  maxWarehouseStock,
}: {
  warehouseTotals: any;
  totalStock: number;
  maxWarehouseStock: number;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-blue-600" />
        <h2 className="font-bold text-slate-800">Inventory Summary</h2>
      </div>

      <div className="space-y-5">
        {warehouseTotals.map((row: any) => (
          <div key={row.name}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-600">{row.name}</span>
              <span className="font-semibold text-slate-700">
                {Math.round((row.count / Math.max(totalStock, 1)) * 100)}%
              </span>
            </div>
            <p className="mb-2 text-sm font-bold text-slate-800">
              {formatNumber(row.count)}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${(row.count / maxWarehouseStock) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-400">
        Based on current demo inventory quantities
      </p>
    </section>
  );
}

export default Summary;
