import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import SyncJob from "@/models/SyncJob";
import { apiError } from "@/lib/http";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const items = await SyncJob.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return NextResponse.json({ items });
  } catch (e) { return apiError(e); }
}
