import { XCircle } from "lucide-react";
import React from "react";

interface Props {
  selected: any;
  saving:boolean;
  setConfirmCancel: React.Dispatch<
    React.SetStateAction<boolean>
  >;
  updateOrder:any
}
function ConfirmationCancelModal({selected,saving,setConfirmCancel,updateOrder}:Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
          <XCircle size={24} />
        </div>

        <h3 id="cancel-title" className="text-lg font-bold">
          Cancel this order?
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Are you sure you want to cancel{" "}
          <strong>{selected.orderNumber}</strong>? This will change its status
          to Cancelled.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => setConfirmCancel(false)}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Keep Order
          </button>

          <button
            disabled={saving}
            onClick={() =>
              void updateOrder({
                status: "Cancelled",
                note: "Cancelled by admin",
              })
            }
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Cancelling..." : "Yes, Cancel Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationCancelModal;
