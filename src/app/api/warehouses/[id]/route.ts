
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Warehouse from "@/models/Warehouse";
import Inventory from "@/models/Inventory";
import connectDB from "@/lib/mongodb";

export const dynamic = "force-dynamic";

type Context = {
    params: Promise<{ id: string }>;
};

export async function GET(
    request: NextRequest,
    { params }: Context
) {
    try {
        await connectDB();

        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: "Invalid warehouse ID" },
                { status: 400 }
            );
        }

        const warehouse = await Warehouse.findById(id).lean();

        if (!warehouse) {
            return NextResponse.json(
                { success: false, message: "Warehouse not found" },
                { status: 404 }
            );
        }

        const inventory = await Inventory.find({
            warehouse: warehouse.name,
        })
            .populate("productId", "name sku images price")
            .lean();

        const stockUnits = inventory.reduce(
            (sum: number, item: any) => sum + (item.onHand || 0),
            0
        );

        const reservedStock = inventory.reduce(
            (sum: number, item: any) => sum + (item.reserved || 0),
            0
        );

        return NextResponse.json({
            success: true,
            data: {
                ...warehouse,
                inventory,
                stockUnits,
                reservedStock,
                availableStock: Math.max(0, stockUnits - reservedStock),
                totalProducts: new Set(
                    inventory.map((item: any) => String(item.productId?._id || item.productId))
                ).size,
                lowStock: inventory.filter(
                    (item: any) => item.onHand <= item.safetyStock
                ).length,
                capacityUsed: warehouse.capacity > 0
                    ? Math.min(100, Math.round((stockUnits / warehouse.capacity) * 100))
                    : 0,
            },
        });
    } catch (error) {
        console.error("Warehouse Details Error:", error);

        return NextResponse.json(
            { success: false, message: "Failed to fetch warehouse" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: Context
) {
    try {
        await connectDB();

        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: "Invalid warehouse ID" },
                { status: 400 }
            );
        }

        const body = await request.json();

        const warehouse = await Warehouse.findById(id);

        if (!warehouse) {
            return NextResponse.json(
                { success: false, message: "Warehouse not found" },
                { status: 404 }
            );
        }

        if (body.code) {
            const duplicate = await Warehouse.findOne({
                code: body.code.trim().toUpperCase(),
                _id: { $ne: id },
            });

            if (duplicate) {
                return NextResponse.json(
                    { success: false, message: "Warehouse code already exists" },
                    { status: 409 }
                );
            }
        }

        // Keep existing inventory references consistent if name changes.
        if (body.name && body.name !== warehouse.name) {
            await Inventory.updateMany(
                { warehouse: warehouse.name },
                { $set: { warehouse: body.name } }
            );
        }

        const allowedFields = [
            "name",
            "code",
            "type",
            "contactPerson",
            "phone",
            "email",
            "address",
            "city",
            "state",
            "pincode",
            "capacity",
            "status",
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                (warehouse as any)[field] =
                    field === "capacity"
                        ? Number(body[field])
                        : body[field];
            }
        }

        await warehouse.save();

        return NextResponse.json({
            success: true,
            message: "Warehouse updated successfully",
            data: warehouse,
        });
    } catch (error) {
        console.error("Warehouse PUT Error:", error);

        return NextResponse.json(
            { success: false, message: "Failed to update warehouse" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: Context
) {
    try {
        await connectDB();

        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: "Invalid warehouse ID" },
                { status: 400 }
            );
        }

        const warehouse = await Warehouse.findById(id);

        if (!warehouse) {
            return NextResponse.json(
                { success: false, message: "Warehouse not found" },
                { status: 404 }
            );
        }

        const inventoryCount = await Inventory.countDocuments({
            warehouse: warehouse.name,
        });

        if (inventoryCount > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "This warehouse contains inventory. Transfer or remove its stock before deleting.",
                },
                { status: 400 }
            );
        }

        await Warehouse.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: "Warehouse deleted successfully",
        });
    } catch (error) {
        console.error("Warehouse DELETE Error:", error);

        return NextResponse.json(
            { success: false, message: "Failed to delete warehouse" },
            { status: 500 }
        );
    }
}
