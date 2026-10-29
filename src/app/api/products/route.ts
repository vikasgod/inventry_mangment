
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Product from "@/models/Product";
import connectDB from "@/lib/mongodb";

export const runtime = "nodejs";

function getStatus(stock: number, threshold: number) {
  if (stock <= 0) return "Out of Stock";
  if (stock <= threshold) return "Low Stock";
  return "Active";
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 10)
    );

    const filter: Record<string, unknown> = { isArchived: false };

    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { sku: { $regex: escaped, $options: "i" } },
        { category: { $regex: escaped, $options: "i" } },
      ];
    }

    if (category && category !== "All Categories") {
      filter.category = category;
    }

    if (status && status !== "All Status") {
      filter.status = status;
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET products failed:", error);
    return NextResponse.json(
      { message: "Unable to fetch products." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const name = String(body.name || "").trim();
    const sku = String(body.sku || "").trim().toUpperCase();
    const category = String(body.category || "").trim();
    const price = Number(body.price);
    const stock = Number(body.stock ?? 0);
    const threshold = Number(body.lowStockThreshold ?? 5);

    if (!name || !sku || !category) {
      return NextResponse.json(
        { message: "Name, SKU and category are required." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isFinite(stock) ||
      stock < 0 ||
      !Number.isFinite(threshold) ||
      threshold < 0
    ) {
      return NextResponse.json(
        { message: "Price and stock values must be valid non-negative numbers." },
        { status: 400 }
      );
    }

    if (
      body.compareAtPrice != null &&
      (!Number.isFinite(Number(body.compareAtPrice)) ||
        Number(body.compareAtPrice) < 0)
    ) {
      return NextResponse.json(
        { message: "Compare-at price must be a valid non-negative number." },
        { status: 400 }
      );
    }

    const images = Array.isArray(body.images) ? body.images : [];

    if (
      images.some(
        (image: { url?: string; publicId?: string }) =>
          typeof image.url !== "string" ||
          !image.url.startsWith("https://") ||
          typeof image.publicId !== "string"
      )
    ) {
      return NextResponse.json(
        { message: "Product images must have valid uploaded image URLs." },
        { status: 400 }
      );
    }

    const channels = Array.isArray(body.channels) ? body.channels : ["Website"];
    const allowedChannels = ["Website", "Amazon", "Flipkart", "Meesho"];

    if (
      channels.some(
        (channel: string) => !allowedChannels.includes(channel)
      )
    ) {
      return NextResponse.json(
        { message: "One or more sales channels are invalid." },
        { status: 400 }
      );
    }

    const variants = Array.isArray(body.variants) ? body.variants : [];

    const variantSkus = variants.map((v: { sku?: string }) =>
      String(v.sku || "").trim().toUpperCase()
    );

    if (variantSkus.some((sku: string) => !sku)) {
      return NextResponse.json(
        { message: "Every variant must have a SKU." },
        { status: 400 }
      );
    }

    if (new Set(variantSkus).size !== variantSkus.length) {
      return NextResponse.json(
        { message: "Variant SKUs must be unique within this product." },
        { status: 400 }
      );
    }

    const normalizedVariants = variants.map(
      (v: {
        name: string;
        sku: string;
        price: number;
        stock?: number;
        attributes?: Record<string, string>;
      }) => ({
        name: String(v.name || "").trim(),
        sku: String(v.sku).trim().toUpperCase(),
        price: Number(v.price),
        stock: Number(v.stock ?? 0),
        attributes: v.attributes || {},
      })
    );

    if (
      normalizedVariants.some(
        (v: { name: string; price: number; stock: number }) =>
          !v.name ||
          !Number.isFinite(v.price) ||
          v.price < 0 ||
          !Number.isFinite(v.stock) ||
          v.stock < 0
      )
    ) {
      return NextResponse.json(
        { message: "Variant names, prices and stock must be valid." },
        { status: 400 }
      );
    }

    const product = await Product.create({
      name,
      sku,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      description: String(body.description || ""),
      category,
      brand: String(body.brand || ""),
      images,
      price,
      compareAtPrice: Number(body.compareAtPrice || 0),
      costPrice: Number(body.costPrice || 0),
      stock,
      lowStockThreshold: threshold,
      variants: normalizedVariants,
      channels,
      status: getStatus(stock, threshold),
    });

    return NextResponse.json(
      { message: "Product created successfully.", product },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof mongoose.Error ||
      (error as { code?: number })?.code === 11000
    ) {
      if ((error as { code?: number })?.code === 11000) {
        return NextResponse.json(
          { message: "This SKU already exists." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { message: "Please check the product fields and try again." },
        { status: 400 }
      );
    }

    console.error("POST product failed:", error);
    return NextResponse.json(
      { message: "Unable to create product." },
      { status: 500 }
    );
  }
}
