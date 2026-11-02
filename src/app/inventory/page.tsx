"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  History,
  MoreVertical,
  Package,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Warehouse,
  X,
} from "lucide-react";
import {
  Adjustment,
  categories,
  formatNumber,
  InventoryItem,
} from "@/components/dataType";
import {
  DetailBox,
  FilterSelect,
  QuickAction,
  StatusBadge,
  SummaryCard,
} from "@/components/inventry/smallComponent";
import Summary from "@/components/inventry/summary";
import AdjustStockModal from "@/components/inventry/adjustStockModal";
import MovmentHistory from "@/components/inventry/movmentHistory";

function getStatus(item: InventoryItem) {
  if (item.onHand <= 0) return "Out of Stock";
  if (item.onHand <= item.safetyStock) return "Low Stock";
  return "In Stock";
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("All Warehouses");
  const [category, setCategory] = useState("All Categories");
  const [status, setStatus] = useState("All Status");
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustment, setAdjustment] = useState<Adjustment>({
    id: "",
    type: "add",
    quantity: "",
    reason: "Stock replenishment",
  });
  const [notice, setNotice] = useState("");
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [error, setError] = useState("");

  const pageSize = 10;

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [inventoryResponse, productsResponse, warehousesResponse] =
        await Promise.all([
          fetch("/api/inventory", { cache: "no-store" }),
          fetch("/api/products?limit=100", { cache: "no-store" }),
          fetch("/api/warehouses?limit=100", { cache: "no-store" }),
        ]);
      const [inventoryResult, productsResult, warehousesResult] =
        await Promise.all([
          inventoryResponse.json(),
          productsResponse.json(),
          warehousesResponse.json(),
        ]);

      if (!inventoryResponse.ok || !inventoryResult.success) {
        throw new Error(
          inventoryResult.message || "Unable to load inventory."
        );
      }
      if (!productsResponse.ok || !Array.isArray(productsResult.products)) {
        throw new Error(productsResult.message || "Unable to load products.");
      }
      if (!warehousesResponse.ok || !warehousesResult.success) {
        throw new Error(
          warehousesResult.message || "Unable to load warehouses."
        );
      }

      const records: InventoryItem[] = inventoryResult.data.map(
        (record: {
          id: string;
          productId: string;
          name: string;
          sku: string;
          category: string;
          warehouse: string;
          onHand: number;
          reserved: number;
          safetyStock: number;
          price: number;
          image: string;
        }) => ({
          ...record,
          variant: "",
          color: "",
        })
      );
      const activeWarehouses = warehousesResult.data
        .filter((entry: { status: string }) => entry.status === "Active")
        .map((entry: { name: string }) => entry.name);
      const existingRows = new Set(
        records.map((record) => `${record.productId}:${record.warehouse}`)
      );

      for (const product of productsResult.products) {
        for (const warehouseName of activeWarehouses) {
          const key = `${product._id}:${warehouseName}`;
          if (existingRows.has(key)) continue;

          records.push({
            id: `new:${key}`,
            productId: product._id,
            name: product.name,
            sku: product.sku,
            category: product.category || "Uncategorized",
            warehouse: warehouseName,
            variant: "",
            color: "",
            onHand: 0,
            reserved: 0,
            safetyStock: product.lowStockThreshold ?? 10,
            price: product.price ?? 0,
            image: product.images?.[0]?.url || "",
          });
        }
      }

      setItems(records);
      setWarehouseOptions([
        ...new Set([
          ...activeWarehouses,
          ...records.map((record) => record.warehouse),
        ]),
      ]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load inventory."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  const totalStock = items.reduce((sum, item) => sum + item.onHand, 0);
  const reservedStock = items.reduce((sum, item) => sum + item.reserved, 0);
  const availableStock = items.reduce(
    (sum, item) => sum + Math.max(0, item.onHand - item.reserved),
    0,
  );
  const lowStockCount = items.filter(
    (item) => item.onHand <= item.safetyStock,
  ).length;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      const matchesWarehouse =
        warehouse === "All Warehouses" || item.warehouse === warehouse;
      const matchesCategory =
        category === "All Categories" || item.category === category;
      const matchesStatus =
        status === "All Status" || getStatus(item) === status;
      const matchesLow = !lowOnly || item.onHand <= item.safetyStock;

      return (
        matchesSearch &&
        matchesWarehouse &&
        matchesCategory &&
        matchesStatus &&
        matchesLow
      );
    });
  }, [items, search, warehouse, category, status, lowOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const warehouseTotals = warehouseOptions.map((name) => ({
    name,
    count: items
      .filter((item) => item.warehouse === name)
      .reduce((sum, item) => sum + item.onHand, 0),
  }));

  const maxWarehouseStock = Math.max(
    ...warehouseTotals.map((item) => item.count),
    1,
  );

  function toggleSelected(id: string) {
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((itemId) => itemId !== id)
        : [...previous, id],
    );
  }

  function toggleAllVisible() {
    const visibleIds = pageItems.map((item) => item.id);
    const allSelected = visibleIds.every((id) => selected.includes(id));

    setSelected((previous) =>
      allSelected
        ? previous.filter((id) => !visibleIds.includes(id))
        : [...new Set([...previous, ...visibleIds])],
    );
  }

  function openAdjustment(item?: InventoryItem) {
    const target = item ?? items.find((row) => selected.includes(row.id));

    if (!target) {
      setNotice("Please select a product before adjusting stock.");
      return;
    }

    setAdjustItem(target);
    setAdjustment({
      id: target.id,
      type: "add",
      quantity: "",
      reason: "Stock replenishment",
    });
  }

  async function saveAdjustment() {
    const quantity = Number(adjustment.quantity);

    if (!Number.isInteger(quantity) || quantity < 0) {
      setNotice("Enter a valid whole-number quantity.");
      return;
    }

    if (adjustment.type !== "set" && quantity === 0) {
      setNotice("Quantity must be greater than zero.");
      return;
    }

    if (!adjustItem) return;

    if (!adjustItem.productId) {
      setNotice("This inventory row is missing its product reference.");
      return;
    }

    setSavingAdjustment(true);
    setNotice("");
    setError("");

    try {
      const response = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: adjustItem.productId,
          warehouse: adjustItem.warehouse,
          type: adjustment.type,
          quantity,
          reason: adjustment.reason,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Stock adjustment failed.");
      }

      setNotice(result.message);
      setAdjustItem(null);
      setSelected((previous) =>
        previous.filter((id) => id !== adjustItem.id)
      );
      await fetchInventory();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save stock adjustment."
      );
    } finally {
      setSavingAdjustment(false);
    }
  }

  function exportCsv() {
    const header = [
      "Product",
      "SKU",
      "Category",
      "Warehouse",
      "On Hand",
      "Reserved",
      "Available",
      "Safety Stock",
      "Status",
    ];

    const rows = filteredItems.map((item) => [
      item.name,
      item.sku,
      item.category,
      item.warehouse,
      item.onHand,
      item.reserved,
      Math.max(0, item.onHand - item.reserved),
      item.safetyStock,
      getStatus(item),
    ]);

    const escapeCsv = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventory-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetFilters() {
    setSearch("");
    setWarehouse("All Warehouses");
    setCategory("All Categories");
    setStatus("All Status");
    setLowOnly(false);
    setPage(1);
  }

  const lowStockItems = [...items]
    .filter((item) => item.onHand <= item.safetyStock)
    .sort((a, b) => a.onHand - b.onHand)
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-[#f5f8fd] p-4 text-slate-800 sm:p-6">
      <div className="mx-auto max-w-[1700px]">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Warehouse className="h-7 w-7 text-blue-600" />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Inventory
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Track stock levels, manage warehouses and view stock movements.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openAdjustment()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={17} />
              Adjust Stock
            </button>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {error && (
          <div
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
            role="status"
          >
            <span>{notice}</span>
            <button
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Summary cards */}
        <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Stock"
            value={totalStock}
            subtitle="Across all warehouses"
            change="On hand"
            icon={<Package size={23} />}
            tone="blue"
          />
          <SummaryCard
            title="Available Stock"
            value={availableStock}
            subtitle="Ready for sale"
            change="On hand − reserved"
            icon={<Archive size={23} />}
            tone="teal"
          />
          <SummaryCard
            title="Reserved Stock"
            value={reservedStock}
            subtitle="In orders / pending"
            change="Order reservations"
            icon={<Package size={23} />}
            tone="orange"
          />
          <SummaryCard
            title="Low Stock Items"
            value={lowStockCount}
            subtitle="At or below safety stock"
            change="Needs attention"
            icon={<CircleAlert size={23} />}
            tone="rose"
          />
        </section>

        {/* Main content */}
        <div className="grid grid-cols-1 items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_260px]">
          <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Filters */}
            <div className="border-b border-slate-100 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[145px_145px_135px_minmax(170px,1fr)_auto]">
                <FilterSelect
                  value={warehouse}
                  onChange={(value) => {
                    setWarehouse(value);
                    setPage(1);
                  }}
                  options={["All Warehouses", ...warehouseOptions]}
                />
                <FilterSelect
                  value={category}
                  onChange={(value) => {
                    setCategory(value);
                    setPage(1);
                  }}
                  options={["All Categories", ...categories]}
                />
                <FilterSelect
                  value={status}
                  onChange={(value) => {
                    setStatus(value);
                    setPage(1);
                  }}
                  options={[
                    "All Status",
                    "In Stock",
                    "Low Stock",
                    "Out of Stock",
                  ]}
                />

                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by SKU or product name..."
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={lowOnly}
                    onChange={(event) => {
                      setLowOnly(event.target.checked);
                      setPage(1);
                    }}
                    className="h-4 w-4 accent-blue-600"
                  />
                  Low Stock Only
                </label>
              </div>

              {(search ||
                warehouse !== "All Warehouses" ||
                category !== "All Categories" ||
                status !== "All Status" ||
                lowOnly) && (
                <button
                  onClick={resetFilters}
                  className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* Bulk actions */}
            {selected.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3">
                <span className="text-sm font-medium text-blue-800">
                  {selected.length} product(s) selected
                </span>
                <button
                  onClick={() => openAdjustment()}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <SlidersHorizontal size={14} />
                  Adjust Selected Stock
                </button>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="w-10 px-3 py-4">
                      <input
                        type="checkbox"
                        checked={
                          pageItems.length > 0 &&
                          pageItems.every((item) => selected.includes(item.id))
                        }
                        onChange={toggleAllVisible}
                        aria-label="Select all visible products"
                        className="h-4 w-4 accent-blue-600"
                      />
                    </th>
                    <th className="px-3 py-4">Product</th>
                    <th className="px-3 py-4">SKU</th>
                    <th className="px-3 py-4">Category</th>
                    <th className="px-3 py-4">Warehouse</th>
                    <th className="px-3 py-4 text-center">On Hand</th>
                    <th className="px-3 py-4 text-center">Reserved</th>
                    <th className="px-3 py-4 text-center">Available</th>
                    <th className="px-3 py-4 text-center">Safety Stock</th>
                    <th className="px-3 py-4">Status</th>
                    <th className="px-3 py-4 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {!loading && pageItems.map((item) => {
                    const available = Math.max(0, item.onHand - item.reserved);
                    const itemStatus = getStatus(item);

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-blue-50/40"
                      >
                        <td className="px-3 py-3.5">
                          <input
                            type="checkbox"
                            checked={selected.includes(item.id)}
                            onChange={() => toggleSelected(item.id)}
                            aria-label={`Select ${item.name}`}
                            className="h-4 w-4 accent-blue-600"
                          />
                        </td>

                        <td className="px-3 py-3.5">
                          <div className="flex min-w-[170px] items-center gap-3">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-11 w-11 rounded-lg border border-slate-100 bg-slate-50 object-cover"
                            />
                            <div>
                              <p className="font-medium text-slate-800">
                                {item.name}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {item.variant} | Color: {item.color}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-3 py-3.5 text-xs font-medium text-slate-600">
                          {item.sku}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-xs text-slate-600">
                          {item.category}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-xs text-slate-600">
                          {item.warehouse}
                        </td>
                        <td className="px-3 py-3.5 text-center font-semibold tabular-nums">
                          {formatNumber(item.onHand)}
                        </td>
                        <td className="px-3 py-3.5 text-center text-slate-600 tabular-nums">
                          {formatNumber(item.reserved)}
                        </td>
                        <td className="px-3 py-3.5 text-center font-semibold text-slate-800 tabular-nums">
                          {formatNumber(available)}
                        </td>
                        <td className="px-3 py-3.5 text-center text-slate-600 tabular-nums">
                          {item.safetyStock}
                        </td>
                        <td className="px-3 py-3.5">
                          <StatusBadge status={itemStatus} />
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openAdjustment(item)}
                              title="Adjust stock"
                              className="rounded-md p-2 text-blue-600 hover:bg-blue-50"
                            >
                              <SlidersHorizontal size={16} />
                            </button>
                            <button
                              onClick={() => setHistoryItem(item)}
                              title="View stock details"
                              className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                            >
                              <History size={16} />
                            </button>
                            <button
                              title="More actions"
                              onClick={() =>
                                setNotice(
                                  `${item.name}: ${item.onHand} on-hand, ${item.reserved} reserved, ${available} available.`,
                                )
                              }
                              className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                            >
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {loading && (
                    <tr>
                      <td colSpan={11} className="px-6 py-16 text-center text-sm text-slate-500">
                        Loading inventory...
                      </td>
                    </tr>
                  )}

                  {!loading && pageItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-6 py-16 text-center text-sm text-slate-500"
                      >
                        <Package className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                        No inventory products match your filters.
                        <button
                          onClick={resetFilters}
                          className="ml-1 font-semibold text-blue-600"
                        >
                          Clear filters
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4">
              <p className="text-xs text-slate-500">
                Showing{" "}
                {filteredItems.length === 0
                  ? 0
                  : (currentPage - 1) * pageSize + 1}{" "}
                to {Math.min(currentPage * pageSize, filteredItems.length)} of{" "}
                {filteredItems.length} products
              </p>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .slice(
                    Math.max(0, Math.min(currentPage - 3, totalPages - 5)),
                    Math.max(0, Math.min(currentPage - 3, totalPages - 5)) + 5,
                  )
                  .map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => setPage(pageNumber)}
                      className={`min-w-9 rounded-md border px-3 py-2 text-xs font-medium ${
                        currentPage === pageNumber
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}

                <button
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>

          {/* Right sidebar */}
          <aside className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-1">
            <Summary
              warehouseTotals={warehouseTotals}
              totalStock={totalStock}
              maxWarehouseStock={maxWarehouseStock}
            />

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CircleAlert className="h-5 w-5 text-rose-500" />
                  <h2 className="font-bold text-slate-800">Low Stock Alerts</h2>
                </div>
                <button
                  onClick={() => {
                    setLowOnly(true);
                    setPage(1);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  View All
                </button>
              </div>

              <div className="space-y-4">
                {lowStockItems.length === 0 && (
                  <p className="text-sm text-slate-500">No low-stock items.</p>
                )}

                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-10 w-10 rounded-lg border border-slate-100 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-700">
                        {item.name} ({item.sku})
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Safety stock: {item.safetyStock}
                      </p>
                    </div>
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ${
                        item.onHand === 0
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.onHand} left
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2 2xl:col-span-1">
              <h2 className="mb-4 font-bold text-slate-800">Quick Actions</h2>

              <div className="space-y-1">
                <QuickAction
                  icon={<Plus size={18} />}
                  title="Adjust Stock"
                  onClick={() => openAdjustment()}
                />
                <QuickAction
                  icon={<Package size={18} />}
                  title="View Low Stock"
                  onClick={() => {
                    setLowOnly(true);
                    setPage(1);
                  }}
                />
                <QuickAction
                  icon={<History size={18} />}
                  title="View Movement History"
                  onClick={() => {
                    const target =
                      items.find((item) => selected.includes(item.id)) ??
                      items[0];
                    setHistoryItem(target);
                  }}
                />
                <QuickAction
                  icon={<RefreshCw size={18} />}
                  title="Refresh Inventory"
                  onClick={() => void fetchInventory()}
                />
                <QuickAction
                  icon={<Download size={18} />}
                  title="Export Inventory"
                  onClick={exportCsv}
                />
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* Adjust stock modal */}
      {adjustItem && (
        <AdjustStockModal
          adjustItem={adjustItem}
          adjustment={adjustment}
          setAdjustment={setAdjustment}
          setAdjustItem={setAdjustItem}
          saveAdjustment={saveAdjustment}
          saving={savingAdjustment}
        />
      )}

      {/* Stock detail / movement history placeholder */}
      {historyItem && (
        <MovmentHistory
          historyItem={historyItem}
          setHistoryItem={setHistoryItem}
        />
      )}
    </main>
  );
}
