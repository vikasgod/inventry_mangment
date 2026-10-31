
import React from "react";
import { X } from "lucide-react";

interface PricingData {
  _id: string;
  name: string;
  sku: string;
  mrp: number;
  costPrice: number;
  prices: Record<string, number>;
}

interface Props {
  pricingModal: PricingData;
  setPricingModal: any;
  channels: string[];
  inputClass: string;
  saving: boolean;
  savePricing: () => Promise<void> | void;
}

function PricingModal({
  pricingModal,
  setPricingModal,
  channels,
  inputClass,
  saving,
  savePricing,
}: Props) {
  const updatePrice = (channel: string, value: number) => {
    setPricingModal({
      ...pricingModal,
      prices: {
        ...pricingModal.prices,
        [channel]: value,
      },
    });
  };

  const websiteDiscount =
    pricingModal.mrp > 0
      ? Math.round(
          (1 -
            (pricingModal.prices?.Website ?? 0) /
              pricingModal.mrp) *
            100
        )
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Edit Product Pricing
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {pricingModal.name} · {pricingModal.sku}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPricingModal(null)}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Basic Pricing */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              MRP
              <input
                type="number"
                min="0"
                value={pricingModal.mrp}
                onChange={(e) =>
                  setPricingModal({
                    ...pricingModal,
                    mrp: Number(e.target.value),
                  })
                }
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Cost Price
              <input
                type="number"
                min="0"
                value={pricingModal.costPrice}
                onChange={(e) =>
                  setPricingModal({
                    ...pricingModal,
                    costPrice: Number(e.target.value),
                  })
                }
                className={`${inputClass} mt-2`}
              />
            </label>
          </div>

          {/* Channel Pricing */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              Channel-wise Selling Price
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {channels.map((channel) => (
                <label
                  key={channel}
                  className="text-sm font-medium text-slate-700"
                >
                  {channel} Price

                  <input
                    type="number"
                    min="0"
                    value={pricingModal.prices?.[channel] ?? 0}
                    onChange={(e) =>
                      updatePrice(channel, Number(e.target.value))
                    }
                    className={`${inputClass} mt-2`}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Discount */}
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              Website Discount
            </p>

            <p className="mt-1 text-xl font-bold text-blue-700">
              {websiteDiscount}%
            </p>

            <p className="mt-1 text-xs text-blue-600">
              MRP: ₹{pricingModal.mrp} · Website Price: ₹
              {pricingModal.prices?.Website ?? 0}
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={() => setPricingModal(null)}
              className="rounded-lg border px-5 py-2.5 text-sm"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => void savePricing()}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Pricing"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PricingModal;
