import { X } from "lucide-react";
import React from "react";

import { Adjustment, InventoryItem } from "@/components/dataType";

interface Props {
  adjustItem: InventoryItem;
  adjustment: Adjustment;
  setAdjustment: React.Dispatch<React.SetStateAction<Adjustment>>;
  setAdjustItem: React.Dispatch<React.SetStateAction<InventoryItem | null>>;
  saveAdjustment: () => void;
}

function AdjustStockModal({
  adjustItem,
  adjustment,
  setAdjustment,
  setAdjustItem,
  saveAdjustment,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setAdjustItem(null);
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjust-stock-title"
        className="my-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2
              id="adjust-stock-title"
              className="text-xl font-bold text-slate-900"
            >
              Adjust Stock
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update the inventory quantity.
            </p>
          </div>

          <button onClick={() => setAdjustItem(null)} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <img
            src={adjustItem.image}
            alt={adjustItem.name}
            className="h-12 w-12 rounded-lg object-cover"
          />

          <div>
            <p className="font-semibold">{adjustItem.name}</p>
            <p className="text-xs text-slate-500">
              {adjustItem.sku} · {adjustItem.warehouse}
            </p>
            <p className="text-xs">
              Current: <strong>{adjustItem.onHand}</strong> units
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label>Adjustment Type</label>
            <select
              value={adjustment.type}
              onChange={(e) =>
                setAdjustment({
                  ...adjustment,
                  type: e.target.value as Adjustment["type"],
                })
              }
              className="w-full rounded-lg border p-2.5"
            >
              <option value="add">Add Stock</option>
              <option value="remove">Remove Stock</option>
              <option value="set">Set Exact Quantity</option>
            </select>
          </div>

          <div>
            <label>
              {adjustment.type === "set" ? "New Total Quantity" : "Quantity"}
            </label>

            <input
              type="number"
              min="0"
              step="1"
              value={adjustment.quantity}
              onChange={(e) =>
                setAdjustment({
                  ...adjustment,
                  quantity: e.target.value,
                })
              }
              className="w-full rounded-lg border p-2.5"
              placeholder="Enter quantity"
            />
          </div>

          <div>
            <label>Reason</label>
            <select
              value={adjustment.reason}
              onChange={(e) =>
                setAdjustment({
                  ...adjustment,
                  reason: e.target.value,
                })
              }
              className="w-full rounded-lg border p-2.5"
            >
              <option>Stock replenishment</option>
              <option>Damaged goods</option>
              <option>Stock correction</option>
              <option>Returned goods</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setAdjustItem(null)}>Cancel</button>

          <button onClick={saveAdjustment}>Save Adjustment</button>
        </div>
      </section>
    </div>
  );
}

export default AdjustStockModal;
