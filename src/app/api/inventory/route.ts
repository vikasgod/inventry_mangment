import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Inventory from "@/models/Inventory";
import { apiError } from "@/lib/http";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const filter: Record<string, unknown> = {};
    if (q) filter.sku = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    const records = await Inventory.find(filter).sort({ updatedAt: -1 }).limit(500).lean();
    return NextResponse.json({ items: records.map((r: any) => ({ ...r, available: Math.max(0, r.onHand - r.reserved - r.safetyStock) })) });
  } catch (e) { return apiError(e); }
}
