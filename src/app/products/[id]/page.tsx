"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Box,
  CalendarDays,
  Pencil,
  Package,
  Tag,
} from "lucide-react";

type Product = {
  _id: string;
  name: string;
  sku: string;
  description?: string;
  category: string;
  brand?: string;
  images: { url: string; publicId: string }[];
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  stock: number;
  lowStockThreshold: number;
  variants: {
    _id?: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
  }[];
  channels: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export default function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [productId, setProductId] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    params.then(({ id }) => {
      if (!cancelled) setProductId(id);
    });

    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!productId) return;

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/products/${productId}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || "Product not found.");

        if (!cancelled) setProduct(data.product);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load product.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) {
    return (
      <div className="p-10 text-sm text-slate-500">
        Loading product details...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="m-6 rounded-xl border border-red-200 bg-white p-8">
        <p className="font-semibold text-red-700">
          {error || "Product not found."}
        </p>
        <Link
          href="/products"
          className="mt-4 inline-block text-sm text-blue-600"
        >
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen space-y-5 bg-[#f4f7fc] p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/products"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white"
        >
          <ArrowLeft size={17} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
          <p className="mt-1 text-sm text-slate-500">SKU: {product.sku}</p>
        </div>
        <Link
          href={`/products/${product._id}/edit`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Pencil size={15} />
          Edit Product
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Product Images</h2>

          {product.images?.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {product.images.map((image, index) => (
                <a
                  href={image.url}
                  target="_blank"
                  rel="noreferrer"
                  key={`${image.publicId}-${index}`}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  <img
                    src={image.url}
                    alt={`${product.name} image ${index + 1}`}
                    className="h-40 w-full object-cover"
                  />
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-400">
              No product images uploaded.
            </div>
          )}

          <div className="mt-6">
            <h2 className="font-semibold">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {product.description || "No description added."}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500">Selling Price</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {money(product.price)}
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {product.status}
              </span>
            </div>

            {Boolean(product.compareAtPrice) && (
              <p className="mt-2 text-sm text-slate-400">
                Compare-at price: {money(product.compareAtPrice!)}
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Info
                icon={Package}
                label="Available Stock"
                value={String(product.stock)}
              />
              <Info
                icon={Box}
                label="Low Stock At"
                value={String(product.lowStockThreshold)}
              />
              <Info icon={Tag} label="Category" value={product.category} />
              <Info
                icon={CalendarDays}
                label="Brand"
                value={product.brand || "—"}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Sales Channels</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.channels.map((channel) => (
                <span
                  key={channel}
                  className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700"
                >
                  {channel}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              These are saved channel selections, not confirmation that the
              product is published on each marketplace.
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">
          Variants ({product.variants?.length || 0})
        </h2>

        {!product.variants?.length ? (
          <p className="mt-3 text-sm text-slate-400">No variants added.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500">
                  <th className="p-3">Variant</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {product.variants.map((variant, index) => (
                  <tr key={variant._id || index}>
                    <td className="p-3 font-medium">{variant.name}</td>
                    <td className="p-3 text-slate-600">{variant.sku}</td>
                    <td className="p-3">{money(variant.price)}</td>
                    <td className="p-3">{variant.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-400">
        Created: {new Date(product.createdAt).toLocaleString("en-IN")} ·
        Updated: {new Date(product.updatedAt).toLocaleString("en-IN")}
      </p>
    </main>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <Icon size={17} className="text-blue-600" />
      <p className="mt-2 text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}
