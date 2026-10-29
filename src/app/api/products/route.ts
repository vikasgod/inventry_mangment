import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Inventory from "@/models/Inventory";
import InventoryMovement from "@/models/InventoryMovement";
import ChannelListing from "@/models/ChannelListing";
import { enqueueSyncJob, type Channel } from "@/lib/queue";
import { apiError } from "@/lib/http";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "node:stream";

const Input = z.object({
  sku: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(200),
  description: z.string().default(""),
  category: z.string().default(""),
  brand: z.string().default(""),
  mrp: z.number().finite().nonnegative(),
  costPrice: z.number().finite().nonnegative(),
  openingStock: z.number().int().nonnegative().default(0),
  safetyStock: z.number().int().nonnegative().default(0),
  status: z.enum(["draft", "active"]).default("draft"),
  channels: z.array(z.enum(["website", "amazon", "flipkart", "meesho"])).default(["website"]),
  images: z.array(z.string().url()).max(10).default([]),
});

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status");
    const filter: Record<string, unknown> = {};
    if (q) filter.$or = [
      { name: { $regex: escapeRegex(q), $options: "i" } },
      { sku: { $regex: escapeRegex(q), $options: "i" } },
    ];
    if (status && ["draft", "active", "archived"].includes(status)) filter.status = status;
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 25)));
    const [items, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);
    return NextResponse.json({ items, total, page, limit });
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let rawInput: Record<string, unknown>;
    let imageFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      imageFiles = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
      if (imageFiles.length > 10) return NextResponse.json({ error: "You can upload up to 10 images." }, { status: 400 });
      for (const file of imageFiles) {
        if (!file.type.startsWith("image/")) return NextResponse.json({ error: `${file.name} is not an image file.` }, { status: 400 });
        if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: `${file.name} is larger than 5 MB.` }, { status: 400 });
      }
      rawInput = {
        sku: String(form.get("sku") || ""),
        name: String(form.get("name") || ""),
        description: String(form.get("description") || ""),
        category: String(form.get("category") || ""),
        brand: String(form.get("brand") || ""),
        mrp: Number(form.get("mrp")),
        costPrice: Number(form.get("costPrice")),
        openingStock: Number(form.get("openingStock") || 0),
        safetyStock: Number(form.get("safetyStock") || 0),
        status: String(form.get("status") || "draft"),
        channels: JSON.parse(String(form.get("channels") || '["website"]')),
        images: [],
      };
    } else {
      rawInput = await req.json();
    }

    const input = Input.parse(rawInput);
    let imageUrls = input.images;
    if (imageFiles.length) {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      if (!cloudName || !apiKey || !apiSecret) {
        return NextResponse.json({ error: "Product image upload is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to .env.local, then restart the server." }, { status: 503 });
      }
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
      imageUrls = await Promise.all(imageFiles.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "inventory-crm/products", resource_type: "image" },
            (error, uploaded) => {
              if (error || !uploaded) reject(error || new Error("Image upload failed"));
              else resolve({ secure_url: uploaded.secure_url });
            }
          );
          Readable.from(buffer).pipe(stream);
        });
        return result.secure_url;
      }));
    }

    await dbConnect();
    const sku = input.sku.toUpperCase();
    const product = await Product.create({ ...input, images: imageUrls, sku });
    await Inventory.create({ sku, warehouse: "MAIN", onHand: input.openingStock, reserved: 0, safetyStock: input.safetyStock });
    if (input.openingStock > 0) {
      await InventoryMovement.create({ sku, warehouse: "MAIN", type: "stock_in", quantityDelta: input.openingStock, reason: "Opening stock" });
    }
    const results = await Promise.allSettled(input.channels.map(async (channel: Channel) => {
      await ChannelListing.updateOne(
        { sku, channel },
        { $setOnInsert: { sku, channel, externalSku: sku, sellingPrice: input.mrp, mrp: input.mrp, listingStatus: "not_created", syncStatus: channel === "meesho" ? "manual_required" : "pending" } },
        { upsert: true }
      );
      if (channel === "meesho") return { channel, scheduled: false, reason: "Confirm approved API/partner access" };
      await enqueueSyncJob({ type: "publish_product", channel, sku });
      return { channel, scheduled: true };
    }));
    return NextResponse.json({
      success: true,
      product,
      jobsScheduled: results.filter(r => r.status === "fulfilled" && (r.value as any).scheduled).length,
      channelResults: results.map((r, i) => r.status === "fulfilled" ? r.value : { channel: input.channels[i], scheduled: false, error: "Queue scheduling failed; see sync logs" }),
    }, { status: 201 });
  } catch (e) { return apiError(e); }
}

function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
