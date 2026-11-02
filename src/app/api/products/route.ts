
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { authorizeRequest } from "@/lib/auth";
import Product from "@/models/Product";
import Inventory from "@/models/Inventory";
import connectDB from "@/lib/mongodb";
import { resolveStockWarehouse } from "@/lib/resolve-stock-warehouse";

export const runtime = "nodejs";

function getStatus(stock: number, threshold: number) {
  if (stock <= 0) return "Out of Stock";
  if (stock <= threshold) return "Low Stock";
  return "Active";
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeRequest("products");
  if (authorization) return authorization;

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

    const filter: Record<string, unknown> = { isArchived: { $ne: true } };

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
  const authorization = await authorizeRequest("products");
  if (authorization) return authorization;

  let attemptedSku = "";

  try {
    await connectDB();

    const body = await request.json();
    const name = String(body.name || "").trim();
    const sku = String(body.sku || "").trim().toUpperCase();
    attemptedSku = sku;
    const category = String(body.category || "").trim();
    const price = Number(body.price);
    const stock = Number(body.stock ?? 0);
    const threshold = Number(body.lowStockThreshold ?? 5);
    const cgstRate = Number(body.cgstRate ?? 0);
    const sgstRate = Number(body.sgstRate ?? 0);

    if (!name || !sku || !category) {
      return NextResponse.json(
        { message: "Name, SKU and category are required." },
        { status: 400 }
      );
    }
    const escapedSku = sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existingProduct = await Product.findOne({
      sku: { $regex: `^${escapedSku}$`, $options: "i" },
    })
      .select("name sku isArchived")
      .lean<{ name: string; sku: string; isArchived?: boolean } | null>();
    if (existingProduct) {
      const archived = existingProduct.isArchived === true;
      return NextResponse.json(
        {
          message: archived
            ? `SKU "${existingProduct.sku}" is reserved by the archived product "${existingProduct.name}". Restore or change that product's SKU before reusing this SKU.`
            : `SKU "${existingProduct.sku}" is already assigned to the product "${existingProduct.name}". Use a unique SKU or update the existing product.`,
        },
        { status: 409 }
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
      !Number.isFinite(cgstRate) ||
      cgstRate < 0 ||
      cgstRate > 100 ||
      !Number.isFinite(sgstRate) ||
      sgstRate < 0 ||
      sgstRate > 100 ||
      cgstRate + sgstRate > 100
    ) {
      return NextResponse.json(
        { message: "CGST and SGST must be valid rates whose combined value does not exceed 100%." },
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

    const images =
      typeof body.images === "string"
        ? [{ url: body.images.trim(), publicId: "" }]
        : Array.isArray(body.images)
          ? body.images
          : [];

    if (
      body.images != null &&
      typeof body.images !== "string" &&
      !Array.isArray(body.images)
    ) {
      return NextResponse.json(
        { message: "Images must be a URL or an array of image objects." },
        { status: 400 }
      );
    }

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

    const channels = Array.isArray(body.channels) ? body.channels : [];
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

    let warehouseName: string | undefined;

    if (stock > 0) {
      try {
        const warehouse = await resolveStockWarehouse();
        warehouseName = warehouse.name;
      } catch (error) {
        return NextResponse.json(
          {
            message:
              error instanceof Error
                ? error.message
                : "Unable to determine the initial stock warehouse.",
          },
          { status: 400 }
        );
      }
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
      cgstRate,
      sgstRate,
      stock,
      lowStockThreshold: threshold,
      variants: normalizedVariants,
      channels,
      status: getStatus(stock, threshold),
    });

    if (warehouseName) {
      try {
        await Inventory.create({
          productId: product._id,
          warehouse: warehouseName,
          onHand: stock,
          reserved: 0,
          safetyStock: threshold,
        });
      } catch (error) {
        await Product.deleteOne({ _id: product._id });
        throw error;
      }
    }

    return NextResponse.json(
      { message: "Product created successfully.", product },
      { status: 201 }
    );
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      const duplicateError = error as {
        keyPattern?: Record<string, unknown>;
        keyValue?: Record<string, unknown>;
        message?: string;
      };
      const duplicateMessage = duplicateError.message ?? "";
      const indexName =
        duplicateMessage.match(/\bindex:\s+([^\s]+)/)?.[1] ?? "unknown";
      const isSkuConflict =
        (duplicateError.keyPattern?.sku !== undefined &&
          Object.keys(duplicateError.keyPattern).length === 1) ||
        duplicateError.keyValue?.sku != null ||
        indexName === "sku_1";
      const skuForResponse =
        typeof duplicateError.keyValue?.sku === "string"
          ? duplicateError.keyValue.sku
          : attemptedSku;

      if (isSkuConflict) {
        const duplicateSku = typeof duplicateError.keyValue?.sku === "string"
          ? duplicateError.keyValue.sku
          : undefined;

        console.error("POST product rejected by the unique SKU index:", {
          attemptedSku,
          duplicateSku,
          keyPattern: duplicateError.keyPattern,
          keyValue: duplicateError.keyValue,
          duplicateMessage,
        });

        return NextResponse.json(
          {
            message: duplicateSku
              ? `SKU "${duplicateSku}" is already stored in the products collection. Search this exact SKU or use a different one.`
              : `MongoDB reports a duplicate for SKU "${skuForResponse}", but did not return the conflicting value. Check the server terminal for the index details; the existing record may use different letter casing.`,
            duplicateSku,
            attemptedSku,
          },
          { status: 409 }
        );
      }

      console.error("POST product failed due to a non-SKU unique index:", {
        indexName,
        keyPattern: duplicateError.keyPattern,
        keyValue: duplicateError.keyValue,
        duplicateMessage,
      });

      const inventoryIndexMessage =
        indexName === "sku_1_warehouse_1"
          ? 'The inventories collection has an obsolete unique index on "sku + warehouse". Remove the "sku_1_warehouse_1" index in MongoDB Compass; keep the unique "productId + warehouse" index.'
          : `A database unique-index conflict occurred on "${indexName}". Check the MongoDB index and duplicate-key details before retrying.`;

      return NextResponse.json(
        {
          message: inventoryIndexMessage,
          indexName,
        },
        { status: 409 }
      );
    }

    if (error instanceof mongoose.Error) {
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
