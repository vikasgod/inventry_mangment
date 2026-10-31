import React from "react";
import { X } from "lucide-react";

interface OfferForm {
  name: string;
  type: "Percentage" | "Flat";
  value: string | number;
  code: string;
  channel: string;
  products: string;
  startDate: string;
  endDate: string;
}

interface Props {
  offerForm: OfferForm;
  setOfferForm: any;
  createOffer: (e: React.FormEvent<HTMLFormElement>) => void;
  setOfferModal: (value: boolean) => void;
  inputClass: string;
  channels: string[];
  saving: boolean;
}

function OfferModal({
  offerForm,
  setOfferForm,
  createOffer,
  setOfferModal,
  inputClass,
  channels,
  saving,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <form
        onSubmit={createOffer}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Create New Offer
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Configure a promotional discount
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOfferModal(false)}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <label className="block text-sm font-medium text-slate-700">
            Offer Name
            <input
              required
              value={offerForm.name}
              onChange={(e) =>
                setOfferForm({ ...offerForm, name: e.target.value })
              }
              placeholder="e.g. Diwali Sale"
              className={`${inputClass} mt-2`}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Discount Type
              <select
                value={offerForm.type}
                onChange={(e) =>
                  setOfferForm({
                    ...offerForm,
                    type: e.target.value as OfferForm["type"],
                  })
                }
                className={`${inputClass} mt-2`}
              >
                <option value="Percentage">Percentage</option>
                <option value="Flat">Flat Amount</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Discount Value
              <input
                required
                type="number"
                min="1"
                max={offerForm.type === "Percentage" ? 100 : undefined}
                value={offerForm.value}
                onChange={(e) =>
                  setOfferForm({
                    ...offerForm,
                    value: e.target.value,
                  })
                }
                placeholder="Enter value"
                className={`${inputClass} mt-2`}
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Coupon Code
            <input
              value={offerForm.code}
              onChange={(e) =>
                setOfferForm({
                  ...offerForm,
                  code: e.target.value.toUpperCase(),
                })
              }
              placeholder="DIWALI20"
              className={`${inputClass} mt-2`}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Applicable Channel
              <select
                value={offerForm.channel}
                onChange={(e) =>
                  setOfferForm({
                    ...offerForm,
                    channel: e.target.value,
                  })
                }
                className={`${inputClass} mt-2`}
              >
                <option value="All Channels">All Channels</option>
                {channels.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Applicable Products
              <select
                value={offerForm.products}
                onChange={(e) =>
                  setOfferForm({
                    ...offerForm,
                    products: e.target.value,
                  })
                }
                className={`${inputClass} mt-2`}
              >
                <option value="All Products">All Products</option>
                <option value="Electronics">Electronics</option>
                <option value="Sports">Sports</option>
                <option value="Accessories">Accessories</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Start Date
              <input
                required
                type="date"
                value={offerForm.startDate}
                onChange={(e) =>
                  setOfferForm({
                    ...offerForm,
                    startDate: e.target.value,
                    endDate:
                      offerForm.endDate && offerForm.endDate < e.target.value
                        ? ""
                        : offerForm.endDate,
                  })
                }
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              End Date
              <input
                required
                type="date"
                min={offerForm.startDate || undefined}
                value={offerForm.endDate}
                onChange={(e) =>
                  setOfferForm({
                    ...offerForm,
                    endDate: e.target.value,
                  })
                }
                className={`${inputClass} mt-2`}
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t p-5">
          <button
            type="button"
            onClick={() => setOfferModal(false)}
            className="rounded-lg border px-5 py-2.5 text-sm"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create Offer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default OfferModal;
