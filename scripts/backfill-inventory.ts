import { config } from "dotenv";
import mongoose from "mongoose";
import Product from "@/models/Product";
import Inventory from "@/models/Inventory";
import { resolveStockWarehouse } from "@/lib/resolve-stock-warehouse";

config({ path: ".env.local" });
config({ path: ".env" });

async function backfillInventory() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing in environment variables");
  }

  await mongoose.connect(uri);

  try {
    const warehouse = await resolveStockWarehouse();
    const products = await Product.find({ isArchived: { $ne: true } });
    let created = 0;
    let skipped = 0;

    for (const product of products) {
      const existing = await Inventory.exists({ productId: product._id });

      if (existing) {
        skipped += 1;
        continue;
      }

      await Inventory.create({
        productId: product._id,
        warehouse: warehouse.name,
        onHand: Math.max(0, Number(product.stock || 0)),
        reserved: 0,
        safetyStock: product.lowStockThreshold ?? 10,
      });
      created += 1;
    }

    console.log(
      `Inventory backfill complete for "${warehouse.name}": ${created} created, ${skipped} already allocated.`
    );
  } finally {
    await mongoose.disconnect();
  }
}

backfillInventory().catch((error) => {
  console.error("Inventory backfill failed:", error);
  process.exitCode = 1;
});
