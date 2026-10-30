"use client";

import { DashboardData } from "@/components/dataType";
import { money, number, StatCard } from "@/components/dashbord/smallComponents";
import { useCallback, useEffect, useState } from "react";
import RecentOrder from "@/components/dashbord/recentOrder";
import LowStock from "@/components/dashbord/lowStock";
import SalesChart from "@/components/dashbord/salesChart";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("6months");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/dashboard?period=${period}`, {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Dashboard data load nahi hua.");
      }

      setData(result.data ?? result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kuch galat ho gaya. Dobara try karein.",
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

  const maxSales = Math.max(1, ...monthlySales.map((item) => item.sales));

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
              Apne products, orders, sales aur inventory ko ek jagah manage
              karein.
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
        <SalesChart
          period={period}
          loading={loading}
          monthlySales={monthlySales}
          maxSales={maxSales}
          channelSales={channelSales}
        />

        <RecentOrder loading={loading} recentOrders={recentOrders} />

        <LowStock loading={loading} lowStockProducts={lowStockProducts} />

        <footer className="pb-2 text-center text-xs text-slate-400">
          Inventory CRM · Dashboard data is provided by your API
        </footer>
      </div>
    </main>
  );
}
