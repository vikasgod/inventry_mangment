import { History, X } from "lucide-react";
import React from "react";
import { DetailBox } from "./smallComponent";
import { InventoryItem } from "../dataType";

interface Props {
  historyItem: any;
  setHistoryItem: React.Dispatch<React.SetStateAction<InventoryItem | null>>;
}
function MovmentHistory({ historyItem, setHistoryItem }: Props) {
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

        <div className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <History className="mb-2 h-5 w-5" />
          This demo shows current stock only. A persistent movement history
          requires a stock movement API and database collection.
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
