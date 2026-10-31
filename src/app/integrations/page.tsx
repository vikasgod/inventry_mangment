"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Globe,
  ShoppingBag,
  Truck,
  CreditCard,
  MessageCircle,
  Plug,
  ExternalLink,
} from "lucide-react";

type Integration = {
  _id: string;
  provider: string;
  category: string;
  accountName: string;
  storeUrl: string;
  sellerId: string;
  status: "Not Connected" | "Configured" | "Error";
  syncEnabled: boolean;
  lastSyncAt?: string | null;
  lastActivity?: string;
  activity?: {
    message: string;
    type: string;
    createdAt: string;
  }[];
};

const pageSize = 6;

const providerInfo: Record<
  string,
  { description: string; icon: React.ReactNode; color: string }
> = {
  Amazon: {
    description: "Manage Amazon marketplace listings and orders.",
    icon: <ShoppingBag size={22} />,
    color: "bg-orange-50 text-orange-600",
  },
  Flipkart: {
    description: "Connect your Flipkart seller account.",
    icon: <ShoppingBag size={22} />,
    color: "bg-yellow-50 text-yellow-600",
  },
  Meesho: {
    description: "Manage Meesho products and marketplace orders.",
    icon: <ShoppingBag size={22} />,
    color: "bg-pink-50 text-pink-600",
  },
  Website: {
    description: "Connect your own e-commerce website.",
    icon: <Globe size={22} />,
    color: "bg-blue-50 text-blue-600",
  },
  Shiprocket: {
    description: "Manage shipments and delivery operations.",
    icon: <Truck size={22} />,
    color: "bg-purple-50 text-purple-600",
  },
  Razorpay: {
    description: "Manage online payments and payment records.",
    icon: <CreditCard size={22} />,
    color: "bg-indigo-50 text-indigo-600",
  },
  WhatsApp: {
    description: "Connect WhatsApp Business communication.",
    icon: <MessageCircle size={22} />,
    color: "bg-green-50 text-green-600",
  },
};

const categoryOptions = [
  "All",
  "Marketplace",
  "Website",
  "Shipping",
  "Payment",
  "Communication",
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [saving, setSaving] = useState(false);

  const [activityItem, setActivityItem] = useState<Integration | null>(null);
  const [activity, setActivity] = useState<Integration["activity"]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [form, setForm] = useState({
    provider: "",
    accountName: "",
    storeUrl: "",
    sellerId: "",
    syncEnabled: false,
  });

  const [notice, setNotice] = useState("");

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/integrations", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch integrations");
      }

      setIntegrations(result.data || []);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const filteredItems = useMemo(() => {
    return integrations.filter((item) => {
      const matchesSearch =
        item.provider.toLowerCase().includes(search.toLowerCase()) ||
        item.accountName?.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        category === "All" || item.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [integrations, search, category]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const configuredCount = integrations.filter(
    (item) => item.status === "Configured"
  ).length;

  const notConnectedCount = integrations.filter(
    (item) => item.status === "Not Connected"
  ).length;

  const errorCount = integrations.filter(
    (item) => item.status === "Error"
  ).length;

  const openAdd = () => {
    setEditing(null);
    setForm({
      provider: "",
      accountName: "",
      storeUrl: "",
      sellerId: "",
      syncEnabled: false,
    });
    setModalOpen(true);
  };

  const openEdit = (item: Integration) => {
    setEditing(item);
    setForm({
      provider: item.provider,
      accountName: item.accountName || "",
      storeUrl: item.storeUrl || "",
      sellerId: item.sellerId || "",
      syncEnabled: item.syncEnabled,
    });
    setModalOpen(true);
  };

  const saveIntegration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.provider) {
      setNotice("Please select an integration.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to save integration");
      }

      setModalOpen(false);
      setNotice("Integration configuration saved successfully.");
      await fetchIntegrations();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  };

  const disconnectIntegration = async (item: Integration) => {
    if (!window.confirm(`Disconnect ${item.provider}?`)) return;

    try {
      const response = await fetch(`/api/integrations/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Not Connected",
          syncEnabled: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to disconnect");
      }

      setNotice(`${item.provider} disconnected.`);
      await fetchIntegrations();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  };

  const deleteIntegration = async (item: Integration) => {
    if (!window.confirm(`Remove ${item.provider} configuration?`)) return;

    try {
      const response = await fetch(`/api/integrations/${item._id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete integration");
      }

      setNotice("Integration removed successfully.");
      await fetchIntegrations();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  };

  const requestSync = async (item: Integration) => {
    try {
      const response = await fetch(
        `/api/integrations/${item._id}/activity`,
        { method: "POST" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to request sync");
      }

      setNotice(result.message);
      await fetchIntegrations();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  };

  const openActivity = async (item: Integration) => {
    setActivityItem(item);
    setActivity([]);
    setActivityLoading(true);

    try {
      const response = await fetch(
        `/api/integrations/${item._id}/activity`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load activity");
      }

      setActivity(result.data || []);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to load activity"
      );
    } finally {
      setActivityLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    if (status === "Configured") {
      return "bg-blue-50 text-blue-700";
    }

    if (status === "Error") {
      return "bg-red-50 text-red-700";
    }

    return "bg-slate-100 text-slate-600";
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Integrations
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your marketplaces and third-party services.
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Integration
        </button>
      </div>

      {/* Notice */}
      {notice && (
        <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <span>{notice}</span>
          <button onClick={() => setNotice("")}>
            <X size={17} />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Integrations"
          value={integrations.length}
          icon={<Plug size={20} />}
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          title="Configured"
          value={configuredCount}
          icon={<CheckCircle2 size={20} />}
          color="bg-green-50 text-green-600"
        />
        <SummaryCard
          title="Not Connected"
          value={notConnectedCount}
          icon={<Clock3 size={20} />}
          color="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          title="Errors"
          value={errorCount}
          icon={<AlertCircle size={20} />}
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* Integration cards */}
      <div>
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Available Integrations
            </h2>
            <p className="text-sm text-slate-500">
              Configure the services used by your business.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search integrations..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {categoryOptions.map((item) => (
            <button
              key={item}
              onClick={() => {
                setCategory(item);
                setCurrentPage(1);
              }}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                category === item
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            Loading integrations...
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Plug className="mx-auto mb-3 text-slate-300" size={32} />
            <p className="font-medium text-slate-700">
              No integrations found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try another search or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedItems.map((item) => {
              const info = providerInfo[item.provider];

              return (
                <div
                  key={item._id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        info?.color || "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {info?.icon || <Plug size={22} />}
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h3 className="font-semibold text-slate-800">
                      {item.provider}
                    </h3>
                    <p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">
                      {info?.description}
                    </p>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                    <div className="flex justify-between gap-2 text-xs">
                      <span className="text-slate-500">Category</span>
                      <span className="font-medium text-slate-700">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex justify-between gap-2 text-xs">
                      <span className="text-slate-500">Account</span>
                      <span className="max-w-[60%] truncate font-medium text-slate-700">
                        {item.accountName || "Not configured"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-2 text-xs">
                      <span className="text-slate-500">Auto Sync</span>
                      <span
                        className={`font-medium ${
                          item.syncEnabled
                            ? "text-green-600"
                            : "text-slate-500"
                        }`}
                      >
                        {item.syncEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-2 text-xs">
                      <span className="text-slate-500">Last Sync</span>
                      <span className="font-medium text-slate-700">
                        {item.lastSyncAt
                          ? new Date(item.lastSyncAt).toLocaleString()
                          : "Not synced"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Settings2 size={15} />
                      Configure
                    </button>

                    {item.status === "Configured" && (
                      <button
                        onClick={() => requestSync(item)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        <RefreshCw size={14} />
                        Request Sync
                      </button>
                    )}

                    <button
                      onClick={() => openActivity(item)}
                      title="Activity"
                      className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                    >
                      <Clock3 size={15} />
                    </button>

                    <button
                      onClick={() => deleteIntegration(item)}
                      title="Remove"
                      className="rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {item.status === "Configured" && (
                    <button
                      onClick={() => disconnectIntegration(item)}
                      className="mt-3 w-full text-center text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      Disconnect configuration
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredItems.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-4">
            <p className="text-xs text-slate-500">
              Showing{" "}
              {filteredItems.length === 0
                ? 0
                : (currentPage - 1) * pageSize + 1}{" "}
              to {Math.min(currentPage * pageSize, filteredItems.length)} of{" "}
              {filteredItems.length} integrations
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-xs text-slate-600">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Configure modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={saveIntegration}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-800">
                  {editing ? "Configure Integration" : "Add Integration"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Enter your account configuration details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Integration Provider *
                </label>
                <select
                  required
                  disabled={Boolean(editing)}
                  value={form.provider}
                  onChange={(e) =>
                    setForm({ ...form, provider: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                >
                  <option value="">Select provider</option>
                  {Object.keys(providerInfo).map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Account / Store Name
                </label>
                <input
                  value={form.accountName}
                  onChange={(e) =>
                    setForm({ ...form, accountName: e.target.value })
                  }
                  placeholder="Enter account name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Store URL
                </label>
                <input
                  type="url"
                  value={form.storeUrl}
                  onChange={(e) =>
                    setForm({ ...form, storeUrl: e.target.value })
                  }
                  placeholder="https://yourstore.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Seller / Account ID
                </label>
                <input
                  value={form.sellerId}
                  onChange={(e) =>
                    setForm({ ...form, sellerId: e.target.value })
                  }
                  placeholder="Enter seller or account ID"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3">
                <input
                  type="checkbox"
                  checked={form.syncEnabled}
                  onChange={(e) =>
                    setForm({ ...form, syncEnabled: e.target.checked })
                  }
                  className="h-4 w-4 accent-blue-600"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-700">
                    Enable automatic sync
                  </span>
                  <span className="text-xs text-slate-500">
                    Preference only; a sync worker must be configured separately.
                  </span>
                </span>
              </label>

              <div className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                API credentials and OAuth authorization are not collected by
                this form. Complete the provider-specific secure connection
                setup before exchanging live data.
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Activity modal */}
      {activityItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-800">
                  {activityItem.provider} Activity
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Recent integration activity
                </p>
              </div>
              <button
                onClick={() => setActivityItem(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="max-h-96 space-y-3 overflow-y-auto p-5">
              {activityLoading ? (
                <p className="text-center text-sm text-slate-500">
                  Loading activity...
                </p>
              ) : activity?.length ? (
                [...activity].reverse().map((item, index) => (
                  <div
                    key={`${item.createdAt}-${index}`}
                    className="flex gap-3 rounded-lg border border-slate-100 p-3"
                  >
                    <div className="mt-0.5 text-blue-600">
                      <Clock3 size={17} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-700">
                        {item.message}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">
                  No activity available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-800">{value}</h3>
        </div>
        <div className={`rounded-xl p-3 ${color}`}>{icon}</div>
      </div>
    </div>
  );
}