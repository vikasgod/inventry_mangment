import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ChannelListing from "@/models/ChannelListing";
import { apiError } from "@/lib/http";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get("channel");
    const filter: Record<string, unknown> = {};
    if (channel && ["website", "amazon", "flipkart", "meesho"].includes(channel)) filter.channel = channel;
    const items = await ChannelListing.find(filter).sort({ updatedAt: -1 }).limit(500).lean();
    return NextResponse.json({ items });
  } catch (e) { return apiError(e); }
}
