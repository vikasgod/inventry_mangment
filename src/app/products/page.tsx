"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  Eye,
  Filter,
  Globe,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Trash,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import DeleteConfirmModal from "@/components/products/DeleteConfirmModal";

type ProductStatus = "Active" | "Low Stock" | "Out of Stock";

type Product = {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  variants: number;
  stock: number;
  change: number;
  price: number;
  status: "Active" | "Low Stock" | "Out of Stock" | "Draft";
  image: string;
  channels: string[];
};

const categories = [
  "All Categories",
  "Footwear",
  "Apparel",
  "Bags",
  "Electronics",
  "Home & Kitchen",
  "Home Decor",
  "Sports",
  "Accessories",
];

const statuses = ["All Status", "Active", "Low Stock", "Out of Stock"];

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function ChannelIcon({ channel }: { channel: string }) {
  const styles: Record<string, string> = {
    Website: "bg-blue-50 text-blue-600 border-blue-100",
    Amazon: "bg-amber-50 text-amber-700 border-amber-200",
    Flipkart: "bg-yellow-50 text-blue-700 border-yellow-200",
    Meesho: "bg-pink-50 text-pink-700 border-pink-200",
  };

  const labels: Record<string, string> = {
    Website: "W",
    Amazon: "a",
    Flipkart: "f",
    Meesho: "m",
  };

  return (
    <span
      title={channel}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-sm font-extrabold ${
        styles[channel] ?? "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {labels[channel] ?? channel.charAt(0)}
    </span>
  );
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const styles: Record<ProductStatus, string> = {
    Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    "Low Stock": "border-amber-200 bg-amber-50 text-amber-700",
    "Out of Stock": "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  negative = false,
}: {
  title: string;
  value: string;
  change: string;
  icon: typeof Package;
  color: string;
  negative?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-blue-100 bg-white p-4 shadow-sm shadow-slate-100/70">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${color}`}
      >
        <Icon size={23} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-600">{title}</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <span
            className={`flex items-center gap-0.5 whitespace-nowrap text-xs font-semibold ${
              negative ? "text-red-500" : "text-emerald-600"
            }`}
          >
            {negative ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
            {change}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-slate-400">vs. last week</p>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [status, setStatus] = useState("All Status");
  const [page, setPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        setLoadingProducts(true);
        setProductsError("");
        const response = await fetch("/api/products?limit=100", {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Unable to load products.");

        const mapped: Product[] = (data.products || []).map((p: any) => ({
          id: String(p._id),
          name: p.name || "Untitled product",
          description: p.description || "",
          sku: p.sku || "—",
          category: p.category || "Uncategorized",
          variants: Array.isArray(p.variants) ? p.variants.length : 0,
          stock: Number(p.stock || 0),
          change: 0,
          price: Number(p.price || 0),
          status:
            p.status || (Number(p.stock || 0) <= 0 ? "Out of Stock" : "Active"),
          image: p.images?.[0]?.url || "",
          channels: Array.isArray(p.channels) ? p.channels : [],
        }));
        if (!cancelled) setProducts(mapped);
      } catch (error) {
        if (!cancelled)
          setProductsError(
            error instanceof Error ? error.message : "Unable to load products.",
          );
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    }

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const result = products.filter((product) => {
      const searchText = search.trim().toLowerCase();

      const matchesSearch =
        !searchText ||
        product.name.toLowerCase().includes(searchText) ||
        product.sku.toLowerCase().includes(searchText) ||
        product.category.toLowerCase().includes(searchText);

      const matchesCategory =
        category === "All Categories" || product.category === category;

      const matchesStatus =
        status === "All Status" || product.status === status;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    result.sort((a, b) =>
      sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
    );

    return result;
  }, [products, search, category, status, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const visibleProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const activeCount = products.filter((p) => p.status === "Active").length;
  const lowStockCount = products.filter((p) => p.status === "Low Stock").length;
  const totalVariants = products.reduce((sum, p) => sum + p.variants, 0);

  const allVisibleSelected =
    visibleProducts.length > 0 &&
    visibleProducts.every((product) => selected.includes(product.id));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelected((prev) =>
        prev.filter((id) => !visibleProducts.some((p) => p.id === id)),
      );
    } else {
      setSelected((prev) => [
        ...new Set([...prev, ...visibleProducts.map((p) => p.id)]),
      ]);
    }
  }

  function toggleProduct(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function openDeleteConfirmation(product: Product) {
    setProductToDelete(product);
  }
  async function deleteProduct(id: string) {
    if (deleting) return;

    try {
      setDeleting(true);
      setProductsError("");

      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to delete product."
        );
      }

      // Update the UI only after a successful API response.
      setProducts((prev) =>
        prev.filter((product) => product.id !== id)
      );

      setSelected((prev) =>
        prev.filter((item) => item !== id)
      );

      setProductToDelete(null);
    } catch (error) {
      setProductsError(
        error instanceof Error
          ? error.message
          : "Unable to delete product."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fc] text-slate-900">
      {productsError && (
        <div
          role="alert"
          className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-6"
        >
          {productsError} Make sure the products API and MongoDB connection are
          configured.
        </div>
      )}
      {/* Top header */}
      <header className="sticky top-0 z-30 flex h-[60px] items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="relative max-w-2xl flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search products, SKU, category..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <Bell size={20} />
          <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            3
          </span>
        </button>

        <button
          type="button"
          className="hidden items-center gap-2 border-l border-slate-100 pl-4 text-sm sm:flex"
        >
          <span>🇮🇳</span>
          <span className="font-medium">INR</span>
          <ChevronDown size={14} className="text-slate-500" />
        </button>

        <button
          type="button"
          className="flex items-center gap-2 border-l border-slate-100 pl-3 sm:pl-5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-blue-800 text-base font-semibold text-white">
            V
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-xs font-semibold">Vikas God</span>
            <span className="block text-[10px] text-slate-500">Owner</span>
          </span>
          <ChevronDown size={14} className="hidden text-slate-500 sm:block" />
        </button>
      </header>

      <main className="space-y-4 p-4 sm:p-6">
        {/* Page title */}
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
              Our Products
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your products, variants, images and channel listings
            </p>
          </div>

          <Link
            href="/products/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={17} />
            Add Product
          </Link>
        </section>

        {/* Stats cards */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Products"
            value={String(products.length)}
            change="12%"
            icon={Package}
            color="bg-blue-100 text-blue-600"
          />
          <StatCard
            title="Active Products"
            value={String(activeCount)}
            change="10%"
            icon={Box}
            color="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            title="Low Stock"
            value={String(lowStockCount)}
            change="3%"
            icon={Activity}
            color="bg-orange-100 text-orange-600"
            negative
          />
          <StatCard
            title="Total Variants"
            value={String(totalVariants)}
            change="18%"
            icon={ShoppingCart}
            color="bg-purple-100 text-purple-600"
          />
        </section>

        {/* Product table panel */}
        <section className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm shadow-slate-100/60">
          {/* Filters toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 p-3.5">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="h-9 min-w-36 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-blue-400"
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-9 min-w-32 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-blue-400"
            >
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <div className="relative min-w-48 flex-1 sm:max-w-sm">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by product name, SKU..."
                className="h-9 w-full rounded-md border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-blue-400"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium transition ${
                showFilters
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Filter size={14} />
              Filter
            </button>

            <button
              type="button"
              onClick={() => setSortAsc((value) => !value)}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <SlidersHorizontal size={14} />
              Sort
              <ChevronsUpDown size={13} />
            </button>

            {(search ||
              category !== "All Categories" ||
              status !== "All Status") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("All Categories");
                  setStatus("All Status");
                  setPage(1);
                }}
                className="inline-flex h-9 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                <X size={13} />
                Clear
              </button>
            )}
          </div>

          {/* Extra filter panel */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-4 border-b border-blue-100 bg-blue-50/50 px-4 py-3">
              <p className="text-xs font-semibold text-slate-700">
                Quick filters
              </p>

              {(["Active", "Low Stock", "Out of Stock"] as ProductStatus[]).map(
                (item) => (
                  <label
                    key={item}
                    className="flex cursor-pointer items-center gap-2 text-xs text-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={status === item}
                      onChange={(e) => {
                        setStatus(e.target.checked ? item : "All Status");
                        setPage(1);
                      }}
                      className="h-3.5 w-3.5 accent-blue-600"
                    />
                    {item}
                  </label>
                ),
              )}
            </div>
          )}

          {/* Selected products toolbar */}
          {selected.length > 0 && (
            <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50 px-4 py-2.5">
              <p className="text-xs font-medium text-blue-800">
                {selected.length} product(s) selected
              </p>
              <button
                type="button"
                onClick={() => setSelected([])}
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Responsive table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/90">
                  <th className="w-12 px-3 py-4">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all visible products"
                      className="h-4 w-4 cursor-pointer rounded accent-blue-600"
                    />
                  </th>
                  {[
                    "Product",
                    "SKU",
                    "Category",
                    "Variants",
                    "Stock (Total)",
                    "Price (Starting)",
                    "Channels",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-3 py-4 text-[11px] font-bold text-slate-700"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visibleProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={`transition hover:bg-blue-50/40 ${
                      selected.includes(product.id) ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.includes(product.id)}
                        onChange={() => toggleProduct(product.id)}
                        aria-label={`Select ${product.name}`}
                        className="h-4 w-4 cursor-pointer rounded accent-blue-600"
                      />
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex min-w-[210px] items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50 text-slate-400">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package size={20} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800">
                            {product.name}
                          </p>
                          <p className="mt-1 max-w-40 truncate text-[10px] text-slate-400">
                            {product.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-xs font-medium text-slate-700">
                      {product.sku}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">
                      {product.category}
                    </td>

                    <td className="px-3 py-3 text-center text-xs font-medium text-slate-700">
                      {product.variants}
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-xs font-bold text-slate-800">
                          {product.stock}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                            product.change < 0
                              ? "bg-red-50 text-red-600"
                              : "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          {product.change > 0 ? "+" : ""}
                          {product.change}
                        </span>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-xs font-bold text-slate-800">
                      {formatPrice(product.price)}
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        {product.channels.map((channel) => (
                          <ChannelIcon key={channel} channel={channel} />
                        ))}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <StatusBadge status={product.status} />
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/products/${product.id}/edit`}
                          title="Edit product"
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil size={15} />
                        </Link>
                        <Link
                          href={`/products/${product.id}`}
                          title="Edit product"
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Eye size={15} />
                        </Link>
                        <span
                          onClick={() => openDeleteConfirmation(product)}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Trash size={15} />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}

                {visibleProducts.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-16 text-center">
                      <Package
                        size={32}
                        className="mx-auto mb-3 text-slate-300"
                      />
                      <p className="text-sm font-semibold text-slate-700">
                        {loadingProducts
                          ? "Loading products..."
                          : "No products found"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {loadingProducts
                          ? "Fetching products from your database."
                          : "Add a product or try changing your search or filter."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <p className="text-[11px] text-slate-500">
              Showing{" "}
              {filteredProducts.length === 0
                ? 0
                : (currentPage - 1) * pageSize + 1}{" "}
              to {Math.min(currentPage * pageSize, filteredProducts.length)} of{" "}
              {filteredProducts.length} products
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNumber) => (
                  <button
                    type="button"
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={`h-8 min-w-8 rounded-md border px-2 text-xs font-medium ${
                      currentPage === pageNumber
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ),
              )}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </footer>
        </section>

        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <CircleHelp size={13} />
          Live product data from your database.
          <Globe size={13} />
        </p>
      </main>
      {productToDelete && (
        <DeleteConfirmModal
          productName={productToDelete.name}
          loading={deleting}
          onCancel={() => {
            if (!deleting) {
              setProductToDelete(null);
            }
          }}
          onConfirm={() => {
            if (!deleting && productToDelete) {
              deleteProduct(productToDelete.id);
            }
          }}
        />
      )}
    </div>
  );
}
