"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar, { type SessionUser } from "@/components/Sidebar";
import { permissions, type Permission } from "@/lib/permissions";

const permissionRoutes: Record<(typeof permissions)[number], string> = {
  dashboard: "/",
  products: "/products",
  inventory: "/inventory",
  listings: "/listings",
  pricing: "/pricing",
  orders: "/orders",
  warehouses: "/warehouses",
  integrations: "/integrations",
  reports: "/reports",
};

function routePermission(pathname: string): Permission | "admin" | null {
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/users")) return "admin";
  const section = pathname.split("/")[1];
  if (section === "products") return "products";
  if (section === "inventory") return "inventory";
  if (section === "listings") return "listings";
  if (section === "pricing") return "pricing";
  if (section === "orders") return "orders";
  if (section === "warehouses") return "warehouses";
  if (section === "integrations") return "integrations";
  if (section === "reports") return "reports";
  return null;
}

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    setChecked(pathname === "/login");
    if (pathname === "/login") {
      setUser(null);
      return () => { active = false; };
    }

    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          router.replace("/login");
          return null;
        }
        return (await response.json()).user as SessionUser;
      })
      .then((sessionUser) => {
        if (!active || !sessionUser) return;
        setUser(sessionUser);
        const permission = routePermission(pathname);
        const allowed = sessionUser.role === "admin" ||
          permission === null ||
          (permission !== "admin" && sessionUser.permissions.includes(permission));
        if (!allowed) {
          const fallback = permissions.find((item) =>
            sessionUser.role === "admin" || sessionUser.permissions.includes(item)
          );
          router.replace(fallback ? permissionRoutes[fallback] : "/access-denied");
          return;
        }
        setChecked(true);
      })
      .catch(() => router.replace("/login"));

    return () => { active = false; };
  }, [pathname, router]);

  if (pathname === "/login") return children;
  if (!checked || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Checking access…</div>;
  }

  return (
    <>
      <Sidebar user={user} />
      <main className="ml-64 min-h-screen min-w-0">{children}</main>
    </>
  );
}
