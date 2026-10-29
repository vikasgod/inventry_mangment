
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ImagePlus, LoaderCircle, Plus, Trash2, X } from "lucide-react";

type ProductImage = { url: string; publicId: string };

type Variant = {
  name: string;
  sku: string;
  price: string;
  stock: string;
};

type ProductData = {
  _id?: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  compareAtPrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  images: ProductImage[];
  channels: string[];
  variants: Array<{
    name: string;
    sku: string;
    price: number;
    stock: number;
    attributes?: Record<string, string>;
  }>;
};

const channelOptions = ["Website", "Amazon", "Flipkart", "Meesho"];

const emptyForm = {
  name: "",
  sku: "",
  description: "",
  category: "",
  brand: "",
  price: "",
  compareAtPrice: "",
  costPrice: "",
  stock: "0",
  lowStockThreshold: "5",
};

export default function ProductForm({
  productId,
}: {
  productId?: string;
}) {
  const isEdit = Boolean(productId);

  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [channels, setChannels] = useState<string[]>(["Website"]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!productId) return;

    let cancelled = false;

    async function loadProduct() {
      try {
        const response = await fetch(`/api/products/${productId}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || "Product not found.");

        if (cancelled) return;

        const p: ProductData = data.product;

        setForm({
          name: p.name || "",
          sku: p.sku || "",
          description: p.description || "",
          category: p.category || "",
          brand: p.brand || "",
          price: String(p.price ?? 0),
          compareAtPrice: String(p.compareAtPrice ?? 0),
          costPrice: String(p.costPrice ?? 0),
          stock: String(p.stock ?? 0),
          lowStockThreshold: String(p.lowStockThreshold ?? 5),
        });

        setImages(p.images || []);
        setChannels(p.channels?.length ? p.channels : ["Website"]);
        setVariants(
          (p.variants || []).map((v) => ({
            name: v.name,
            sku: v.sku,
            price: String(v.price),
            stock: String(v.stock ?? 0),
          }))
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load product.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function chooseImages(fileList: FileList | null) {
    if (!fileList) return;

    const selectedFiles = Array.from(fileList);
    const available = 8 - images.length - files.length;

    if (selectedFiles.length > available) {
      setError(`You can add up to 8 images in total.`);
      return;
    }

    const invalid = selectedFiles.find(
      (file) =>
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
    );

    if (invalid) {
      setError("Choose JPG, PNG or WebP images of 5 MB or less.");
      return;
    }

    setError("");
    setFiles((current) => [...current, ...selectedFiles]);
  }

  function removeExistingImage(index: number) {
    setImages((current) => current.filter((_, i) => i !== index));
  }

  function removeNewImage(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  function toggleChannel(channel: string) {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel]
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.name.trim() || !form.sku.trim() || !form.category.trim()) {
      setError("Product name, SKU and category are required.");
      return;
    }

    if (channels.length === 0) {
      setError("Select at least one sales channel.");
      return;
    }

    const numericFields = [
      ["Price", form.price],
      ["Compare-at price", form.compareAtPrice || "0"],
      ["Cost price", form.costPrice || "0"],
      ["Stock", form.stock],
      ["Low-stock threshold", form.lowStockThreshold],
    ] as const;

    for (const [label, value] of numericFields) {
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) {
        setError(`${label} must be a valid non-negative number.`);
        return;
      }
    }

    if (!isEdit && images.length + files.length === 0) {
      setError("Please select at least one product image.");
      return;
    }

    if (variants.some((v) => !v.name.trim() || !v.sku.trim())) {
      setError("Every variant needs a name and SKU.");
      return;
    }

    setSaving(true);

    try {
      let finalImages = [...images];

      if (files.length) {
        const uploadData = new FormData();
        files.forEach((file) => uploadData.append("images", file));

        const uploadResponse = await fetch("/api/products/upload", {
          method: "POST",
          body: uploadData,
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadResult.message || "Image upload failed.");
        }

        finalImages = [...finalImages, ...uploadResult.images];
      }

      const payload = {
        ...form,
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        category: form.category.trim(),
        price: Number(form.price),
        compareAtPrice: Number(form.compareAtPrice || 0),
        costPrice: Number(form.costPrice || 0),
        stock: Number(form.stock),
        lowStockThreshold: Number(form.lowStockThreshold),
        images: finalImages,
        channels,
        variants: variants.map((v) => ({
          name: v.name.trim(),
          sku: v.sku.trim().toUpperCase(),
          price: Number(v.price),
          stock: Number(v.stock || 0),
        })),
      };

      const response = await fetch(
        isEdit ? `/api/products/${productId}` : "/api/products",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save product.");
      }

      setNotice("Product saved successfully.");
      window.location.assign(`/products/${result.product._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={18} />
        Loading product...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/products"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          aria-label="Back to products"
        >
          <ArrowLeft size={17} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {isEdit ? "Edit Product" : "Add Product"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEdit
              ? "Update product details, images and stock."
              : "Add product details, images, variants and sales channels."}
          </p>
        </div>
        <Link
          href="/products"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Cancel
        </Link>
        <button
          disabled={saving}
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving && <LoaderCircle size={16} className="animate-spin" />}
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Save Product"}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Basic Information</h2>
            <p className="mt-1 text-xs text-slate-500">Main product details.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Product Name *">
                <input required value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. Running Shoes" className={inputClass} />
              </Field>
              <Field label="SKU *">
                <input required value={form.sku} onChange={(e) => updateField("sku", e.target.value)} placeholder="e.g. RS-001" className={inputClass} />
              </Field>
              <Field label="Category *">
                <input required list="product-categories" value={form.category} onChange={(e) => updateField("category", e.target.value)} placeholder="Select or enter category" className={inputClass} />
                <datalist id="product-categories">
                  <option value="Footwear" />
                  <option value="Apparel" />
                  <option value="Bags" />
                  <option value="Electronics" />
                  <option value="Home & Kitchen" />
                  <option value="Home Decor" />
                  <option value="Sports" />
                  <option value="Accessories" />
                </datalist>
              </Field>
              <Field label="Brand">
                <input value={form.brand} onChange={(e) => updateField("brand", e.target.value)} placeholder="Brand name" className={inputClass} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description">
                  <textarea rows={4} value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Describe your product..." className={`${inputClass} resize-y`} />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Pricing & Inventory</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Selling Price (₹) *">
                <input type="number" min="0" step="0.01" required value={form.price} onChange={(e) => updateField("price", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Compare-at Price (₹)">
                <input type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={(e) => updateField("compareAtPrice", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Cost Price (₹)">
                <input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => updateField("costPrice", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Available Stock *">
                <input type="number" min="0" required value={form.stock} onChange={(e) => updateField("stock", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Low-stock Threshold">
                <input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => updateField("lowStockThreshold", e.target.value)} className={inputClass} />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Product Variants</h2>
                <p className="mt-1 text-xs text-slate-500">Add size, color or other variations.</p>
              </div>
              <button
                type="button"
                onClick={() => setVariants((current) => [...current, { name: "", sku: "", price: form.price, stock: "0" }])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                <Plus size={14} /> Add Variant
              </button>
            </div>

            {variants.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">
                No variants added. You can add them if needed.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {variants.map((variant, index) => (
                  <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2 xl:grid-cols-[1.1fr_1fr_0.8fr_0.7fr_auto]">
                    <input aria-label="Variant name" placeholder="Variant name / Size" value={variant.name} onChange={(e) => setVariants((all) => all.map((v, i) => i === index ? { ...v, name: e.target.value } : v))} className={inputClass} />
                    <input aria-label="Variant SKU" placeholder="Variant SKU" value={variant.sku} onChange={(e) => setVariants((all) => all.map((v, i) => i === index ? { ...v, sku: e.target.value } : v))} className={inputClass} />
                    <input aria-label="Variant price" type="number" min="0" placeholder="Price" value={variant.price} onChange={(e) => setVariants((all) => all.map((v, i) => i === index ? { ...v, price: e.target.value } : v))} className={inputClass} />
                    <input aria-label="Variant stock" type="number" min="0" placeholder="Stock" value={variant.stock} onChange={(e) => setVariants((all) => all.map((v, i) => i === index ? { ...v, stock: e.target.value } : v))} className={inputClass} />
                    <button type="button" aria-label="Remove variant" onClick={() => setVariants((all) => all.filter((_, i) => i !== index))} className="flex h-10 items-center justify-center rounded-lg text-red-500 hover:bg-red-50">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Sales Channels</h2>
            <p className="mt-1 text-xs text-slate-500">Choose where this product should be listed.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {channelOptions.map((channel) => (
                <label key={channel} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm hover:border-blue-300">
                  <input type="checkbox" checked={channels.includes(channel)} onChange={() => toggleChannel(channel)} className="h-4 w-4 accent-blue-600" />
                  <span className="font-medium text-slate-700">{channel}</span>
                  <span className="ml-auto text-[10px] text-slate-400">Selected for listing</span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-amber-700">
              Selecting a channel saves the preference only; it does not publish the product to that marketplace.
            </p>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Product Images</h2>
            <p className="mt-1 text-xs text-slate-500">JPG, PNG or WebP · Up to 5 MB each · Maximum 8 images</p>

            <label className="mt-4 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-4 text-center transition hover:border-blue-400 hover:bg-blue-50">
              <ImagePlus size={30} className="text-blue-600" />
              <span className="mt-2 text-sm font-semibold text-slate-800">Upload product images</span>
              <span className="mt-1 text-xs text-slate-500">Choose multiple files</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  chooseImages(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {images.map((image, index) => (
                <div key={`${image.publicId}-${index}`} className="relative overflow-hidden rounded-lg border border-slate-200">
                  <Image src={image.url} alt={`Product image ${index + 1}`} width={240} height={160} unoptimized className="h-28 w-full object-cover" />
                  <button type="button" aria-label="Remove image" onClick={() => removeExistingImage(index)} className="absolute right-1 top-1 rounded-full bg-white/95 p-1 text-red-600 shadow">
                    <X size={14} />
                  </button>
                  {index === 0 && <span className="block bg-blue-50 px-2 py-1 text-center text-[10px] font-semibold text-blue-700">Main image</span>}
                </div>
              ))}

              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-lg border border-slate-200">
                  {/* Local preview only; uploaded after Save Product */}
                  <img src={URL.createObjectURL(file)} alt={file.name} className="h-28 w-full object-cover" />
                  <button type="button" aria-label="Remove selected image" onClick={() => removeNewImage(index)} className="absolute right-1 top-1 rounded-full bg-white/95 p-1 text-red-600 shadow">
                    <X size={14} />
                  </button>
                  <span className="block truncate bg-slate-50 px-2 py-1 text-[10px] text-slate-500">{file.name}</span>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-slate-500">
              {images.length + files.length} of 8 images selected
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Before Saving</h2>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-5 text-slate-500">
              <li>Use a unique SKU for each product.</li>
              <li>Verify selling price and available stock.</li>
              <li>Check that product images are clear.</li>
              <li>Marketplace publication requires separate channel integration.</li>
            </ul>
          </section>
        </aside>
      </div>
    </form>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-xs font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}
