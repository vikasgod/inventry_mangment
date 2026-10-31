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
import PricingTab from "@/components/pricing/pricingTab";
import OfferTab from "@/components/pricing/offerTab";
import OfferModal from "@/components/pricing/offerModal";
import PricingModal from "@/components/pricing/pricingModal";

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
  const initialOfferForm = {
    name: "",
    type: "Percentage" as "Percentage" | "Flat",
    value: "",
    code: "",
    channel: "All Channels",
    products: "All Products",
    startDate: "",
    endDate: "",
  };

  const [offerForm, setOfferForm] = useState(initialOfferForm);

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
              <PricingTab
                channelFilter={channelFilter}
                setChannelFilter={setChannelFilter}
                inputClass={inputClass}
                channels={channels}
                search={search}
                setSearch={setSearch}
                loadPricing={loadPricing}
                products={products}
                setPricingModal={setPricingModal}
                pricingTotal={pricingTotal}
                pricingPage={pricingPage}
                ITEMS_PER_PAGE={ITEMS_PER_PAGE}
                pricingTotalPages={pricingTotalPages}
              />
            )}

            {/* Offers Table */}
            {tab === "offers" && (
              <OfferTab
                channelFilter={channelFilter}
                setChannelFilter={setChannelFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                search={search}
                setSearch={setSearch}
                inputClass={inputClass}
                channels={channels}
                offers={offers}
                loadOffers={loadOffers}
                deleteOffer={deleteOffer}
                statusBadge={statusBadge}
                offersTotal={offersTotal}
                offersPage={offersPage}
                offersTotalPages={offersTotalPages}
                ITEMS_PER_PAGE={ITEMS_PER_PAGE}
              />
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
        <PricingModal
          pricingModal={pricingModal}
          setPricingModal={setPricingModal}
          channels={channels}
          inputClass={inputClass}
          saving={saving}
          savePricing={savePricing}
        />
      )}

      {/* Create Offer Modal */}
      {offerModal && (
        <OfferModal
          offerForm={offerForm}
          setOfferForm={setOfferForm}
          createOffer={createOffer}
          setOfferModal={setOfferModal}
          inputClass={inputClass}
          channels={channels}
          saving={saving}
        />
      )}
    </div>
  );
}
