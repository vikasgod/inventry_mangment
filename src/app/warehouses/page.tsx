"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Warehouse,
  Package,
  Boxes,
  CheckCircle,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  MapPin,
  X,
  Loader2,
  Building2,
  AlertCircle,
} from "lucide-react";

type WarehouseItem = {
  _id: string;
  name: string;
  code: string;
  type: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  capacity: number;
  status: "Active" | "Inactive";
  stockUnits: number;
  reservedStock: number;
  availableStock: number;
  totalProducts: number;
  lowStock: number;
  capacityUsed: number;
};

const emptyForm = {
  name: "",
  code: "",
  type: "Storage",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  capacity: "",
  status: "Active",
};

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [summary, setSummary] = useState({
    totalWarehouses: 0,
    activeWarehouses: 0,
    totalProducts: 0,
    totalStockUnits: 0,
    cities: [] as string[],
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Status");
  const [city, setCity] = useState("All Cities");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewItem, setViewItem] = useState<WarehouseItem | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteItem, setDeleteItem] = useState<WarehouseItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const pageSize = 10;
  async function openView(item: WarehouseItem) {
    try {
      setViewLoading(true);
      setViewItem(item);

      const response = await fetch(`/api/warehouses/${item._id}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load warehouse details");
      }

      setViewItem(result.data);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Something went wrong",
      );
      setViewItem(null);
    } finally {
      setViewLoading(false);
    }
  }
  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        search,
        status,
        city,
      });

      const response = await fetch(`/api/warehouses?${params}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load warehouses.");
      }

      setWarehouses(result.data || []);
      setSummary(result.summary);
      setTotal(result.pagination.total);
      setTotalPages(Math.max(1, result.pagination.totalPages));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status, city]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWarehouses();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchWarehouses]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(item: WarehouseItem) {
    setEditing(item._id);

    setForm({
      name: item.name,
      code: item.code,
      type: item.type || "Storage",
      contactPerson: item.contactPerson || "",
      phone: item.phone || "",
      email: item.email || "",
      address: item.address || "",
      city: item.city || "",
      state: item.state || "",
      pincode: item.pincode || "",
      capacity: String(item.capacity || ""),
      status: item.status,
    });

    setShowModal(true);
  }

  async function saveWarehouse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);

      const response = await fetch(
        editing ? `/api/warehouses/${editing}` : "/api/warehouses",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            capacity: Number(form.capacity) || 0,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save warehouse.");
      }

      setShowModal(false);
      setNotice(result.message);
      await fetchWarehouses();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteItem) return;

    try {
      setDeleting(true);

      const response = await fetch(`/api/warehouses/${deleteItem._id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to delete warehouse.");
      }

      setDeleteItem(null);
      setNotice(result.message);

      if (warehouses.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await fetchWarehouses();
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  function exportCsv() {
    const headers = [
      "Warehouse",
      "Code",
      "City",
      "State",
      "Products",
      "Stock Units",
      "Reserved",
      "Available",
      "Capacity",
      "Status",
    ];

    const rows = warehouses.map((w) => [
      w.name,
      w.code,
      w.city,
      w.state,
      w.totalProducts,
      w.stockUnits,
      w.reservedStock,
      w.availableStock,
      w.capacity,
      w.status,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "warehouses.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const format = (value: number) =>
    new Intl.NumberFormat("en-IN").format(value || 0);

  const activeFilters =
    search || status !== "All Status" || city !== "All Cities";

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <main className="min-h-screen bg-[#f5f8fd] p-4 text-slate-800 sm:p-6">
      <div className="mx-auto max-w-[1700px]">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Warehouse className="h-7 w-7 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Warehouses
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Manage your storage locations and warehouse stock.
            </p>
          </div>

          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Warehouse
          </button>
        </div>

        {/* Notifications */}
        {notice && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {notice}
            <button onClick={() => setNotice("")}>
              <X size={17} />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Total Warehouses",
              value: summary.totalWarehouses,
              icon: Warehouse,
              color: "blue",
            },
            {
              title: "Active Warehouses",
              value: summary.activeWarehouses,
              icon: CheckCircle,
              color: "emerald",
            },
            {
              title: "Total Products",
              value: summary.totalProducts,
              icon: Package,
              color: "violet",
            },
            {
              title: "Total Stock Units",
              value: summary.totalStockUnits,
              icon: Boxes,
              color: "amber",
            },
          ].map((card) => {
            const Icon = card.icon;

            const colors: Record<string, string> = {
              blue: "bg-blue-50 text-blue-600",
              emerald: "bg-emerald-50 text-emerald-600",
              violet: "bg-violet-50 text-violet-600",
              amber: "bg-amber-50 text-amber-600",
            };

            return (
              <div
                key={card.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{card.title}</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                      {format(card.value)}
                    </h2>
                  </div>
                  <div className={`rounded-xl p-3 ${colors[card.color]}`}>
                    <Icon size={24} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Listing */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Filters */}
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_170px_170px_auto_auto]">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={17}
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search warehouse by name, code or location..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>

            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            >
              <option>All Cities</option>
              {summary.cities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSearch("");
                setStatus("All Status");
                setCity("All Cities");
                setPage(1);
              }}
              disabled={!activeFilters}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Reset
            </button>

            <button
              onClick={exportCsv}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download size={16} />
              Export
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-4">Warehouse</th>
                  <th className="px-4 py-4">Code</th>
                  <th className="px-4 py-4">Location</th>
                  <th className="px-4 py-4 text-center">Stock Units</th>
                  <th className="px-4 py-4 text-center">Products</th>
                  <th className="px-4 py-4">Capacity</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-16 text-center text-slate-500"
                    >
                      <Loader2 className="mx-auto mb-2 animate-spin text-blue-600" />
                      Loading warehouses...
                    </td>
                  </tr>
                ) : warehouses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <Warehouse
                        className="mx-auto mb-3 text-slate-300"
                        size={38}
                      />
                      <p className="font-medium text-slate-700">
                        No warehouses found
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Add a warehouse or change your filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  warehouses.map((item) => (
                    <tr
                      key={item._id}
                      className="transition hover:bg-blue-50/40"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Building2 size={22} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {item.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {item.type || "Storage"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                          {item.code}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-start gap-2 text-slate-600">
                          <MapPin
                            size={16}
                            className="mt-0.5 shrink-0 text-slate-400"
                          />
                          <div>
                            <p>{item.city}</p>
                            <p className="text-xs text-slate-400">
                              {item.state}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center font-semibold tabular-nums">
                        {format(item.stockUnits)}
                      </td>

                      <td className="px-4 py-4 text-center font-semibold tabular-nums">
                        {format(item.totalProducts)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="w-28">
                          <div className="mb-2 flex justify-between text-xs">
                            <span className="font-semibold text-slate-700">
                              {item.capacityUsed}%
                            </span>
                            <span className="text-slate-400">
                              {format(item.capacity)}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                item.capacityUsed >= 90
                                  ? "bg-rose-500"
                                  : item.capacityUsed >= 70
                                    ? "bg-amber-500"
                                    : "bg-blue-600"
                              }`}
                              style={{ width: `${item.capacityUsed}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                            item.status === "Active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.status === "Active"
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          />
                          {item.status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-center gap-1">
                          <button
                            title="View details"
                            onClick={() => openView(item)}
                            className="rounded-md p-2 text-blue-600 hover:bg-blue-50"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            title="Edit warehouse"
                            onClick={() => openEdit(item)}
                            className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            title="Delete warehouse"
                            onClick={() => setDeleteItem(item)}
                            className="rounded-md p-2 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4">
            <p className="text-xs text-slate-500">
              Showing {start} to {end} of {total} warehouses
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((v) => Math.max(1, v - 1))}
                disabled={page === 1 || loading}
                className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(
                  Math.max(0, Math.min(page - 3, totalPages - 5)),
                  Math.max(0, Math.min(page - 3, totalPages - 5)) + 5,
                )
                .map((number) => (
                  <button
                    key={number}
                    onClick={() => setPage(number)}
                    className={`min-w-9 rounded-md border px-3 py-2 text-xs font-medium ${
                      page === number
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {number}
                  </button>
                ))}

              <button
                onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                disabled={page >= totalPages || loading}
                className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editing ? "Edit Warehouse" : "Add Warehouse"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Enter warehouse information below.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveWarehouse} className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ["name", "Warehouse Name", "Enter warehouse name"],
                  ["code", "Warehouse Code", "e.g. WH-001"],
                  ["contactPerson", "Contact Person", "Enter contact person"],
                  ["phone", "Phone Number", "Enter phone number"],
                  ["email", "Email Address", "Enter email"],
                  ["address", "Address", "Enter full address"],
                  ["city", "City", "Enter city"],
                  ["state", "State", "Enter state"],
                  ["pincode", "Pincode", "Enter pincode"],
                  ["capacity", "Storage Capacity (Units)", "Enter capacity"],
                ].map(([key, label, placeholder]) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      {label}
                      {["name", "code", "address", "city", "state"].includes(
                        key,
                      ) && <span className="text-rose-500"> *</span>}
                    </label>
                    <input
                      required={[
                        "name",
                        "code",
                        "address",
                        "city",
                        "state",
                      ].includes(key)}
                      type={
                        key === "email"
                          ? "email"
                          : key === "capacity"
                            ? "number"
                            : "text"
                      }
                      min={key === "capacity" ? 0 : undefined}
                      value={form[key as keyof typeof form]}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      placeholder={placeholder}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                ))}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Warehouse Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  >
                    <option>Main</option>
                    <option>Regional</option>
                    <option>Storage</option>
                    <option>Fulfillment</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editing ? "Update Warehouse" : "Save Warehouse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warehouse View Details Modal */}
      {viewItem && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Warehouse size={25} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Warehouse Details
                  </h2>
                  <p className="text-xs text-slate-500">{viewItem.code}</p>
                </div>
              </div>

              <button
                onClick={() => setViewItem(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {viewLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2
                  className="mb-3 animate-spin text-blue-600"
                  size={30}
                />
                <p className="text-sm text-slate-500">
                  Loading warehouse details...
                </p>
              </div>
            ) : (
              <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
                {/* Warehouse Name */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {viewItem.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {viewItem.type} Warehouse
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      viewItem.status === "Active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {viewItem.status}
                  </span>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    {
                      label: "Total Products",
                      value: viewItem.totalProducts,
                      icon: Package,
                      color: "blue",
                    },
                    {
                      label: "Total Stock",
                      value: viewItem.stockUnits,
                      icon: Boxes,
                      color: "violet",
                    },
                    {
                      label: "Reserved",
                      value: viewItem.reservedStock,
                      icon: Building2,
                      color: "amber",
                    },
                    {
                      label: "Available",
                      value: viewItem.availableStock,
                      icon: CheckCircle,
                      color: "emerald",
                    },
                  ].map((stat) => {
                    const Icon = stat.icon;

                    const colors: Record<string, string> = {
                      blue: "bg-blue-50 text-blue-600",
                      violet: "bg-violet-50 text-violet-600",
                      amber: "bg-amber-50 text-amber-600",
                      emerald: "bg-emerald-50 text-emerald-600",
                    };

                    return (
                      <div
                        key={stat.label}
                        className="rounded-xl border border-slate-200 p-3"
                      >
                        <div
                          className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${colors[stat.color]}`}
                        >
                          <Icon size={19} />
                        </div>
                        <p className="text-xs text-slate-500">{stat.label}</p>
                        <p className="mt-1 text-xl font-bold text-slate-900">
                          {format(stat.value)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Capacity */}
                <section className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800">
                      Storage Capacity
                    </h3>
                    <span className="text-sm font-bold text-blue-600">
                      {viewItem.capacityUsed}%
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        viewItem.capacityUsed >= 90
                          ? "bg-rose-500"
                          : viewItem.capacityUsed >= 70
                            ? "bg-amber-500"
                            : "bg-blue-600"
                      }`}
                      style={{
                        width: `${viewItem.capacityUsed}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 flex justify-between text-xs text-slate-500">
                    <span>Used: {format(viewItem.stockUnits)} units</span>
                    <span>Capacity: {format(viewItem.capacity)} units</span>
                  </div>
                </section>

                {/* Warehouse Information */}
                <section className="rounded-xl border border-slate-200 p-4">
                  <h3 className="mb-4 font-semibold text-slate-800">
                    Warehouse Information
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                      ["Warehouse Name", viewItem.name],
                      ["Warehouse Code", viewItem.code],
                      ["Warehouse Type", viewItem.type],
                      ["Contact Person", viewItem.contactPerson],
                      ["Phone Number", viewItem.phone],
                      ["Email Address", viewItem.email],
                      ["Address", viewItem.address],
                      ["City", viewItem.city],
                      ["State", viewItem.state],
                      ["Pincode", viewItem.pincode],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className="mt-1 break-words text-sm font-medium text-slate-700">
                          {value || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Low Stock */}
                <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="text-amber-600" size={21} />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Low Stock Products
                      </p>
                      <p className="text-xs text-amber-700">
                        Products at or below safety stock
                      </p>
                    </div>
                  </div>

                  <span className="text-xl font-bold text-amber-700">
                    {viewItem.lowStock || 0}
                  </span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
              <button
                onClick={() => setViewItem(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>

              <button
                disabled={viewLoading}
                onClick={() => {
                  const item = viewItem;
                  setViewItem(null);
                  openEdit(item);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Pencil size={16} />
                Edit Warehouse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <Trash2 size={25} />
            </div>

            <h2 className="text-center text-lg font-bold text-slate-900">
              Delete Warehouse?
            </h2>
            <p className="mt-2 text-center text-sm text-slate-500">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-800">
                {deleteItem.name}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => setDeleteItem(null)}
                disabled={deleting}
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting && <Loader2 size={16} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
