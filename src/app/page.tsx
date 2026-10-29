import AppShell from "@/components/AppShell";
import { AlertTriangle, Boxes, Package, RefreshCw, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Inventory from "@/models/Inventory";
import SyncJob from "@/models/SyncJob";
import ChannelListing from "@/models/ChannelListing";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let products = 0, units = 0, lowStock = 0, syncErrors = 0, listings: any[] = [];
  try {
    await dbConnect();
    products = await Product.countDocuments({ status: { $ne: "archived" } });
    const inv = await Inventory.find().lean();
    units = inv.reduce((sum, item: any) => sum + Math.max(0, item.onHand - item.reserved - item.safetyStock), 0);
    lowStock = inv.filter((item: any) => item.onHand - item.reserved - item.safetyStock <= 5).length;
    syncErrors = await SyncJob.countDocuments({ status: { $in: ["failed", "queue_error"] } });
    listings = await ChannelListing.find().sort({ updatedAt: -1 }).limit(6).lean();
  } catch { /* Empty dashboard remains usable while MongoDB is not configured. */ }

  return <AppShell>
    <div className="page-heading"><div><h1>Dashboard overview</h1><p className="subtitle">Here&apos;s what&apos;s happening across your inventory.</p></div><Link className="btn btn-primary" href="/products/new"><Package size={16}/> Add product</Link></div>
    <div className="cards">
      <Stat icon={<Package size={18}/>} label="Active products" value={products.toLocaleString("en-IN")} foot="Master catalog"/>
      <Stat icon={<Boxes size={18}/>} label="Sellable units" value={units.toLocaleString("en-IN")} foot="After reservations and buffer"/>
      <Stat icon={<AlertTriangle size={18}/>} label="Low-stock records" value={lowStock.toLocaleString("en-IN")} foot="At or below 5 available units"/>
      <Stat icon={<RefreshCw size={18}/>} label="Sync errors" value={syncErrors.toLocaleString("en-IN")} foot="Jobs needing attention"/>
    </div>
    <div className="panel" style={{ marginBottom: 20 }}>
      <div className="panel-head"><h2>Marketplace connections</h2><Link href="/integrations" className="btn">Manage connections <ArrowUpRight size={14}/></Link></div>
      <div style={{ padding: 18 }} className="channel-list">
        <Channel name="Website" detail="Your master storefront" state="Ready" symbol="W"/>
        <Channel name="Amazon" detail="Requires authorized SP-API credentials" state="Setup required" symbol="A" warn/>
        <Channel name="Flipkart" detail="Requires seller API access" state="Setup required" symbol="F" warn/>
        <Channel name="Meesho" detail="Confirm supported integration for your account" state="Manual setup" symbol="M" warn/>
      </div>
    </div>
    <div className="panel">
      <div className="panel-head"><h2>Recent channel listings</h2><Link href="/listings" className="btn">View all</Link></div>
      {listings.length ? <div className="table-wrap"><table><thead><tr><th>SKU</th><th>Channel</th><th>External SKU</th><th>Listing status</th><th>Sync</th></tr></thead><tbody>
        {listings.map((l: any) => <tr key={String(l._id)}><td><strong>{l.sku}</strong></td><td>{l.channel}</td><td>{l.externalSku}</td><td><span className="badge badge-muted">{l.listingStatus}</span></td><td><span className={`badge ${l.syncStatus === "failed" ? "badge-warn" : ""}`}>{l.syncStatus}</span></td></tr>)}
      </tbody></table></div> : <div className="empty">No listings yet. Add a product and configure channel publishing to get started.</div>}
    </div>
  </AppShell>;
}

function Stat({ icon, label, value, foot }: { icon: React.ReactNode; label: string; value: string; foot: string }) {
  return <div className="stat"><div style={{ color: "#176b4d" }}>{icon}</div><div className="stat-label" style={{ marginTop: 12 }}>{label}</div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></div>;
}
function Channel({ name, detail, state, symbol, warn = false }: { name: string; detail: string; state: string; symbol: string; warn?: boolean }) {
  return <div className="channel"><div className="channel-icon">{symbol}</div><div className="channel-meta"><strong>{name}</strong><small>{detail}</small></div><span className={`badge ${warn ? "badge-warn" : ""}`}>{state}</span></div>;
}
