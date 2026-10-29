import AppShell from "@/components/AppShell";
import ProductEditForm from "@/components/ProductEditForm";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let product: any = null;
  try { await dbConnect(); product = await Product.findById(id).lean(); } catch { notFound(); }
  if (!product) notFound();
  return <AppShell current="/products"><div className="page-heading"><div><h1>Edit product</h1><p className="subtitle">Update master catalog information.</p></div></div><div className="panel"><ProductEditForm product={JSON.parse(JSON.stringify(product))}/></div></AppShell>;
}
