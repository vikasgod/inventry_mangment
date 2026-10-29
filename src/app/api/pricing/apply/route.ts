import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import PriceRule from "@/models/PriceRule";
import { enqueueSyncJob } from "@/lib/queue";
import { apiError } from "@/lib/http";

const Input = z.object({
  sku: z.string().trim().min(1),
  channel: z.enum(["website", "amazon", "flipkart", "meesho"]),
  basePrice: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100).default(0),
  fixedDiscount: z.number().nonnegative().default(0),
  minSellingPrice: z.number().nonnegative(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  enabled: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const input = Input.parse(await req.json());
    const desiredPrice = Math.round((input.basePrice * (1 - input.discountPercent / 100) - input.fixedDiscount) * 100) / 100;
    if (desiredPrice < input.minSellingPrice) return NextResponse.json({ error: "Price is below minimum selling price", desiredPrice }, { status: 422 });
    if (input.endsAt && input.startsAt && new Date(input.endsAt) <= new Date(input.startsAt)) return NextResponse.json({ error: "endsAt must be later than startsAt" }, { status: 400 });
    await dbConnect();
    const rule = await PriceRule.findOneAndUpdate(
      { sku: input.sku.toUpperCase(), channel: input.channel },
      { ...input, sku: input.sku.toUpperCase(), startsAt: input.startsAt ? new Date(input.startsAt) : undefined, endsAt: input.endsAt ? new Date(input.endsAt) : undefined, desiredPrice },
      { upsert: true, new: true, runValidators: true }
    );
    let scheduled = false;
    let warning: string | undefined;
    if (input.enabled && input.channel !== "meesho") {
      try {
        const job = await enqueueSyncJob({ type: "update_price", channel: input.channel, sku: input.sku.toUpperCase(), payload: { desiredPrice, mrp: input.basePrice } });
        scheduled = Boolean(job.queued);
      } catch { warning = "Rule saved, but queue scheduling failed. Configure Redis and retry."; }
    } else if (input.channel === "meesho") warning = "Price rule saved; confirm supported Meesho API or use an approved workflow.";
    return NextResponse.json({ success: true, rule, scheduled, warning });
  } catch (e) { return apiError(e); }
}
