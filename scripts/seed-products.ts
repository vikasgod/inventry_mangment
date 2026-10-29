import "dotenv/config";
import mongoose from "mongoose";
import Product from "@/models/Product";
import {dummyProducts} from './data'
async function seedProducts() {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("MONGODB_URI is missing in environment variables");
    }

    await mongoose.connect(uri);

    // Avoid inserting the same sample data repeatedly.
    for (const product of dummyProducts) {
      await Product.updateOne(
        { sku: product.sku },
        { $setOnInsert: product },
        { upsert: true, runValidators: true }
      );
    }

    console.log("Dummy products seeded successfully!");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedProducts();