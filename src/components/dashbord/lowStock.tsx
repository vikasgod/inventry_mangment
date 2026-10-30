import React from "react";
import { number } from "./smallComponents";

function LowStock({
  loading,
  lowStockProducts,
}: {
  loading: boolean;
  lowStockProducts: any;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Inventory Alerts</h2>
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
              lowStockProducts.map((product: any) => {
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
  );
}

export default LowStock;
