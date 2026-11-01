import React from "react";
import { statusStyle } from "./smallComponents";
import { money } from "../commonAndSmallFuc";

function RecentOrder({
  loading,
  recentOrders,
}: {
  loading: boolean;
  recentOrders: any;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Recent Orders</h2>
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
              recentOrders.map((order:any) => (
                <tr key={order._id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-semibold text-blue-700">
                    {order.orderNumber ||
                      `#${order._id.slice(-6).toUpperCase()}`}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {order.customerName || order.customer?.name || "Customer"}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {order.channel || "Website"}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {money(order.totalAmount)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle(
                        order.status,
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
  );
}

export default RecentOrder;
