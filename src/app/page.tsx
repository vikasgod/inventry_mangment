
"use client";

import { useCallback, useEffect, useState } from "react";

type Order = {
  _id: string;
  orderNumber?: string;
  customerName?: string;
  customer?: { name?: string };
  channel?: string;
  status?: string;
  totalAmount?: number;
  createdAt?: string;
};

type Product = {
  _id: string;
  name: string;
  sku?: string;
  stock?: number;
  quantity?: number;
  lowStockThreshold?: number;
};

type DashboardData = {
  totalProducts?: number;
  totalOrders?: number;
  totalRevenue?: number;
  lowStockCount?: number;
  monthlySales?: { month: string; sales: number }[];
  recentOrders?: Order[];
  lowStockProducts?: Product[];
  channelSales?: { channel: string; sales: number; orders?: number }[];
};

const money = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const number = (value = 0) =>
  new Intl.NumberFormat("en-IN").format(value);

function statusStyle(status = "") {
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

function StatCard({
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("6months");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard?period=${period}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Dashboard data load nahi hua.");
      }

      setData(result.data ?? result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kuch galat ho gaya. Dobara try karein."
      );
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const monthlySales = data?.monthlySales ?? [];
  const recentOrders = data?.recentOrders ?? [];
  const lowStockProducts = data?.lowStockProducts ?? [];
  const channelSales = data?.channelSales ?? [];

  const maxSales = Math.max(
    1,
    ...monthlySales.map((item) => item.sales)
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        {/* Header */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-600">
              BUSINESS OVERVIEW
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Apne products, orders, sales aur inventory ko ek jagah manage karein.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              aria-label="Sales period"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="30days">Last 30 days</option>
              <option value="3months">Last 3 months</option>
              <option value="6months">Last 6 months</option>
              <option value="12months">Last 12 months</option>
            </select>

            <button
              onClick={() => void loadDashboard()}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
        </header>

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center"
          >
            <p>{error}</p>
            <button
              onClick={() => void loadDashboard()}
              className="font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Products"
            value={loading ? "—" : number(data?.totalProducts)}
            subtitle="Products in your catalogue"
            icon="▦"
            accent="bg-blue-50 text-blue-700"
          />
          <StatCard
            title="Total Orders"
            value={loading ? "—" : number(data?.totalOrders)}
            subtitle="Orders recorded in the system"
            icon="▤"
            accent="bg-violet-50 text-violet-700"
          />
          <StatCard
            title="Total Revenue"
            value={loading ? "—" : money(data?.totalRevenue)}
            subtitle="Based on the dashboard API"
            icon="₹"
            accent="bg-emerald-50 text-emerald-700"
          />
          <StatCard
            title="Low Stock Items"
            value={loading ? "—" : number(data?.lowStockCount)}
            subtitle="Products that need replenishment"
            icon="⚠"
            accent="bg-orange-50 text-orange-700"
          />
        </section>

        {/* Sales chart + channels */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Sales Overview
                </h2>
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
                    const height = Math.max(
                      4,
                      (item.sales / maxSales) * 100
                    );

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
            <h2 className="text-lg font-bold text-slate-900">
              Sales by Channel
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Channel-wise revenue
            </p>

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
                    ...channelSales.map((item) => item.sales)
                  );
                  const width = Math.min(
                    100,
                    (channel.sales / total) * 100
                  );

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
              Amazon, Flipkart and Meesho figures will appear when their order
              data is imported or synchronized.
            </p>
          </div>
        </section>

        {/* Recent orders */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Recent Orders
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest orders across your channels
              </p>
            </div>
            <a
              href="/orders"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View all orders →
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Order ID</th>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Channel</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      Loading orders...
                    </td>
                  </tr>
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4 font-semibold text-blue-700">
                        {order.orderNumber ||
                          `#${order._id.slice(-6).toUpperCase()}`}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {order.customerName ||
                          order.customer?.name ||
                          "Customer"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {order.channel || "Website"}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString(
                              "en-IN"
                            )
                          : "—"}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {money(order.totalAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle(
                            order.status
                          )}`}
                        >
                          {order.status || "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Low stock */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Inventory Alerts
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Products that may need restocking
              </p>
            </div>
            <a
              href="/inventory"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Manage inventory →
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[550px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">SKU</th>
                  <th className="px-6 py-4 font-semibold">Available Stock</th>
                  <th className="px-6 py-4 font-semibold">Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center">
                      Loading inventory...
                    </td>
                  </tr>
                ) : lowStockProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      No low-stock products reported.
                    </td>
                  </tr>
                ) : (
                  lowStockProducts.map((product) => {
                    const stock = product.stock ?? product.quantity ?? 0;

                    return (
                      <tr key={product._id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {product.name}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {product.sku || "—"}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {number(stock)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                            Restock needed
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="pb-2 text-center text-xs text-slate-400">
          Inventory CRM · Dashboard data is provided by your API
        </footer>
      </div>
    </main>
  );
}
