 "use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProductEditForm({ product }: { product: any }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage("");
    const fd = new FormData(e.currentTarget);
    const body = { name: String(fd.get("name")), description: String(fd.get("description")), category: String(fd.get("category")), brand: String(fd.get("brand")), mrp: Number(fd.get("mrp")), costPrice: Number(fd.get("costPrice")), status: String(fd.get("status")) };
    try {
      const res = await fetch(`/api/products/${product._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Update failed");
      setMessage("Product updated successfully."); setTimeout(() => router.push("/products"), 800);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Update failed"); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit}><div className="form-grid">
    <div className="field"><label>SKU (read-only)</label><input className="input" value={product.sku} readOnly/></div>
    <div className="field"><label>Name *</label><input className="input" name="name" required defaultValue={product.name}/></div>
    <div className="field"><label>Category</label><input className="input" name="category" defaultValue={product.category}/></div>
    <div className="field"><label>Brand</label><input className="input" name="brand" defaultValue={product.brand}/></div>
    <div className="field"><label>MRP (₹)</label><input className="input" type="number" min="0" step=".01" name="mrp" required defaultValue={product.mrp}/></div>
    <div className="field"><label>Cost price (₹)</label><input className="input" type="number" min="0" step=".01" name="costPrice" required defaultValue={product.costPrice}/></div>
    <div className="field"><label>Status</label><select className="select" name="status" defaultValue={product.status}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></div>
    <div className="field span-2"><label>Description</label><textarea className="textarea" rows={4} name="description" defaultValue={product.description}/></div>
    {message && <div className="notice span-2">{message}</div>}
  </div><div className="form-actions"><button className="btn" type="button" onClick={() => router.push("/products")}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? "Saving..." : "Save changes"}</button></div></form>;
}
