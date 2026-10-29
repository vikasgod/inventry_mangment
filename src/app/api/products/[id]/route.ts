
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

function getStatus(stock: number, threshold: number) {
  if (stock <= 0) return "Out of Stock";
  if (stock <= threshold) return "Low Stock";
  return "Active";
}

async function findProductId(context: Context) {
  const { id } = await context.params;
  return mongoose.isValidObjectId(id) ? id : null;
}

export async function GET(_request: NextRequest, context: Context) {
  try {
    const id = await findProductId(context);

    if (!id) {
      return NextResponse.json({ message: "Invalid product ID." }, { status: 400 });
    }

    await connectDB();
    const product = await Product.findOne({ _id: id, isArchived: false });

    if (!product) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("GET product details failed:", error);
    return NextResponse.json({ message: "Unable to fetch product." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const id = await findProductId(context);

    if (!id) {
      return NextResponse.json({ message: "Invalid product ID." }, { status: 400 });
    }

    await connectDB();

    const body = await request.json();
    const allowed = [
      "name",
      "description",
      "category",
      "brand",
      "images",
      "price",
      "compareAtPrice",
      "costPrice",
      "stock",
      "lowStockThreshold",
      "variants",
      "channels",
    ];

    const update: Record<string, unknown> = {};

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        update[key] = body[key];
      }
    }

    if (typeof update.name === "string") {
      update.name = update.name.trim();

      if (!update.name) {
        return NextResponse.json({ message: "Product name is required." }, { status: 400 });
      }

      update.slug = update.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }

    if (typeof update.category === "string") {
      update.category = update.category.trim();

      if (!update.category) {
        return NextResponse.json({ message: "Category is required." }, { status: 400 });
      }
    }

    for (const key of ["price", "compareAtPrice", "costPrice", "stock", "lowStockThreshold"]) {
      if (key in update) {
        const value = Number(update[key]);

        if (!Number.isFinite(value) || value < 0) {
          return NextResponse.json(
            { message: `${key} must be a valid non-negative number.` },
            { status: 400 }
          );
        }

        update[key] = value;
      }
    }

    if ("images" in update) {
      const images = update.images;

      if (
        !Array.isArray(images) ||
        images.some(
          (image: { url?: string; publicId?: string }) =>
            typeof image.url !== "string" ||
            !image.url.startsWith("https://") ||
            typeof image.publicId !== "string"
        )
      ) {
        return NextResponse.json({ message: "Invalid image data." }, { status: 400 });
      }
    }

    if ("channels" in update) {
      const validChannels = ["Website", "Amazon", "Flipkart", "Meesho"];

      if (
        !Array.isArray(update.channels) ||
        (update.channels as string[]).some((channel) => !validChannels.includes(channel))
      ) {
        return NextResponse.json({ message: "Invalid sales channels." }, { status: 400 });
      }
    }

    if ("variants" in update) {
      if (!Array.isArray(update.variants)) {
        return NextResponse.json({ message: "Variants must be an array." }, { status: 400 });
      }

      const variants = update.variants as Array<{
        name?: string;
        sku?: string;
        price?: number;
        stock?: number;
        attributes?: Record<string, string>;
      }>;

      const normalizedSkus = variants.map((v) =>
        String(v.sku || "").trim().toUpperCase()
      );

      if (
        variants.some(
          (v) =>
            !String(v.name || "").trim() ||
            !String(v.sku || "").trim() ||
            !Number.isFinite(Number(v.price)) ||
            Number(v.price) < 0 ||
            !Number.isFinite(Number(v.stock ?? 0)) ||
            Number(v.stock ?? 0) < 0
        ) ||
        new Set(normalizedSkus).size !== normalizedSkus.length
      ) {
        return NextResponse.json({ message: "Please check variant names, SKUs, prices and stock." }, { status: 400 });
      }

      update.variants = variants.map((v) => ({
        name: String(v.name).trim(),
        sku: String(v.sku).trim().toUpperCase(),
        price: Number(v.price),
        stock: Number(v.stock ?? 0),
        attributes: v.attributes || {},
      }));
    }

    const current = await Product.findOne({ _id: id, isArchived: false });

    if (!current) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    const nextStock = Number(update.stock ?? current.stock);
    const nextThreshold = Number(
      update.lowStockThreshold ?? current.lowStockThreshold
    );

    update.status = getStatus(nextStock, nextThreshold);

    const product = await Product.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    return NextResponse.json({ message: "Product updated successfully.", product });
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      return NextResponse.json({ message: "A product with this SKU already exists." }, { status: 409 });
    }

    console.error("PATCH product failed:", error);
    return NextResponse.json({ message: "Unable to update product." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const id = await findProductId(context);

    if (!id) {
      return NextResponse.json({ message: "Invalid product ID." }, { status: 400 });
    }

    await connectDB();

    const product = await Product.findOneAndUpdate(
      { _id: id, isArchived: false },
      { isArchived: true },
      { new: true }
    );

    if (!product) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Product archived successfully." });
  } catch (error) {
    console.error("DELETE product failed:", error);
    return NextResponse.json({ message: "Unable to delete product." }, { status: 500 });
  }
}
