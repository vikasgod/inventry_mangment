"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  IndianRupee,
  Tag,
  Percent,
  Package,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Store,
  CalendarDays,
} from "lucide-react";

type Channel = "Website" | "Amazon" | "Flipkart" | "Meesho";

type Product = {
  _id: string;
  name: string;
  sku: string;
  category: string;
  image: string;
  mrp: number;
  costPrice: number;
  prices: Record<Channel, number>;
};

type Offer = {
  _id: string;
  name: string;
  code: string;
  type: "Percentage" | "Flat";
  value: number;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "SCHEDULED" | "EXPIRED";
  channel: string;
  products: string;
};

const channels: Channel[] = ["Website", "Amazon", "Flipkart", "Meesho"];

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function PricingOffersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"pricing" | "offers">("pricing");

  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("All Channels");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  const [pricingModal, setPricingModal] = useState<Product | null>(null);
  const [offerModal, setOfferModal] = useState(false);

  const ITEMS_PER_PAGE = 10;
  const [pricingPage, setPricingPage] = useState(1);
  const [offersPage, setOffersPage] = useState(1);
  const [pricingTotalPages, setPricingTotalPages] = useState(1);
  const [offersTotalPages, setOffersTotalPages] = useState(1);
  const [pricingTotal, setPricingTotal] = useState(0);
  const [offersTotal, setOffersTotal] = useState(0);

  const [offerForm, setOfferForm] = useState({
    name: "",
    code: "",
    type: "Percentage",
    value: "",
    startDate: "",
    endDate: "",
    channel: "All Channels",
    products: "All Products",
  });

  const loadPricing = async (page = 1, query = "") => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(ITEMS_PER_PAGE),
      q: query,
    });
    const response = await fetch(`/api/pricing?${params}`, {
      cache: "no-store",
    });
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to load pricing");
    setProducts(json.data ?? []);
    setPricingPage(json.pagination?.page ?? page);
    setPricingTotalPages(Math.max(1, json.pagination?.totalPages ?? 1));
    setPricingTotal(json.pagination?.total ?? 0);
  };

  const loadOffers = async (
    page = 1,
    query = "",
    channel = "All Channels",
    status = "All Statuses",
  ) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(ITEMS_PER_PAGE),
      q: query,
      channel,
      status,
    });
    const response = await fetch(`/api/offers?${params}`, {
      cache: "no-store",
    });
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to load offers");
    setOffers(json.data ?? []);
    setOffersPage(json.pagination?.page ?? page);
    setOffersTotalPages(Math.max(1, json.pagination?.totalPages ?? 1));
    setOffersTotal(json.pagination?.total ?? 0);
  };

  const loadPageData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPricing(pricingPage, tab === "pricing" ? search : ""),
        loadOffers(
          offersPage,
          tab === "offers" ? search : "",
          channelFilter,
          statusFilter,
        ),
      ]);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPageData();
  }, []);

  const activeOffers = offers.filter((o) => o.status === "ACTIVE").length;
  const scheduledOffers = offers.filter((o) => o.status === "SCHEDULED").length;

  const savePricing = async () => {
    if (!pricingModal || saving) return;

    setSaving(true);

    try {
      const response = await fetch("/api/pricing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: pricingModal._id,
          mrp: pricingModal.mrp,
          costPrice: pricingModal.costPrice,
          prices: pricingModal.prices,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || "Pricing save failed");
      }

      await loadPricing(pricingPage, search);
      setPricingModal(null);
      alert("Pricing saved successfully!");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  const createOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saving) return;

    setSaving(true);

    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...offerForm,
          value: Number(offerForm.value),
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || "Offer creation failed");
      }

      setOfferModal(false);
      setTab("offers");
      setSearch("");
      setChannelFilter("All Channels");
      setStatusFilter("All Statuses");
      await loadOffers(1, "", "All Channels", "All Statuses");

      setOfferForm({
        name: "",
        code: "",
        type: "Percentage",
        value: "",
        startDate: "",
        endDate: "",
        channel: "All Channels",
        products: "All Products",
      });

      alert("Offer created successfully!");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create offer");
    } finally {
      setSaving(false);
    }
  };

  const deleteOffer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) {
      return;
    }

    try {
      const response = await fetch(`/api/offers/${id}`, {
        method: "DELETE",
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || "Delete failed");
      }

      const nextTotal = Math.max(0, offersTotal - 1);
      const nextPage = Math.min(
        offersPage,
        Math.max(1, Math.ceil(nextTotal / ITEMS_PER_PAGE)),
      );
      await loadOffers(nextPage, search, channelFilter, statusFilter);
      alert("Offer deleted successfully!");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete offer");
    }
  };

  const statusBadge = (status: Offer["status"]) => {
    const styles = {
      ACTIVE: "bg-green-50 text-green-700 border-green-200",
      SCHEDULED: "bg-amber-50 text-amber-700 border-amber-200",
      EXPIRED: "bg-slate-100 text-slate-500 border-slate-200",
    };

    return (
      <span
        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-5 md:p-7">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Pricing & Offers
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage product prices, discounts and promotional offers
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={() => void loadPageData()}>
              <RefreshCw size={17} />
              Refresh
            </button>

            <button
              onClick={() => {
                if (tab === "offers") setOfferModal(true);
                else
                  setPricingModal(
                    products[0]
                      ? { ...products[0], prices: { ...products[0].prices } }
                      : null,
                  );
              }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus size={18} />
              {tab === "pricing" ? "Edit Pricing" : "Create Offer"}
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Products",
              value: pricingTotal,
              icon: Package,
              color: "blue",
            },
            {
              label: "Active Offers",
              value: activeOffers,
              icon: CheckCircle2,
              color: "green",
            },
            {
              label: "Discounted Products",
              value: products.filter(
                (p) => p.mrp > Math.min(...Object.values(p.prices)),
              ).length,
              icon: Percent,
              color: "orange",
            },
            {
              label: "Scheduled Offers",
              value: scheduledOffers,
              icon: Clock3,
              color: "red",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    item.color === "blue"
                      ? "bg-blue-50 text-blue-600"
                      : item.color === "green"
                        ? "bg-green-50 text-green-600"
                        : item.color === "orange"
                          ? "bg-orange-50 text-orange-600"
                          : "bg-rose-50 text-rose-600"
                  }`}
                >
                  <item.icon size={23} />
                </div>
                <span className="text-xs text-slate-400">All channels</span>
              </div>

              <p className="mt-5 text-sm text-slate-500">{item.label}</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                {item.value}
              </h2>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="rounded-xl border border-slate-200 bg-white px-5 pt-4 shadow-sm">
          <div className="flex gap-7 border-b border-slate-200">
            <button
              onClick={() => {
                setTab("pricing");
                setSearch("");
                setPricingPage(1);
                void loadPricing(1, "");
              }}
              className={`flex items-center gap-2 border-b-2 pb-4 text-sm font-semibold ${
                tab === "pricing"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <IndianRupee size={17} />
              Product Pricing
            </button>

            <button
              onClick={() => {
                setTab("offers");
                setSearch("");
                setOffersPage(1);
                void loadOffers(1, "", channelFilter, statusFilter);
              }}
              className={`flex items-center gap-2 border-b-2 pb-4 text-sm font-semibold ${
                tab === "offers"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Tag size={17} />
              Offers & Discounts
            </button>
          </div>
        </div>
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            Loading pricing and offers...
          </div>
        ) : (
          <>
            {/* Pricing Table */}
            {tab === "pricing" && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 lg:grid-cols-2">
                  <select
                    value={channelFilter}
                    onChange={(e) => setChannelFilter(e.target.value)}
                    className={inputClass}
                  >
                    <option>All Channels</option>
                    {channels.map((c) => (
                      <option key={c}>{c}</option>
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

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1150px] text-left">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Product</th>
                        <th className="px-4 py-4">SKU</th>
                        <th className="px-4 py-4">MRP</th>
                        <th className="px-4 py-4">Cost Price</th>
                        <th className="px-4 py-4">Website</th>
                        <th className="px-4 py-4">Amazon</th>
                        <th className="px-4 py-4">Flipkart</th>
                        <th className="px-4 py-4">Meesho</th>
                        <th className="px-4 py-4">Discount</th>
                        <th className="px-5 py-4 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {products.map((product) => {
                        const lowestPrice = Math.min(
                          ...Object.values(product.prices),
                        );
                        const discount =
                          product.mrp > 0
                            ? Math.round((1 - lowestPrice / product.mrp) * 100)
                            : 0;

                        return (
                          <tr key={product._id} className="hover:bg-slate-50">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="h-11 w-11 rounded-lg border border-slate-200 object-cover"
                                />
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
                                {money(product.prices[channel])}
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
                            colSpan={10}
                            className="p-10 text-center text-sm text-slate-500"
                          >
                            No products found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4">
                  <p className="text-xs text-slate-500">
                    Showing{" "}
                    {pricingTotal === 0
                      ? 0
                      : (pricingPage - 1) * ITEMS_PER_PAGE + 1}{" "}
                    to {Math.min(pricingPage * ITEMS_PER_PAGE, pricingTotal)} of{" "}
                    {pricingTotal} products
                  </p>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => void loadPricing(pricingPage - 1, search)}
                      disabled={pricingPage === 1}
                      aria-label="Previous page"
                      className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {Array.from(
                      { length: pricingTotalPages },
                      (_, index) => index + 1,
                    )
                      .slice(
                        Math.max(
                          0,
                          Math.min(pricingPage - 3, pricingTotalPages - 5),
                        ),
                        Math.max(
                          0,
                          Math.min(pricingPage - 3, pricingTotalPages - 5),
                        ) + 5,
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
                        pricingPage === pricingTotalPages ||
                        pricingTotalPages === 0
                      }
                      aria-label="Next page"
                      className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Offers Table */}
            {tab === "offers" && (
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
                      <option>All Channels</option>
                      {channels.map((c) => (
                        <option key={c}>{c}</option>
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
                      <option>All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  </div>

                  <div className="relative md:w-72">
                    <Search
                      className="absolute left-3 top-3 text-slate-400"
                      size={17}
                    />
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
                      {offers.map((offer) => (
                        <tr key={offer._id} className="hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {offer.name}
                            </p>
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
                          <td className="px-4 py-4">
                            {statusBadge(offer.status)}
                          </td>
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
                    {offersTotal === 0
                      ? 0
                      : (offersPage - 1) * ITEMS_PER_PAGE + 1}{" "}
                    to {Math.min(offersPage * ITEMS_PER_PAGE, offersTotal)} of{" "}
                    {offersTotal} offers
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
                      disabled={offersPage === 1}
                      aria-label="Previous page"
                      className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {Array.from(
                      { length: offersTotalPages },
                      (_, index) => index + 1,
                    )
                      .slice(
                        Math.max(
                          0,
                          Math.min(offersPage - 3, offersTotalPages - 5),
                        ),
                        Math.max(
                          0,
                          Math.min(offersPage - 3, offersTotalPages - 5),
                        ) + 5,
                      )
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
                      disabled={
                        offersPage === offersTotalPages ||
                        offersTotalPages === 0
                      }
                      aria-label="Next page"
                      className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {/* Marketplace Connection Status */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 font-semibold text-slate-900">
            <Store size={19} className="text-blue-600" />
            Marketplace Pricing Connection Status
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {channels.map((channel) => (
              <div
                key={channel}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-4"
              >
                <div>
                  <p className="font-semibold text-slate-800">{channel}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Connector setup required
                  </p>
                </div>
                <Store size={23} className="text-slate-400" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Pricing Modal */}
      {pricingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
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
                onClick={() => setPricingModal(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
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
                        value={pricingModal.prices[channel]}
                        onChange={(e) =>
                          setPricingModal({
                            ...pricingModal,
                            prices: {
                              ...pricingModal.prices,
                              [channel]: Number(e.target.value),
                            },
                          })
                        }
                        className={`${inputClass} mt-2`}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-800">Website Discount</p>
                <p className="mt-1 text-xl font-bold text-blue-700">
                  {pricingModal.mrp > 0
                    ? Math.round(
                        (1 - pricingModal.prices.Website / pricingModal.mrp) *
                          100,
                      )
                    : 0}
                  %
                </p>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  onClick={() => setPricingModal(null)}
                  className="rounded-lg border px-5 py-2.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void savePricing()}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Pricing"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Offer Modal */}
      {offerModal && (
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
                      setOfferForm({ ...offerForm, type: e.target.value })
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
                    value={offerForm.value}
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, value: e.target.value })
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
                      setOfferForm({ ...offerForm, channel: e.target.value })
                    }
                    className={`${inputClass} mt-2`}
                  >
                    <option>All Channels</option>
                    {channels.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Applicable Products
                  <select
                    value={offerForm.products}
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, products: e.target.value })
                    }
                    className={`${inputClass} mt-2`}
                  >
                    <option>All Products</option>
                    <option>Electronics</option>
                    <option>Sports</option>
                    <option>Accessories</option>
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
                      setOfferForm({ ...offerForm, startDate: e.target.value })
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
                      setOfferForm({ ...offerForm, endDate: e.target.value })
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
      )}
    </div>
  );
}
