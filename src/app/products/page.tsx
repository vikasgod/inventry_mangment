import AppShell from "@/components/AppShell";
import Link from "next/link";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Inventory from "@/models/Inventory";
import ProductTable from "@/components/ProductTable";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  let products: any[] = [];
  try {
    await dbConnect();
    products = await Product.find({ status: { $ne: "archived" } }).sort({ createdAt: -1 }).limit(500).lean();
    const inv = await Inventory.find({ sku: { $in: products.map((p: any) => p.sku) } }).lean();
    const inventoryBySku = new Map(inv.map((i: any) => [i.sku, i]));
    products = products.map((p: any) => {
      const i: any = inventoryBySku.get(p.sku);
      return { ...p, _id: String(p._id), available: i ? Math.max(0, i.onHand - i.reserved - i.safetyStock) : 0 };
    });
  } catch { products = []; }

  return <AppShell current="/products">
    <div className="page-heading"><div><h1>Products</h1><p className="subtitle">Manage your master catalog and product SKUs.</p></div><Link href="/products/new" className="btn btn-primary">+ Add product</Link></div>
    <ProductTable products={JSON.parse(JSON.stringify(products))}/>
  </AppShell>;
}
