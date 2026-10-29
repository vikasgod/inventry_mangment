
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StockMovement from "@/models/StockMovement";
import Product from "@/models/Product";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const params = request.nextUrl.searchParams;
    const productId = params.get("productId");
    const warehouse = params.get("warehouse");
    const limit = Math.min(
      Math.max(Number(params.get("limit")) || 50, 1),
      100
    );

    const filter: Record<string, unknown> = {};

    if (productId) filter.productId = productId;
    if (warehouse) filter.warehouse = warehouse;

    const movements = await StockMovement.find(filter)
      .populate({
        path: "productId",
        model: Product,
        select: "name sku",
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const data = movements.map((movement: any) => ({
      id: String(movement._id),
      productId: movement.productId
        ? String(movement.productId._id)
        : null,
      productName: movement.productId?.name || "Deleted product",
      sku: movement.productId?.sku || "",
      warehouse: movement.warehouse,
      type: movement.type,
      quantity: movement.quantity,
      previousStock: movement.previousStock,
      newStock: movement.newStock,
      reason: movement.reason,
      createdAt: movement.createdAt,
    }));

    return NextResponse.json({
      success: true,
      total: data.length,
      data,
    });
  } catch (error) {
    console.error("GET /api/inventory/movements error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch stock movements." },
      { status: 500 }
    );
  }
}
