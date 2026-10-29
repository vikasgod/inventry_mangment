"use client";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const channels = ["website", "amazon", "flipkart", "meesho"] as const;
const MAX_IMAGES = 10;
export default function ProductForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string[]>(["website"]);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = images.map(file => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [images]);

  function handleImagesChange(e: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files || []);
    setMessage(""); setError(false);
    const combined = [...images, ...incoming];
    if (combined.length > MAX_IMAGES) {
      setError(true); setMessage(`You can select up to ${MAX_IMAGES} images.`);
      setImages(combined.slice(0, MAX_IMAGES));
    } else setImages(combined);
    e.target.value = "";
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage(""); setError(false);
    const fd = new FormData(e.currentTarget);
    const body = new FormData();
    ["sku", "name", "description", "category", "brand", "mrp", "costPrice", "openingStock", "safetyStock", "status"].forEach(key => body.set(key, String(fd.get(key) || "")));
    body.set("channels", JSON.stringify(selected));
    images.forEach(file => body.append("images", file));
    try {
      const res = await fetch("/api/products", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save product");
      setMessage(`Product saved with ${data.product?.images?.length || 0} image(s). ${data.jobsScheduled ?? 0} sync job(s) scheduled. Check channel status before assuming a listing is live.`);
      setTimeout(() => router.push("/products"), 1200);
    } catch (err) {
      setError(true); setMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally { setBusy(false); }
  }
  return <form onSubmit={submit}>
    {message && <div className={`notice ${error ? "notice-error" : ""}`} style={{ margin: 20, marginBottom: 0 }}>{message}</div>}
    <div className="form-grid">
      <div className="field"><label>Product name *</label><input className="input" name="name" required maxLength={200} placeholder="e.g. Cotton T-Shirt"/></div>
      <div className="field"><label>SKU *</label><input className="input" name="sku" required maxLength={80} placeholder="e.g. TSHIRT-BLK-M"/></div>
      <div className="field"><label>Category</label><input className="input" name="category" placeholder="e.g. Clothing"/></div>
      <div className="field"><label>Brand</label><input className="input" name="brand" placeholder="Brand name"/></div>
      <div className="field"><label>MRP (₹) *</label><input className="input" name="mrp" type="number" min="0" step="0.01" required placeholder="999"/></div>
      <div className="field"><label>Cost price (₹) *</label><input className="input" name="costPrice" type="number" min="0" step="0.01" required placeholder="400"/></div>
      <div className="field"><label>Opening stock *</label><input className="input" name="openingStock" type="number" min="0" step="1" required defaultValue="0"/></div>
      <div className="field"><label>Safety stock</label><input className="input" name="safetyStock" type="number" min="0" step="1" defaultValue="0"/></div>
      <div className="field"><label>Initial status</label><select className="select" name="status" defaultValue="draft"><option value="draft">Draft</option><option value="active">Active</option></select></div>
      <div className="field span-2"><label>Description</label><textarea className="textarea" name="description" rows={3} placeholder="Product details and specifications"/></div>

      <div className="field span-2">
        <label>Product images (up to {MAX_IMAGES})</label>
        <input className="input" type="file" accept="image/*" multiple onChange={handleImagesChange} />
        <small style={{ display: "block", marginTop: 6, color: "#718078" }}>Select multiple images at once. JPG, PNG, WebP etc.; maximum 5 MB per image. Images are stored in Cloudinary and their URLs are saved in MongoDB.</small>
        {previews.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))", gap: 12, marginTop: 14 }}>
          {previews.map((src, index) => <div key={`${images[index]?.name}-${index}`} style={{ border: "1px solid #dce5df", borderRadius: 10, padding: 8, minWidth: 0 }}>
            <img src={src} alt={images[index]?.name || `Product image ${index + 1}`} style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 6 }} />
            <div title={images[index]?.name} style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "6px 0" }}>{images[index]?.name}</div>
            <button type="button" className="btn" style={{ width: "100%", padding: "5px 8px", fontSize: 12 }} onClick={() => setImages(prev => prev.filter((_, i) => i !== index))}>Remove</button>
          </div>)}
        </div>}
      </div>

      <div className="field span-2"><label>Publish / sync channels</label><div className="channel-list">
        {channels.map(ch => <label key={ch} className="channel" style={{ cursor: "pointer" }}><input type="checkbox" checked={selected.includes(ch)} onChange={e => setSelected(prev => e.target.checked ? [...prev, ch] : prev.filter(x => x !== ch))}/><div className="channel-meta"><strong style={{ textTransform: "capitalize" }}>{ch}</strong><small>{ch === "website" ? "Your own website" : ch === "meesho" ? "Requires confirmed API or approved workflow" : "Requires seller API credentials"}</small></div></label>)}
      </div></div>
      <div className="span-2" style={{ color: "#718078", fontSize: 12, lineHeight: 1.6 }}>This starter creates channel sync jobs. The default adapters do not publish real marketplace listings until the official API integrations are configured.</div>
    </div>
    <div className="form-actions"><button className="btn" type="button" onClick={() => router.push("/products")}>Cancel</button><button className="btn btn-primary" disabled={busy} type="submit">{busy ? "Saving product and images..." : "Save product"}</button></div>
  </form>;
}
