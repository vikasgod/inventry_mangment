export const permissions = [
  "dashboard",
  "products",
  "inventory",
  "listings",
  "pricing",
  "orders",
  "warehouses",
  "integrations",
  "reports",
] as const;

export type Permission = (typeof permissions)[number];

export const permissionLabels: Record<Permission, string> = {
  dashboard: "Dashboard",
  products: "Products",
  inventory: "Inventory",
  listings: "Marketplace Listings",
  pricing: "Pricing & Offers",
  orders: "Orders",
  warehouses: "Warehouses",
  integrations: "Integrations",
  reports: "Reports",
};

export function hasPermission(
  user: { role: string; permissions: string[] },
  permission: Permission
) {
  return user.role === "admin" || user.permissions.includes(permission);
}
