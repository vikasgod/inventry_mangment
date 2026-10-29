
import { NextRequest, NextResponse } from "next/server";
import Inventory from "@/models/Inventory";
import Product from "@/models/Product";
import connectDB from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const params = request.nextUrl.searchParams;

    const search = (params.get("search") || "").trim();
    const warehouse = params.get("warehouse") || "";
    const category = params.get("category") || "";
    const status = params.get("status") || "";
    const lowOnly = params.get("lowOnly") === "true";

    const inventoryRows = await Inventory.find()
      .populate({
        path: "productId",
        model: Product,
        select: "name sku category price stock images status isArchived lowStockThreshold",
      })
      .sort({ updatedAt: -1 })
      .lean();

    const records = inventoryRows
      .filter((row: any) => {
        const product = row.productId;

        if (!product || product.isArchived) return false;

        const onHand = Number(row.onHand || 0);
        const reserved = Number(row.reserved || 0);
        const safetyStock = Number(row.safetyStock || 0);

        const itemStatus =
          onHand <= 0
            ? "Out of Stock"
            : onHand <= safetyStock
              ? "Low Stock"
              : "In Stock";

        const matchesSearch =
          !search ||
          product.name?.toLowerCase().includes(search.toLowerCase()) ||
          product.sku?.toLowerCase().includes(search.toLowerCase());

        const matchesWarehouse =
          !warehouse || row.warehouse === warehouse;

        const matchesCategory =
          !category || product.category === category;

        const matchesStatus = !status || itemStatus === status;

        const matchesLow =
          !lowOnly || onHand <= safetyStock;

        return (
          matchesSearch &&
          matchesWarehouse &&
          matchesCategory &&
          matchesStatus &&
          matchesLow
        );
      })
      .map((row: any) => {
        const product = row.productId;
        const onHand = Number(row.onHand || 0);
        const reserved = Number(row.reserved || 0);

        return {
          id: String(row._id),
          productId: String(product._id),
          name: product.name,
          sku: product.sku,
          category: product.category || "Uncategorized",
          warehouse: row.warehouse,
          onHand,
          reserved,
          available: Math.max(0, onHand - reserved),
          safetyStock: row.safetyStock,
          price: product.price || 0,
          status:
            onHand <= 0
              ? "Out of Stock"
              : onHand <= row.safetyStock
                ? "Low Stock"
                : "In Stock",
          image: Array.isArray(product.images)
            ? typeof product.images[0] === "string"
              ? product.images[0]
              : product.images[0]?.url || ""
            : "",
          updatedAt: row.updatedAt,
        };
      });

    const allInventory = await Inventory.find()
      .populate({
        path: "productId",
        model: Product,
        select: "isArchived",
      })
      .lean();

    const validInventory = allInventory.filter(
      (row: any) => row.productId && !row.productId.isArchived
    );

    const summary = validInventory.reduce(
      (acc: any, row: any) => {
        const onHand = Number(row.onHand || 0);
        const reserved = Number(row.reserved || 0);

        acc.totalStock += onHand;
        acc.reservedStock += reserved;
        acc.availableStock += Math.max(0, onHand - reserved);

        if (onHand <= Number(row.safetyStock || 0)) {
          acc.lowStockItems += 1;
        }

        return acc;
      },
      {
        totalStock: 0,
        reservedStock: 0,
        availableStock: 0,
        lowStockItems: 0,
      }
    );

    return NextResponse.json({
      success: true,
      summary,
      total: records.length,
      data: records,
    });
  } catch (error) {
    console.error("GET /api/inventory error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch inventory." },
      { status: 500 }
    );
  }
}
