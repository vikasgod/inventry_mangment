"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Plus, Shield, UserRound, X } from "lucide-react";
import { permissionLabels, permissions, type Permission } from "@/lib/permissions";

type Operator = {
  _id: string;
  username: string;
  permissions: Permission[];
  isActive: boolean;
  createdAt: string;
};

const defaultPermissions = permissions.filter(
  (permission) => !["dashboard", "reports", "integrations"].includes(permission)
);

export default function OperatorsPage() {
  const [users, setUsers] = useState<Operator[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState<Permission[]>(defaultPermissions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to load operator accounts.");
    setUsers(result.users);
  }, []);

  useEffect(() => {
    loadUsers()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load users."))
      .finally(() => setLoading(false));
  }, [loadUsers]);

  function togglePermission(list: Permission[], permission: Permission) {
    return list.includes(permission)
      ? list.filter((item) => item !== permission)
      : [...list, permission];
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, permissions: selected }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to create account.");
      setUsername("");
      setPassword("");
      setMessage(result.message);
      await loadUsers();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create account.");
    } finally {
      setSaving(false);
    }
  }

  async function savePermissions(user: Operator) {
    setError("");
    setMessage("");
    const response = await fetch(`/api/admin/users/${user._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: user.permissions }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.message || "Unable to update permissions.");
      return;
    }
    setMessage(`${user.username}'s permissions updated.`);
  }

  function setUserPermission(userId: string, permission: Permission) {
    setUsers((current) =>
      current.map((user) =>
        user._id === userId
          ? { ...user, permissions: togglePermission(user.permissions, permission) }
          : user
      )
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-2xl bg-blue-100 p-3 text-blue-700"><Shield size={23} /></div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operator accounts</h1>
          <p className="mt-1 text-sm text-slate-500">Create operator logins and control access to each workspace section.</p>
        </div>
      </div>

      {message && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold"><Plus size={19} /> Create operator account</h2>
        <form onSubmit={createUser} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Username
              <input required minLength={3} maxLength={32} value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" autoComplete="off" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Temporary password (at least 10 characters)
              <input required minLength={10} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" autoComplete="new-password" />
            </label>
          </div>
          <PermissionPicker value={selected} onChange={(permission) => setSelected((current) => togglePermission(current, permission))} />
          <button disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Creating…" : "Create operator"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Existing operators</h2>
        {loading ? <p className="text-sm text-slate-500">Loading operator accounts…</p> : users.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No operator accounts yet.</div>
        ) : users.map((user) => (
          <article key={user._id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-600"><UserRound size={19} /></div>
              <div>
                <h3 className="font-semibold text-slate-900">{user.username}</h3>
                <p className="text-xs text-slate-500">Operator</p>
              </div>
            </div>
            <PermissionPicker
              value={user.permissions}
              onChange={(permission) => setUserPermission(user._id, permission)}
            />
            <button onClick={() => void savePermissions(user)} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Check size={16} /> Save permissions
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

function PermissionPicker({
  value,
  onChange,
}: {
  value: Permission[];
  onChange: (permission: Permission) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-700">Allowed sections</legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {permissions.map((permission) => {
          const checked = value.includes(permission);
          return (
            <label key={permission} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${checked ? "border-blue-200 bg-blue-50 text-blue-900" : "border-slate-200 text-slate-600"}`}>
              <input type="checkbox" checked={checked} onChange={() => onChange(permission)} className="accent-blue-600" />
              {permissionLabels[permission]}
              {checked ? <Check size={14} className="ml-auto" /> : <X size={14} className="ml-auto opacity-40" />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
