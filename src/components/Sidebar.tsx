
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BadgePercent,
  Boxes,
  ChartNoAxesCombined,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Warehouse,
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/products", label: "Products", Icon: Package },
  { href: "/inventory", label: "Inventory", Icon: Boxes },
  { href: "/listings", label: "Marketplace Listings", Icon: Store },
  { href: "/pricing", label: "Pricing & Offers", Icon: BadgePercent },
  { href: "/orders", label: "Orders", Icon: ShoppingCart },
  { href: "/warehouses", label: "Warehouses", Icon: Warehouse },
  { href: "/integrations", label: "Integrations", Icon: Settings },
  { href: "/sync-logs", label: "Sync Logs", Icon: Activity },
  { href: "/reports", label: "Reports", Icon: ChartNoAxesCombined },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col overflow-y-auto border-r border-slate-200 bg-white px-4 py-6">
      <Link
        href="/"
        className="mb-8 px-3 text-2xl font-extrabold tracking-tight text-slate-900"
      >
        Stock<span className="text-blue-600">-CRM</span>
      </Link>

      <nav className="flex flex-col gap-1.5">
        {links.map(({ href, label, Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon
                size={19}
                strokeWidth={1.8}
                className={
                  isActive
                    ? "shrink-0 text-white"
                    : "shrink-0 text-slate-500 group-hover:text-slate-900"
                }
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">
            Inventory Workspace
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Centralized stock management and multi-channel sales.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Workspace active
          </div>
        </div>
      </div>
    </aside>
  );
}
