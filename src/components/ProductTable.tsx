 "use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ExternalLink } from "lucide-react";

type ProductRow = { _id: string; sku: string; name: string; category?: string; mrp: number; costPrice: number; status: string; available: number; createdAt?: string };
export default function ProductTable({ products }: { products: ProductRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => products.filter(p => {
    const q = query.toLowerCase();
    return (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) && (status === "all" || p.status === status);
  }), [products, query, status]);
  return <div className="panel">
    <div className="filters"><div className="search" style={{ position: "relative", flex: 1 }}><Search size={16} style={{ position: "absolute", left: 11, top: 12, color: "#718078" }}/><input className="input" style={{ paddingLeft: 36 }} placeholder="Search name or SKU..." value={query} onChange={e => setQuery(e.target.value)}/></div><select className="select" style={{ maxWidth: 180 }} value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="active">Active</option></select></div>
    {filtered.length ? <div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>MRP</th><th>Cost price</th><th>Available stock</th><th>Status</th><th></th></tr></thead><tbody>
      {filtered.map(p => <tr key={p._id}><td><strong>{p.name}</strong><small>{p.category || "Uncategorized"}</small></td><td>{p.sku}</td><td>₹{p.mrp.toLocaleString("en-IN")}</td><td>₹{p.costPrice.toLocaleString("en-IN")}</td><td>{p.available}</td><td><span className={`badge ${p.status === "draft" ? "badge-muted" : ""}`}>{p.status}</span></td><td><Link href={`/products/${p._id}`} className="btn" aria-label={`Edit ${p.name}`}><ExternalLink size={14}/></Link></td></tr>)}
    </tbody></table></div> : <div className="empty">No products found. Add your first product to get started.</div>}
    <div style={{ padding: "12px 20px", color: "#718078", fontSize: 12 }}>{filtered.length} product(s) shown · Maximum 500 loaded</div>
  </div>;
}
