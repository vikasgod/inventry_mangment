
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import Product from "@/models/Product";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const {
      productId,
      warehouse,
      type,
      quantity,
      reason,
    } = body;

    if (
      !productId ||
      !mongoose.isValidObjectId(productId) ||
      typeof warehouse !== "string" ||
      !warehouse.trim() ||
      !["add", "remove", "set"].includes(type) ||
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      !reason?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid productId, warehouse, type, whole-number quantity and reason are required.",
        },
        { status: 400 }
      );
    }

    if (type !== "set" && quantity === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity must be greater than zero.",
        },
        { status: 400 }
      );
    }

    const product = await Product.findOne({
      _id: productId,
      isArchived: { $ne: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found." },
        { status: 404 }
      );
    }

    const normalizedWarehouse = warehouse.trim();

    let inventory = await Inventory.findOne({
      productId,
      warehouse: normalizedWarehouse,
    });

    if (!inventory) {
      inventory = await Inventory.create({
        productId,
        warehouse: normalizedWarehouse,
        onHand: 0,
        reserved: 0,
        safetyStock: product.lowStockThreshold ?? 10,
      });
    }

    const previousStock = inventory.onHand;
    let newStock = previousStock;

    if (type === "add") newStock += quantity;
    if (type === "remove") newStock -= quantity;
    if (type === "set") newStock = quantity;

    if (newStock < inventory.reserved) {
      return NextResponse.json(
        {
          success: false,
          message: `Stock cannot be lower than reserved quantity (${inventory.reserved}).`,
        },
        { status: 400 }
      );
    }

    const difference = newStock - previousStock;

    // Update the warehouse-level stock.
    inventory.onHand = newStock;
    await inventory.save();

    try {
      // Keep the Product total stock synchronized.
      product.stock = Math.max(0, Number(product.stock || 0) + difference);
      await product.save();

      await StockMovement.create({
        productId,
        warehouse: normalizedWarehouse,
        type,
        quantity: Math.abs(difference),
        previousStock,
        newStock,
        reason: reason.trim(),
      });
    } catch (saveError) {
      // Roll back the warehouse quantity if the following writes fail.
      inventory.onHand = previousStock;
      await inventory.save();

      throw saveError;
    }

    return NextResponse.json({
      success: true,
      message: "Stock adjusted successfully.",
      data: {
        productId: String(product._id),
        productName: product.name,
        sku: product.sku,
        warehouse: normalizedWarehouse,
        type,
        previousStock,
        newStock,
        available: Math.max(0, newStock - inventory.reserved),
        totalProductStock: product.stock,
      },
    });
  } catch (error) {
    console.error("POST /api/inventory/adjust error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to adjust stock." },
      { status: 500 }
    );
  }
}
