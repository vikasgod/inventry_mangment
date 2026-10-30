import React from "react";
import { money, number } from "./smallComponents";

function SalesChart({
  period,
  loading,
  monthlySales,
  maxSales,
  channelSales,
}: {
  peroid: any;
  loading: boolean;
  monthlySales: any;
  maxSales: any;
  channelSales: any;
}) {
  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Sales Overview</h2>
            <p className="mt-1 text-sm text-slate-500">
              Sales performance over time
            </p>
          </div>
          <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
            {period === "30days"
              ? "30 days"
              : period.replace("months", " months")}
          </span>
        </div>

        {loading ? (
          <div className="mt-8 h-56 animate-pulse rounded-xl bg-slate-100" />
        ) : monthlySales.length === 0 ? (
          <div className="mt-8 flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
            No sales data available for this period.
          </div>
        ) : (
          <div className="mt-8">
            <div className="flex h-56 items-end gap-3 border-b border-slate-100 px-1 sm:gap-5">
              {monthlySales.map((item, index) => {
                const height = Math.max(4, (item.sales / maxSales) * 100);

                return (
                  <div
                    key={`${item.month}-${index}`}
                    className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                  >
                    <span className="mb-2 hidden text-xs text-slate-500 group-hover:block">
                      {money(item.sales)}
                    </span>
                    <div
                      title={`${item.month}: ${money(item.sales)}`}
                      className="w-full max-w-12 rounded-t-lg bg-blue-500 transition-all duration-300 group-hover:bg-blue-700"
                      style={{ height: `${height}%` }}
                    />
                    <span className="mt-3 w-full truncate text-center text-xs text-slate-500">
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Hover over a bar to view its sales amount.
            </p>
          </div>
        )}
      </div>

      {/* Channels */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Sales by Channel</h2>
        <p className="mt-1 text-sm text-slate-500">Channel-wise revenue</p>

        {loading ? (
          <div className="mt-6 h-52 animate-pulse rounded-xl bg-slate-100" />
        ) : channelSales.length === 0 ? (
          <div className="mt-6 flex h-52 items-center justify-center text-center text-sm text-slate-500">
            No channel sales data available.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {channelSales.map((channel) => {
              const total = Math.max(
                1,
                ...channelSales.map((item) => item.sales),
              );
              const width = Math.min(100, (channel.sales / total) * 100);

              return (
                <div key={channel.channel}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700">
                      {channel.channel}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {money(channel.sales)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  {channel.orders !== undefined && (
                    <p className="mt-1 text-xs text-slate-400">
                      {number(channel.orders)} orders
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">
          Amazon, Flipkart and Meesho figures will appear when their order data
          is imported or synchronized.
        </p>
      </div>
    </section>
  );
}

export default SalesChart;
