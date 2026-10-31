
import { ChevronLeft, ChevronRight, Pencil, Search } from "lucide-react";
import React from "react";
import { money } from "../commonAndSmallFuc";

interface PricingProduct {
  _id: string;
  name: string;
  sku: string;
  category: string;
  image: string;
  mrp: number;
  costPrice: number;
  prices: Record<string, number>;
}

interface Props {
  channelFilter: string;
  setChannelFilter: (value: string) => void;
  inputClass: string;
  channels: string[];
  search: string;
  setSearch: (value: string) => void;
  loadPricing: (page?: number, search?: string) => Promise<void> | void;
  products: PricingProduct[];
  setPricingModal: (product: PricingProduct) => void;
  pricingTotal: number;
  pricingPage: number;
  ITEMS_PER_PAGE: number;
  pricingTotalPages: number;
}

function PricingTab({
  channelFilter,
  setChannelFilter,
  inputClass,
  channels,
  search,
  setSearch,
  loadPricing,
  products,
  setPricingModal,
  pricingTotal,
  pricingPage,
  ITEMS_PER_PAGE,
  pricingTotalPages,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 lg:grid-cols-2">
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className={inputClass}
        >
          <option value="All Channels">All Channels</option>
          {channels.map((channel) => (
            <option key={channel} value={channel}>
              {channel}
            </option>
          ))}
        </select>

        <div className="relative">
          <Search
            className="absolute left-3 top-3 text-slate-400"
            size={17}
          />
          <input
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);
              void loadPricing(1, value);
            }}
            placeholder="Search product or SKU..."
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      {/* Pricing Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1150px] text-left">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-4">Product</th>
              <th className="px-4 py-4">SKU</th>
              <th className="px-4 py-4">MRP</th>
              <th className="px-4 py-4">Cost Price</th>
              {channels.map((channel) => (
                <th key={channel} className="px-4 py-4">
                  {channel}
                </th>
              ))}
              <th className="px-4 py-4">Discount</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {products.map((product) => {
              const validPrices = Object.values(product.prices || {})
                .filter((price) => typeof price === "number" && price > 0);

              const lowestPrice = validPrices.length
                ? Math.min(...validPrices)
                : product.mrp;

              const discount =
                product.mrp > 0
                  ? Math.max(
                      0,
                      Math.round((1 - lowestPrice / product.mrp) * 100)
                    )
                  : 0;

              return (
                <tr key={product._id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-11 w-11 rounded-lg border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                          N/A
                        </div>
                      )}

                      <div>
                        <p className="font-semibold text-slate-900">
                          {product.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {product.category}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">
                    {product.sku}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">
                    {money(product.mrp)}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">
                    {money(product.costPrice)}
                  </td>

                  {channels.map((channel) => (
                    <td
                      key={channel}
                      className="px-4 py-4 text-sm font-semibold text-slate-800"
                    >
                      {money(product.prices?.[channel] ?? 0)}
                    </td>
                  ))}

                  <td className="px-4 py-4">
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      {discount}%
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() =>
                          setPricingModal({
                            ...product,
                            prices: { ...product.prices },
                          })
                        }
                        className="rounded-lg border border-slate-200 p-2 text-blue-600 hover:bg-blue-50"
                        title="Edit Pricing"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {products.length === 0 && (
              <tr>
                <td
                  colSpan={channels.length + 6}
                  className="p-10 text-center text-sm text-slate-500"
                >
                  No products found.
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
          {pricingTotal === 0
            ? 0
            : (pricingPage - 1) * ITEMS_PER_PAGE + 1}{" "}
          to{" "}
          {Math.min(pricingPage * ITEMS_PER_PAGE, pricingTotal)} of{" "}
          {pricingTotal} products
        </p>

        <div className="flex items-center gap-1">
          <button
            onClick={() => void loadPricing(pricingPage - 1, search)}
            disabled={pricingPage <= 1}
            aria-label="Previous page"
            className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from(
            { length: pricingTotalPages },
            (_, index) => index + 1
          )
            .slice(
              Math.max(
                0,
                Math.min(pricingPage - 3, pricingTotalPages - 5)
              ),
              Math.max(
                0,
                Math.min(pricingPage - 3, pricingTotalPages - 5)
              ) + 5
            )
            .map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => void loadPricing(pageNumber, search)}
                className={`min-w-9 rounded-md border px-3 py-2 text-xs font-medium ${
                  pricingPage === pageNumber
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {pageNumber}
              </button>
            ))}

          <button
            onClick={() => void loadPricing(pricingPage + 1, search)}
            disabled={
              pricingPage >= pricingTotalPages || pricingTotalPages === 0
            }
            aria-label="Next page"
            className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PricingTab;
