
import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import Product from "@/models/Product";
import Warehouse from "@/models/Warehouse";

export async function POST(request: NextRequest) {
  const authorization = await authorizeRequest("inventory");
  if (authorization) return authorization;

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
      typeof reason !== "string" ||
      !reason.trim()
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

    const warehouseRecord = await Warehouse.findOne({
      name: normalizedWarehouse,
      status: "Active",
    }).lean();

    if (!warehouseRecord) {
      return NextResponse.json(
        { success: false, message: "Active warehouse not found." },
        { status: 404 }
      );
    }

    const inventoryFilter = {
      productId: product._id,
      warehouse: normalizedWarehouse,
    };
    let inventory = await Inventory.findOne(inventoryFilter);

    if (!inventory) {
      try {
        inventory = await Inventory.create({
          ...inventoryFilter,
          onHand: 0,
          reserved: 0,
          safetyStock: product.lowStockThreshold ?? 10,
        });
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;

        inventory = await Inventory.findOne(inventoryFilter);

        if (!inventory) {
          console.error(
            "Inventory creation hit a duplicate-key index without a matching product/warehouse record:",
            error
          );
          return NextResponse.json(
            {
              success: false,
              message:
                "The database rejected this warehouse allocation because of a conflicting unique index. Check the Inventory collection indexes; only the productId + warehouse pair should be unique.",
            },
            { status: 409 }
          );
        }
      }
    }

    if (!inventory) {
      throw new Error(
        "Inventory record could not be loaded or created for this product and warehouse."
      );
    }

    const update =
      type === "add"
        ? { $inc: { onHand: quantity } }
        : type === "remove"
          ? { $inc: { onHand: -quantity } }
          : { $set: { onHand: quantity } };

    const stockFilter: Record<string, unknown> = { _id: inventory._id };

    if (type === "remove") {
      stockFilter.$expr = {
        $and: [
          { $gte: ["$onHand", quantity] },
          {
            $gte: [
              { $subtract: ["$onHand", quantity] },
              "$reserved",
            ],
          },
        ],
      };
    } else if (type === "set") {
      stockFilter.reserved = { $lte: quantity };
    }

    const previousInventory = await Inventory.findOneAndUpdate(
      stockFilter,
      update,
      { new: false }
    );

    if (!previousInventory) {
      return NextResponse.json(
        {
          success: false,
          message:
            type === "set"
              ? "Stock cannot be set below the reserved quantity."
              : "Insufficient stock available for this adjustment.",
        },
        { status: 409 }
      );
    }

    const previousStock = previousInventory.onHand;
    const newStock =
      type === "add"
        ? previousStock + quantity
        : type === "remove"
          ? previousStock - quantity
          : quantity;
    const difference = newStock - previousStock;
    let movementId: mongoose.Types.ObjectId | undefined;
    let totalProductStock = 0;

    try {
      const movement = await StockMovement.create({
        productId,
        warehouse: normalizedWarehouse,
        type,
        quantity: Math.abs(difference),
        previousStock,
        newStock,
        reason: reason.trim(),
      });
      movementId = movement._id;

      const totals = await Inventory.aggregate([
        { $match: { productId: product._id } },
        {
          $group: {
            _id: null,
            stock: { $sum: "$onHand" },
          },
        },
      ]);
      totalProductStock = totals[0]?.stock ?? 0;
      const status =
        totalProductStock <= 0
          ? "Out of Stock"
          : totalProductStock <= product.lowStockThreshold
            ? "Low Stock"
            : "Active";

      const productUpdate = await Product.updateOne(
        { _id: product._id },
        { $set: { stock: totalProductStock, status } }
      );

      if (productUpdate.matchedCount !== 1) {
        throw new Error("Product was removed during stock adjustment.");
      }
    } catch (saveError) {
      if (movementId) {
        await StockMovement.deleteOne({ _id: movementId });
      }
      await Inventory.updateOne(
        { _id: inventory._id, onHand: newStock },
        type === "set"
          ? { $set: { onHand: previousStock } }
          : { $inc: { onHand: -difference } }
      );
      const restoredTotals = await Inventory.aggregate([
        { $match: { productId: product._id } },
        { $group: { _id: null, stock: { $sum: "$onHand" } } },
      ]);
      const restoredStock = restoredTotals[0]?.stock ?? 0;
      await Product.updateOne(
        { _id: product._id },
        {
          $set: {
            stock: restoredStock,
            status:
              restoredStock <= 0
                ? "Out of Stock"
                : restoredStock <= product.lowStockThreshold
                  ? "Low Stock"
                  : "Active",
          },
        }
      );
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
        available: Math.max(0, newStock - previousInventory.reserved),
        totalProductStock,
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
