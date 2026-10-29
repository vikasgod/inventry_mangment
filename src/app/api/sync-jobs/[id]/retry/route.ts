import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import SyncJob from "@/models/SyncJob";
import { enqueueSyncJob } from "@/lib/queue";
import { apiError } from "@/lib/http";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    await dbConnect();
    const old = await SyncJob.findById(id);
    if (!old) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const job = await enqueueSyncJob({ type: old.type, channel: old.channel, sku: old.sku, payload: old.payload ?? {} });
    return NextResponse.json({ success: true, newJobId: job.id });
  } catch (e) { return apiError(e); }
}
