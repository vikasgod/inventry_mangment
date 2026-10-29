import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import Inventory from "@/models/Inventory";
import InventoryMovement from "@/models/InventoryMovement";
import { apiError } from "@/lib/http";

const Input = z.object({
  sku: z.string().trim().min(1),
  warehouse: z.string().trim().default("MAIN"),
  quantityDelta: z.number().int().refine(v => v !== 0, "Quantity delta cannot be zero"),
  reason: z.string().trim().min(3).max(300),
});

export async function POST(req: NextRequest) {
  try {
    const input = Input.parse(await req.json());
    await dbConnect();
    const filter = { sku: input.sku.toUpperCase(), warehouse: input.warehouse };
    const inv = await Inventory.findOne(filter);
    if (!inv) return NextResponse.json({ error: "Inventory record not found" }, { status: 404 });
    const next = inv.onHand + input.quantityDelta;
    if (next < inv.reserved) return NextResponse.json({ error: "Physical stock cannot be lower than reserved stock" }, { status: 409 });
    if (next < 0) return NextResponse.json({ error: "Stock cannot be negative" }, { status: 400 });
    inv.onHand = next;
    await inv.save();
    await InventoryMovement.create({ ...filter, type: "adjustment", quantityDelta: input.quantityDelta, reason: input.reason });
    return NextResponse.json({ success: true, inventory: inv, available: Math.max(0, inv.onHand - inv.reserved - inv.safetyStock) });
  } catch (e) { return apiError(e); }
}
