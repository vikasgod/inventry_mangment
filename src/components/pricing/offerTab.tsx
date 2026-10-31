import React from "react";
import { Search, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { money } from "../commonAndSmallFuc";

interface Props {
  channelFilter: string;
  setChannelFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  inputClass: string;
  channels: string[];
  offers: any;
  loadOffers: (
    page: number,
    search: string,
    channel: string,
    status: string,
  ) => Promise<void> | void;
  deleteOffer: (id: string) => void;
  statusBadge: any;
  offersTotal: number;
  offersPage: number;
  offersTotalPages: number;
  ITEMS_PER_PAGE: number;
}

function OfferTab({
  channelFilter,
  setChannelFilter,
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
  inputClass,
  channels,
  offers,
  loadOffers,
  deleteOffer,
  statusBadge,
  offersTotal,
  offersPage,
  offersTotalPages,
  ITEMS_PER_PAGE,
}: Props) {
  const startPage = Math.max(0, Math.min(offersPage - 3, offersTotalPages - 5));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 md:flex-row">
        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
          <select
            value={channelFilter}
            onChange={(e) => {
              const value = e.target.value;
              setChannelFilter(value);
              void loadOffers(1, search, value, statusFilter);
            }}
            className={inputClass}
          >
            <option value="All Channels">All Channels</option>
            {channels.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              const value = e.target.value;
              setStatusFilter(value);
              void loadOffers(1, search, channelFilter, value);
            }}
            className={inputClass}
          >
            <option value="All Statuses">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        <div className="relative md:w-72">
          <Search className="absolute left-3 top-3 text-slate-400" size={17} />
          <input
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);
              void loadOffers(1, value, channelFilter, statusFilter);
            }}
            placeholder="Search offer or coupon..."
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] text-left">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-4">Offer Name</th>
              <th className="px-4 py-4">Coupon Code</th>
              <th className="px-4 py-4">Discount</th>
              <th className="px-4 py-4">Channel</th>
              <th className="px-4 py-4">Start Date</th>
              <th className="px-4 py-4">End Date</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {offers.map((offer: any) => (
              <tr key={offer._id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-900">{offer.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {offer.products}
                  </p>
                </td>

                <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                  {offer.code || "—"}
                </td>

                <td className="px-4 py-4 font-semibold text-slate-800">
                  {offer.type === "Percentage"
                    ? `${offer.value}%`
                    : money(offer.value)}
                </td>

                <td className="px-4 py-4 text-sm text-slate-600">
                  {offer.channel}
                </td>

                <td className="px-4 py-4 text-sm text-slate-600">
                  {offer.startDate}
                </td>

                <td className="px-4 py-4 text-sm text-slate-600">
                  {offer.endDate}
                </td>

                <td className="px-4 py-4">{statusBadge(offer.status)}</td>

                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => deleteOffer(offer._id)}
                      className="rounded-lg border border-slate-200 p-2 text-red-500 hover:bg-red-50"
                      title="Delete offer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {offers.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="p-10 text-center text-sm text-slate-500"
                >
                  No offers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4">
        <p className="text-xs text-slate-500">
          Showing{" "}
          {offersTotal === 0 ? 0 : (offersPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
          {Math.min(offersPage * ITEMS_PER_PAGE, offersTotal)} of {offersTotal}{" "}
          offers
        </p>

        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              void loadOffers(
                offersPage - 1,
                search,
                channelFilter,
                statusFilter,
              )
            }
            disabled={offersPage <= 1}
            aria-label="Previous page"
            className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: offersTotalPages }, (_, index) => index + 1)
            .slice(startPage, startPage + 5)
            .map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() =>
                  void loadOffers(
                    pageNumber,
                    search,
                    channelFilter,
                    statusFilter,
                  )
                }
                className={`min-w-9 rounded-md border px-3 py-2 text-xs font-medium ${
                  offersPage === pageNumber
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {pageNumber}
              </button>
            ))}

          <button
            onClick={() =>
              void loadOffers(
                offersPage + 1,
                search,
                channelFilter,
                statusFilter,
              )
            }
            disabled={offersPage >= offersTotalPages || offersTotalPages === 0}
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

export default OfferTab;
