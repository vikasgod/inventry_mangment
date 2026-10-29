import Link from "next/link";
import { Activity, BadgePercent, Boxes, ChartNoAxesCombined, ClipboardList, LayoutDashboard, Package, Settings, ShoppingCart, Store, Warehouse } from "lucide-react";

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

export default function Sidebar({ current = "/" }: { current?: string }) {
  return <aside className="sidebar">
    <Link href="/" className="brand">stock<span>pilot</span></Link>
    <nav className="nav">
      {links.map(({ href, label, Icon }) => <Link key={href} href={href} className={current === href ? "active" : ""}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Icon size={17}/>{label}</span>
      </Link>)}
    </nav>
    <div className="sidebar-note">Inventory workspace<br/>Centralized stock · Multi-channel sales</div>
  </aside>;
}
