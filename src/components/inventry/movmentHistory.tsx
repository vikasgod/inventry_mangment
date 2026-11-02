import { History, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { DetailBox } from "./smallComponent";
import { InventoryItem } from "../dataType";

type Movement = {
  id: string;
  type: "add" | "remove" | "set";
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
};

interface Props {
  historyItem: InventoryItem;
  setHistoryItem: React.Dispatch<React.SetStateAction<InventoryItem | null>>;
}

function MovmentHistory({ historyItem, setHistoryItem }: Props) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMovements() {
      try {
        const params = new URLSearchParams({
          warehouse: historyItem.warehouse,
        });
        if (historyItem.productId) {
          params.set("productId", historyItem.productId);
        }
        const response = await fetch(
          `/api/inventory/movements?${params.toString()}`,
          { cache: "no-store" }
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load stock movements.");
        }

        if (active) setMovements(result.data);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load stock movements."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadMovements();
    return () => {
      active = false;
    };
  }, [historyItem.productId, historyItem.warehouse]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-detail-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2
              id="stock-detail-title"
              className="text-xl font-bold text-slate-900"
            >
              Stock Details
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {historyItem.name} · {historyItem.sku}
            </p>
          </div>
          <button
            onClick={() => setHistoryItem(null)}
            aria-label="Close details"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DetailBox label="On Hand" value={historyItem.onHand} />
          <DetailBox label="Reserved" value={historyItem.reserved} />
          <DetailBox
            label="Available"
            value={Math.max(0, historyItem.onHand - historyItem.reserved)}
          />
          <DetailBox label="Safety Stock" value={historyItem.safetyStock} />
        </div>

        <div className="mt-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <History size={16} />
            Recent movements
          </h3>
          {loading && (
            <p className="text-sm text-slate-500">Loading movements...</p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600">{error}</p>
          )}
          {!loading && !error && movements.length === 0 && (
            <p className="text-sm text-slate-500">No stock movements yet.</p>
          )}
          {!loading && !error && movements.length > 0 && (
            <ul className="max-h-56 space-y-3 overflow-y-auto">
              {movements.map((movement) => (
                <li
                  key={movement.id}
                  className="rounded-lg border border-slate-100 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium capitalize text-slate-800">
                      {movement.type} · {movement.quantity} units
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(movement.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {movement.previousStock} → {movement.newStock} · {movement.reason}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={() => setHistoryItem(null)}
          className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Close
        </button>
      </section>
    </div>
  );
}

export default MovmentHistory;
