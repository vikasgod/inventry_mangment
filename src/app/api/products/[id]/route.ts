import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { apiError } from "@/lib/http";
import { enqueueSyncJob } from "@/lib/queue";

const PatchInput = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  mrp: z.number().finite().nonnegative().optional(),
  costPrice: z.number().finite().nonnegative().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    await dbConnect();
    const product = await Product.findById(id);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ product });
  } catch (e) { return apiError(e); }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    const patch = PatchInput.parse(await req.json());
    await dbConnect();
    const product = await Product.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    // Queue listing refresh; actual adapter may update only supported fields.
    const channels = ["website", "amazon", "flipkart"] as const;
    await Promise.allSettled(channels.map(channel => enqueueSyncJob({ type: "publish_product", channel, sku: product.sku })));
    return NextResponse.json({ success: true, product });
  } catch (e) { return apiError(e); }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    await dbConnect();
    const product = await Product.findByIdAndUpdate(id, { status: "archived" }, { new: true });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ success: true, product });
  } catch (e) { return apiError(e); }
}
