"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  CalendarDays,
  Package,
  Clock3,
  Truck,
  CheckCircle2,
  XCircle,
  Globe,
  Printer,
  Download,
  ArrowLeft,
  UserRound,
  CreditCard,
  RefreshCw,
  X,
} from "lucide-react";
import { StatCard } from "@/components/order/statCard";
import {
  emptyStats,
  Order,
  OrderStatus,
  Stats,
} from "@/components/dataType";
import { currency, formatDate } from "@/components/commonAndSmallFuc";
import ConfirmationCancelModal from "@/components/order/confirmationCancelModal";
import {
  ChannelIcon,
  Info,
  MoneyLine,
  Panel,
  StatusBadge,
} from "@/components/order/smallComponent";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [stats, setStats] = useState<Stats>(emptyStats);

  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [tracking, setTracking] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        channel,
        status,
        q: search,
        limit: "100",
      });

      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const response = await fetch(`/api/orders?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load orders");
      }

      setOrders(data.orders);
      setStats(data.stats);

      setSelected((current) => {
        if (!current) return data.orders[0] || null;

        return (
          data.orders.find((order: Order) => order._id === current._id) || null
        );
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [channel, status, search, from, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  async function updateOrder(patch: {
    status?: string;
    note?: string;
    trackingNumber?: string;
  }) {
    if (!selected) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/orders/${selected._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Order update failed");
      }

      setSelected(data.order);
      setTracking(data.order.trackingNumber || "");
      setNotice(data.message || "Order updated successfully.");
      setConfirmCancel(false);

      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update order");
    } finally {
      setSaving(false);
    }
  }

  function exportCSV() {
    const rows = [
      ["Order ID", "Channel", "Customer", "Amount", "Status", "Date"],
      ...orders.map((order) => [
        order.orderNumber,
        order.channel,
        order.customer.name,
        String(order.totalAmount),
        order.status,
        order.placedAt,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "orders.csv";
    anchor.click();

    URL.revokeObjectURL(url);
  }

  function viewOrder(order: Order) {
    setSelected(order);
    setTracking(order.trackingNumber || "");
    setNotice("");
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage and track website and marketplace orders
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void loadOrders()}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {notice}
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total Orders"
            value={stats.total}
            label="All orders"
            icon={<Package size={21} />}
            color="blue"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            label="Pending and processing"
            icon={<Clock3 size={21} />}
            color="amber"
          />
          <StatCard
            title="Shipped"
            value={stats.shipped}
            label="On the way"
            icon={<Truck size={21} />}
            color="blue"
          />
          <StatCard
            title="Delivered"
            value={stats.delivered}
            label="Successfully delivered"
            icon={<CheckCircle2 size={21} />}
            color="green"
          />
          <StatCard
            title="Cancelled"
            value={stats.cancelled}
            label="Cancelled orders"
            icon={<XCircle size={21} />}
            color="red"
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All Channels</option>
              <option value="Website">Website</option>
              <option value="Amazon">Amazon</option>
              <option value="Flipkart">Flipkart</option>
              <option value="Meesho">Meesho</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2">
              <CalendarDays size={16} className="shrink-0 text-slate-400" />
              <input
                type="date"
                aria-label="Start date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full min-w-0 py-2 text-xs outline-none"
              />
              <span className="text-slate-400">–</span>
              <input
                type="date"
                aria-label="End date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full min-w-0 py-2 text-xs outline-none"
              />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3">
              <Search size={17} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order, customer, SKU..."
                className="w-full py-2.5 text-sm outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-3">Order ID</th>
                  <th className="px-3 py-3">Channel</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Total Amount</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-slate-500"
                    >
                      Loading orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-slate-500"
                    >
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order: any) => (
                    <tr
                      key={order._id}
                      onClick={() => viewOrder(order)}
                      className={`cursor-pointer hover:bg-blue-50/50 ${
                        selected?._id === order._id ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="whitespace-nowrap px-3 py-4 font-medium text-blue-700">
                        {order.orderNumber}
                      </td>

                      <td className="px-3 py-4">
                        <span className="inline-flex items-center gap-2">
                          <ChannelIcon channel={order.channel} />
                          {order.channel}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        {order.customer?.name || order?.customerName || "N/A"}
                      </td>

                      <td className="px-3 py-4 font-semibold">
                        {currency(order.totalAmount)}
                      </td>

                      <td className="px-3 py-4">
                        <StatusBadge status={order.status} />
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-500">
                        {formatDate(order.placedAt)}
                      </td>

                      <td className="px-3 py-4">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            viewOrder(order);
                          }}
                          className="rounded-md border px-4 py-1.5 text-xs font-semibold hover:border-blue-400 hover:text-blue-700"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 border-t pt-3 text-xs text-slate-500">
            Showing {orders.length} order(s)
          </p>
        </section>

        {selected && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <button
                  onClick={() => setSelected(null)}
                  className="mb-2 flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <ArrowLeft size={14} />
                  Back to Orders
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold">
                    Order #{selected.orderNumber}
                  </h2>
                  <StatusBadge status={selected.status} />
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Placed {formatDate(selected.placedAt)} · {selected.channel}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  <Printer size={14} />
                  Print Invoice
                </button>

                <button
                  onClick={exportCSV}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
                >
                  <Download size={14} />
                  Download CSV
                </button>

                {selected.status !== "Cancelled" && (
                  <button
                    onClick={() => setConfirmCancel(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <X size={14} />
                    Cancel Order
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="space-y-4">
                <Panel title="Customer Details" icon={<UserRound size={16} />}>
                  <Info label="Name" value={selected.customer.name ?? ""} />
                  <Info label="Phone" value={selected.customer.phone} />
                  <Info label="Email" value={selected.customer.email} />
                  <Info label="Address" value={selected.customer.address} />
                </Panel>

                <Panel
                  title={`Order Items (${selected.items.length})`}
                  icon={<Package size={16} />}
                >
                  <div className="space-y-3">
                    {selected.items.map((item, index) => (
                      <div
                        key={`${item.sku}-${index}`}
                        className="flex gap-3 border-b pb-3 last:border-0 last:pb-0"
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-14 w-14 rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100">
                            <Package size={22} className="text-slate-400" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{item.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.variant || item.sku}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {currency(item.price)} × {item.quantity}
                          </p>
                        </div>

                        <p className="text-sm font-semibold">
                          {currency(item.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              <div className="space-y-4">
                <Panel title="Order Status" icon={<CheckCircle2 size={16} />}>
                  <div className="ml-2 border-l-2 border-slate-200 pl-5">
                    {(selected.statusHistory?.length
                      ? [...selected.statusHistory].sort(
                          (a, b) =>
                            new Date(a.at).getTime() - new Date(b.at).getTime(),
                        )
                      : [
                          {
                            status: selected.status,
                            at: selected.placedAt,
                            note: "Current order status",
                          },
                        ]
                    ).map((event, index) => (
                      <div
                        key={`${event.status}-${index}`}
                        className="relative pb-5 last:pb-0"
                      >
                        <span className="absolute -left-[29px] flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white ring-4 ring-white">
                          <CheckCircle2 size={14} />
                        </span>

                        <p className="text-xs font-semibold">{event.status}</p>

                        <p className="mt-1 text-[11px] text-slate-500">
                          {formatDate(event.at)}
                        </p>

                        {event.note && (
                          <p className="mt-1 text-xs text-slate-500">
                            {event.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {selected.status !== "Delivered" &&
                    selected.status !== "Cancelled" && (
                      <div className="mt-4 border-t pt-4 print:hidden">
                        <label
                          htmlFor="newStatus"
                          className="mb-2 block text-xs font-semibold"
                        >
                          Update status
                        </label>

                        <div className="flex gap-2">
                          <select
                            id="newStatus"
                            defaultValue={selected.status}
                            className="min-w-0 flex-1 rounded-lg border px-2 py-2 text-sm"
                          >
                            {(
                              [
                                "Pending",
                                "Processing",
                                "Shipped",
                                "Delivered",
                                "Cancelled",
                              ] as OrderStatus[]
                            ).map((value) => (
                              <option key={value}>{value}</option>
                            ))}
                          </select>

                          <button
                            disabled={saving}
                            onClick={() => {
                              const element = document.getElementById(
                                "newStatus",
                              ) as HTMLSelectElement | null;

                              if (
                                element &&
                                element.value !== selected.status
                              ) {
                                void updateOrder({
                                  status: element.value,
                                  note: "Updated by admin",
                                });
                              }
                            }}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {saving ? "Saving..." : "Update"}
                          </button>
                        </div>
                      </div>
                    )}
                </Panel>
              </div>

              <div className="space-y-4">
                <Panel
                  title="Shipping & Payment"
                  icon={<CreditCard size={16} />}
                >
                  <Info
                    label="Shipping Method"
                    value={selected.shippingMethod}
                  />
                  <Info label="Payment Method" value={selected.paymentMethod} />

                  <div className="my-3 border-t" />

                  <Info
                    label="Payment Status"
                    value={selected.paymentStatus || "Pending Payment"}
                  />

                  <label
                    htmlFor="tracking"
                    className="mb-1 block text-xs font-semibold"
                  >
                    Tracking Number
                  </label>

                  <div className="flex gap-2 print:hidden">
                    <input
                      id="tracking"
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                      placeholder="Enter tracking number"
                      className="min-w-0 flex-1 rounded-lg border px-2 py-2 text-xs"
                    />

                    <button
                      disabled={saving}
                      onClick={() =>
                        void updateOrder({
                          trackingNumber: tracking,
                        })
                      }
                      className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs">
                    <Globe size={15} className="text-slate-400" />
                    <span>Channel: {selected.channel}</span>
                  </div>
                </Panel>

                <Panel title="Order Summary" icon={<CreditCard size={16} />}>
                  <MoneyLine
                    label="Subtotal"
                    value={currency(selected.subtotal)}
                  />
                  <MoneyLine
                    label="Shipping"
                    value={currency(selected.shipping)}
                  />
                  <MoneyLine
                    label="Discount"
                    value={`−${currency(selected.discount)}`}
                    green
                  />

                  <div className="my-3 border-t" />

                  <MoneyLine
                    label="Total Amount"
                    value={currency(selected.totalAmount)}
                    strong
                  />
                </Panel>
              </div>
            </div>

            <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
              <strong>Note:</strong> Online payment should only be marked paid
              after verification from your payment gateway.
            </p>
          </section>
        )}
      </div>

      {confirmCancel && selected && (
        <ConfirmationCancelModal
          selected={selected}
          saving={saving}
          setConfirmCancel={setConfirmCancel}
          updateOrder={updateOrder}
        />
      )}
    </main>
  );
}
