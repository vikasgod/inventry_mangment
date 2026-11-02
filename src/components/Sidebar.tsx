"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BadgePercent,
  Boxes,
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Users,
  Warehouse,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export type SessionUser = {
  username: string;
  role: "admin" | "operator";
  permissions: Permission[];
};

const links: { href: string; label: string; Icon: typeof LayoutDashboard; permission?: Permission }[] = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard, permission: "dashboard" },
  { href: "/products", label: "Products", Icon: Package, permission: "products" },
  { href: "/inventory", label: "Inventory", Icon: Boxes, permission: "inventory" },
  { href: "/listings", label: "Marketplace Listings", Icon: Store, permission: "listings" },
  { href: "/pricing", label: "Pricing & Offers", Icon: BadgePercent, permission: "pricing" },
  { href: "/orders", label: "Orders", Icon: ShoppingCart, permission: "orders" },
  { href: "/warehouses", label: "Warehouses", Icon: Warehouse, permission: "warehouses" },
  { href: "/integrations", label: "Integrations", Icon: Settings, permission: "integrations" },
  { href: "/reports", label: "Reports", Icon: ChartNoAxesCombined, permission: "reports" },
  { href: "/users", label: "Operator accounts", Icon: Users },
];

export default function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const visibleLinks = links.filter(({ permission, href }) =>
    href === "/users"
      ? user.role === "admin"
      : !permission || user.role === "admin" || user.permissions.includes(permission)
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col overflow-y-auto border-r border-slate-200 bg-white px-4 py-6">
      <Link href="/" className="mb-8 px-3 text-2xl font-extrabold tracking-tight text-slate-900">
        Stock<span className="text-blue-600">-CRM</span>
      </Link>
      <nav className="flex flex-col gap-1.5">
        {visibleLinks.map(({ href, label, Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                isActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon size={19} strokeWidth={1.8} className={isActive ? "shrink-0 text-white" : "shrink-0 text-slate-500"} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-slate-200 pt-4">
        <p className="truncate px-3 text-sm font-semibold text-slate-800">{user.username}</p>
        <p className="px-3 text-xs capitalize text-slate-500">{user.role}</p>
        <button
          onClick={logout}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}
