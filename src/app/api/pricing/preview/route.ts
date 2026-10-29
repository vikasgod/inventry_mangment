import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";

const Input = z.object({
  basePrice: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100).default(0),
  fixedDiscount: z.number().min(0).default(0),
  minSellingPrice: z.number().nonnegative(),
});

export async function POST(req: NextRequest) {
  try {
    const input = Input.parse(await req.json());
    const desiredPrice = Math.round((input.basePrice * (1 - input.discountPercent / 100) - input.fixedDiscount) * 100) / 100;
    if (desiredPrice < 0) return NextResponse.json({ error: "Discount exceeds base price" }, { status: 400 });
    if (desiredPrice < input.minSellingPrice) return NextResponse.json({ error: "Price is below minimum selling price", desiredPrice }, { status: 422 });
    return NextResponse.json({ desiredPrice, discountAmount: Math.round((input.basePrice - desiredPrice) * 100) / 100 });
  } catch (e) { return apiError(e); }
}
