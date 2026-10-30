
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search, Plus, RefreshCw, Eye, Pencil, Trash2,
  X, Store, Package, CheckCircle2, Clock3,
  AlertCircle, Globe, ChevronLeft, ChevronRight,
  Loader2
} from "lucide-react";

type Channel = "WEBSITE" | "AMAZON" | "FLIPKART" | "MEESHO";
type Status = "ACTIVE" | "PENDING" | "FAILED" | "INACTIVE";

type ProductVariant = {
  _id: string;
  name: string;
  sku: string;
  price?: number;
  stock?: number;
};

type Product = {
  _id: string;
  name: string;
  sku: string;
  category?: string;
  description?: string;
  price: number;
  stock: number;
  images?: { url: string; publicId?: string }[];
  variants?: ProductVariant[];
};

type Listing = {
  _id: string;
  productId?: string;
  variantId?: string | null;
  productName: string;
  sku: string;
  image?: string;
  category?: string;
  channel: Channel;
  listingId?: string;
  sellingPrice: number;
  stock: number;
  status: Status;
  lastSyncedAt?: string;
  lastSyncMessage?: string;
  syncState?: string;
  listingTitle?: string;
  description?: string;
};

type Stats = {
  total: number;
  active: number;
  pending: number;
  failed: number;
  inactive: number;
};

const channelLabels: Record<Channel, string> = {
  WEBSITE: "Website",
  AMAZON: "Amazon",
  FLIPKART: "Flipkart",
  MEESHO: "Meesho",
};

const statusClass: Record<Status, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-200",
  INACTIVE: "bg-slate-100 text-slate-600 ring-slate-200",
};

const emptyForm = {
  productId: "",
  variantId: "",
  productName: "",
  sku: "",
  image: "",
  category: "",
  channel: "AMAZON" as Channel,
  listingId: "",
  sellingPrice: "",
  stock: "",
  listingTitle: "",
  description: "",
};

export default function MarketplaceListingsPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    pending: 0,
    failed: 0,
    inactive: 0,
  });

  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [modal, setModal] = useState<
    "create" | "edit" | "view" | null
  >(null);

  const [selected, setSelected] = useState<Listing | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState("");

  // Load marketplace listings
  const load = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        q: search,
        channel,
        status,
        page: String(page),
        limit: "10",
      });

      const res = await fetch(
        `/api/listings?${params}`
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not load listings");
      }

      setItems(json.data || []);
      setStats(json.stats);
      setPages(Math.max(1, json.pagination?.pages || 1));
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not load listings"
      );
    } finally {
      setLoading(false);
    }
  }, [search, channel, status, page]);

  // Load products for Create Listing
  const loadProducts = async () => {
    setProductsLoading(true);

    try {
      const res = await fetch("/api/products?page=1&limit=100");
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Could not load products");
      }

      setProducts(json.products || []);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not load products"
      );
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  // Open create modal
  const openCreate = async () => {
    setSelected(null);
    setForm(emptyForm);
    setModal("create");

    await loadProducts();
  };

  // Select product and auto-fill fields
  const selectProduct = (productId: string) => {
    const product = products.find(
      (item) => item._id === productId
    );

    if (!product) {
      setForm(emptyForm);
      return;
    }

    setForm((prev) => ({
      ...prev,
      productId: product._id,
      variantId: "",
      productName: product.name,
      sku: product.sku,
      image: product.images?.[0]?.url || "",
      category: product.category || "",
      sellingPrice: String(product.price || 0),
      stock: String(product.stock || 0),
      listingTitle: product.name,
      description: product.description || "",
    }));
  };

  // Select product variant
  const selectVariant = (variantId: string) => {
    const product = products.find(
      (item) => item._id === form.productId
    );

    const variant = product?.variants?.find(
      (item) => item._id === variantId
    );

    if (!variant) {
      setForm((prev) => ({
        ...prev,
        variantId: "",
        sku: product?.sku || "",
        sellingPrice: String(product?.price || 0),
        stock: String(product?.stock || 0),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      variantId: variant._id,
      sku: variant.sku || product?.sku || "",
      sellingPrice: String(variant.price ?? product?.price ?? 0),
      stock: String(variant.stock ?? product?.stock ?? 0),
    }));
  };

  // Open edit modal
  const openEdit = (item: Listing) => {
    setSelected(item);

    setForm({
      ...emptyForm,
      productId: item.productId || "",
      variantId: item.variantId || "",
      productName: item.productName,
      sku: item.sku,
      image: item.image || "",
      category: item.category || "",
      channel: item.channel,
      listingId: item.listingId || "",
      sellingPrice: String(item.sellingPrice),
      stock: String(item.stock),
      listingTitle: item.listingTitle || item.productName,
      description: item.description || "",
    });

    setModal("edit");
  };

  // Create or update listing

const save = async (e: React.FormEvent) => {
  e.preventDefault();

  if (modal === "create" && !form.productId) {
    setNotice("Please select a product.");
    return;
  }

  setSaving(true);
  setNotice("");

  try {
    const payload = {
      productId: form.productId,
      variantId: form.variantId || null,
      channel: form.channel,
      sellingPrice: Number(form.sellingPrice),
      stock: Number(form.stock),
      listingTitle: form.listingTitle,
      description: form.description,
    };

    const url =
      modal === "edit" && selected
        ? `/api/listings/${selected._id}`
        : "/api/listings";

    const res = await fetch(url, {
      method: modal === "edit" ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || "Save failed");
    }

    setModal(null);
    setNotice(json.message || "Listing saved successfully.");

    setPage(1);
    await load();
  } catch (error) {
    setNotice(
      error instanceof Error ? error.message : "Save failed"
    );
  } finally {
    setSaving(false);
  }
};


  // Delete listing
  const remove = async (item: Listing) => {
    const confirmed = window.confirm(
      `Remove ${item.productName} listing from CRM?`
    );

    if (!confirmed) return;

    setDeletingId(item._id);

    try {
      const res = await fetch(
        `/api/listings/${item._id}`,
        { method: "DELETE" }
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Delete failed");
      }

      setNotice(json.message || "Listing deleted successfully.");
      await load();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Delete failed"
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Sync listing with marketplace
  const sync = async (item: Listing) => {
    if (syncingId) return;

    setSyncingId(item._id);
    setNotice("");

    try {
      const res = await fetch(
        `/api/listings/${item._id}/sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const json = await res.json();

      setNotice(
        json.message ||
          (res.ok
            ? "Sync request completed."
            : "Marketplace sync failed.")
      );

      // Reload listing to show latest sync information
      await load();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Something went wrong during sync."
      );
    } finally {
      setSyncingId(null);
    }
  };

  const statCards = [
    {
      label: "Total Listings",
      value: stats.total,
      icon: Package,
      color: "blue",
    },
    {
      label: "Active",
      value: stats.active,
      icon: CheckCircle2,
      color: "green",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock3,
      color: "amber",
    },
    {
      label: "Failed",
      value: stats.failed,
      icon: AlertCircle,
      color: "rose",
    },
  ];

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n || 0);

  const selectedProduct = products.find(
    (product) => product._id === form.productId
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-7">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Marketplace Listings
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage product listings across all your sales channels
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus size={17} />
              Create Listing
            </button>
          </div>
        </div>

        {/* Notice */}
        {notice && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <span>{notice}</span>
            <button onClick={() => setNotice("")}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`rounded-full p-3 ${
                    color === "blue"
                      ? "bg-blue-50 text-blue-600"
                      : color === "green"
                      ? "bg-emerald-50 text-emerald-600"
                      : color === "amber"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-rose-50 text-rose-600"
                  }`}
                >
                  <Icon size={21} />
                </div>
                <span className="text-xs font-medium text-slate-400">
                  All channels
                </span>
              </div>

              <p className="mt-4 text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {value.toLocaleString("en-IN")}
              </p>
            </div>
          ))}
        </div>

        {/* Listings Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center">
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              <select
                value={channel}
                onChange={(e) => {
                  setChannel(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="ALL">All Channels</option>
                <option value="AMAZON">Amazon</option>
                <option value="FLIPKART">Flipkart</option>
                <option value="MEESHO">Meesho</option>
                <option value="WEBSITE">Website</option>
              </select>

              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-3 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search product, SKU or listing ID..."
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    "Product",
                    "SKU",
                    "Channel",
                    "Listing ID",
                    "Selling Price",
                    "Stock",
                    "Status",
                    "Last Synced",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-16 text-center text-slate-500"
                    >
                      <Loader2
                        className="mr-2 inline animate-spin"
                        size={18}
                      />
                      Loading listings...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-16 text-center text-slate-500"
                    >
                      No marketplace listings found.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="h-11 w-11 rounded-lg border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                              <Package size={20} />
                            </div>
                          )}

                          <div>
                            <p className="font-semibold text-slate-800">
                              {item.productName}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {item.category || "Uncategorized"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-600">
                        {item.sku}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-slate-700">
                          <Store size={16} className="text-slate-400" />
                          {channelLabels[item.channel]}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-500">
                        {item.listingId || "—"}
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {fmt(item.sellingPrice)}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {item.stock}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                            statusClass[item.status]
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-500">
                        {item.lastSyncedAt
                          ? new Date(item.lastSyncedAt).toLocaleString("en-IN")
                          : "Not synced"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            title="View"
                            onClick={() => {
                              setSelected(item);
                              setModal("view");
                            }}
                            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                          >
                            View
                          </button>

                          <button
                            title="Edit"
                            onClick={() => openEdit(item)}
                            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            title="Sync"
                            onClick={() => sync(item)}
                            disabled={syncingId !== null}
                            className="rounded-md p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <RefreshCw
                              size={16}
                              className={
                                syncingId === item._id ? "animate-spin" : ""
                              }
                            />
                          </button>

                          <button
                            title="Delete"
                            onClick={() => remove(item)}
                            disabled={deletingId === item._id}
                            className="rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                          >
                            {deletingId === item._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
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
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Page {page} of {pages}
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white">
                {page}
              </span>

              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Marketplace Connection Status */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="text-blue-600" size={19} />
            <h2 className="font-semibold text-slate-900">
              Marketplace Connection Status
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(
              ["AMAZON", "FLIPKART", "MEESHO", "WEBSITE"] as Channel[]
            ).map((c) => (
              <div
                key={c}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {channelLabels[c]}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Connector setup required
                  </p>
                </div>
                <Store className="text-slate-400" size={22} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create / Edit / View Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {modal === "create"
                    ? "Create Marketplace Listing"
                    : modal === "edit"
                    ? "Edit Listing"
                    : "Listing Details"}
                </h2>
                <p className="text-xs text-slate-500">
                  Marketplace listing information
                </p>
              </div>

              <button
                onClick={() => setModal(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            {/* View Modal */}
            {modal === "view" && selected ? (
              <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
                {[
                  ["Product", selected.productName],
                  ["SKU", selected.sku],
                  ["Marketplace", channelLabels[selected.channel]],
                  ["Listing ID", selected.listingId || "Not assigned"],
                  ["Selling Price", fmt(selected.sellingPrice)],
                  ["Stock", String(selected.stock)],
                  ["Status", selected.status],
                  [
                    "Sync State",
                    selected.syncState || "NOT_SYNCED",
                  ],
                  [
                    "Last Synced",
                    selected.lastSyncedAt
                      ? new Date(selected.lastSyncedAt).toLocaleString("en-IN")
                      : "Never",
                  ],
                  [
                    "Last Sync Message",
                    selected.lastSyncMessage || "No message",
                  ],
                ].map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{key}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                      {value}
                    </p>
                  </div>
                ))}

                <div className="sm:col-span-2 flex justify-end">
                  <button
                    onClick={() => openEdit(selected)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Edit Listing
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={save} className="space-y-4 p-6">

                {/* Product Selection */}
                {modal === "create" && (
                  <>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Select Product *
                      </span>

                      <select
                        required
                        value={form.productId}
                        disabled={productsLoading}
                        onChange={(e) => selectProduct(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
                      >
                        <option value="">
                          {productsLoading
                            ? "Loading products..."
                            : "Select a product"}
                        </option>

                        {products.map((product) => (
                          <option key={product._id} value={product._id}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                      </select>
                    </label>

                    {selectedProduct?.variants &&
                      selectedProduct.variants.length > 0 && (
                        <label className="block">
                          <span className="mb-1.5 block text-sm font-medium text-slate-700">
                            Select Variant
                          </span>

                          <select
                            value={form.variantId}
                            onChange={(e) =>
                              selectVariant(e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                          >
                            <option value="">Default Product</option>

                            {selectedProduct.variants.map((variant) => (
                              <option
                                key={variant._id}
                                value={variant._id}
                              >
                                {variant.name} - {variant.sku}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                    {form.productId && (
                      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        {form.image ? (
                          <img
                            src={form.image}
                            alt={form.productName}
                            className="h-16 w-16 rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white text-slate-400">
                            <Package size={24} />
                          </div>
                        )}

                        <div>
                          <p className="font-semibold text-slate-800">
                            {form.productName}
                          </p>
                          <p className="text-xs text-slate-500">
                            SKU: {form.sku}
                          </p>
                          <p className="text-xs text-slate-500">
                            {form.category || "Uncategorized"}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Product Details */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["productName", "Product Name", true],
                      ["sku", "SKU", true],
                      ["image", "Product Image URL", false],
                      ["category", "Category", false],
                      ["sellingPrice", "Selling Price (₹)", true],
                      ["stock", "Available Stock", true],
                      ["listingTitle", "Listing Title", false],
                    ] as [keyof typeof emptyForm, string, boolean][]
                  ).map(([key, label, required]) => (
                    <label key={key} className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        {label}
                      </span>

                      <input
                        required={required}
                        readOnly={
                          modal === "create" &&
                          ["productName", "sku", "image", "category"].includes(
                            key
                          )
                        }
                        min={
                          key === "sellingPrice" || key === "stock"
                            ? "0"
                            : undefined
                        }
                        type={
                          key === "sellingPrice" || key === "stock"
                            ? "number"
                            : "text"
                        }
                        step={key === "sellingPrice" ? "0.01" : "1"}
                        value={form[key]}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            [key]: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 read-only:bg-slate-50"
                      />
                    </label>
                  ))}

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Marketplace
                    </span>

                    <select
                      value={form.channel}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          channel: e.target.value as Channel,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="AMAZON">Amazon</option>
                      <option value="FLIPKART">Flipkart</option>
                      <option value="MEESHO">Meesho</option>
                      <option value="WEBSITE">Website</option>
                    </select>
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Description
                    </span>

                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </label>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Saving creates or updates the listing record in your CRM.
                  Publishing to the selected marketplace requires its seller
                  API connection.
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>

                  <button
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : modal === "edit"
                      ? "Save Changes"
                      : "Create Listing"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
