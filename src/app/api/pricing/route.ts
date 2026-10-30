import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import Pricing from "@/models/Pricing";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 10)
    );
    const q = searchParams.get("q")?.trim() || "";

    const filter: any = {
      isArchived: false,
    };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { sku: { $regex: q, $options: "i" } },
      ];
    }

    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const products = await Product.find(filter)
      .select("name sku category images price compareAtPrice costPrice")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const productIds = products.map((p: any) => p._id);

    const savedPricing = await Pricing.find({
      productId: { $in: productIds },
    }).lean();

    const pricingMap = new Map(
      savedPricing.map((item: any) => [
        String(item.productId),
        item,
      ])
    );

    const data = products.map((product: any) => {
      const saved: any = pricingMap.get(String(product._id));
      const defaultPrice = Number(product.price ?? 0);

      return {
        _id: String(product._id),
        name: product.name,
        sku: product.sku,
        category: product.category ?? "",
        image: product.images?.[0]?.url ?? "",
        mrp:
          saved?.mrp ??
          Number(product.compareAtPrice ?? product.price ?? 0),
        costPrice:
          saved?.costPrice ?? Number(product.costPrice ?? 0),
        prices: {
          Website: saved?.prices?.Website ?? defaultPrice,
          Amazon: saved?.prices?.Amazon ?? defaultPrice,
          Flipkart: saved?.prices?.Flipkart ?? defaultPrice,
          Meesho: saved?.prices?.Meesho ?? defaultPrice,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Pricing GET error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch pricing" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { productId, mrp, costPrice, prices } = body;

    if (!mongoose.isValidObjectId(productId)) {
      return NextResponse.json(
        { success: false, message: "Valid productId is required" },
        { status: 400 }
      );
    }

    const product = await Product.findOne({
      _id: productId,
      isArchived: false,
    }).lean();

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    const values = [
      mrp,
      costPrice,
      prices?.Website,
      prices?.Amazon,
      prices?.Flipkart,
      prices?.Meesho,
    ];

    if (
      values.some(
        (value) =>
          value === undefined ||
          value === null ||
          !Number.isFinite(Number(value)) ||
          Number(value) < 0
      )
    ) {
      return NextResponse.json(
        { success: false, message: "All prices must be valid non-negative numbers" },
        { status: 400 }
      );
    }

    const pricing = await Pricing.findOneAndUpdate(
      { productId },
      {
        $set: {
          mrp: Number(mrp),
          costPrice: Number(costPrice),
          prices: {
            Website: Number(prices.Website),
            Amazon: Number(prices.Amazon),
            Flipkart: Number(prices.Flipkart),
            Meesho: Number(prices.Meesho),
          },
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: "Pricing saved successfully",
      data: pricing,
    });
  } catch (error) {
    console.error("Pricing POST error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to save pricing" },
      { status: 500 }
    );
  }
}