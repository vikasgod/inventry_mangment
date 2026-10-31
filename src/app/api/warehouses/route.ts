
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Warehouse from "@/models/Warehouse";
import Inventory from "@/models/Inventory";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const params = request.nextUrl.searchParams;

    const page = Math.max(1, Number(params.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 10));
    const search = params.get("search")?.trim() || "";
    const status = params.get("status") || "";
    const city = params.get("city") || "";

    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { state: { $regex: search, $options: "i" } },
      ];
    }

    if (status && status !== "All Status") {
      filter.status = status;
    }

    if (city && city !== "All Cities") {
      filter.city = city;
    }

    const [warehouses, total, allWarehouses] = await Promise.all([
      Warehouse.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Warehouse.countDocuments(filter),

      Warehouse.find({})
        .select("name city status")
        .lean(),
    ]);

    const inventoryStats = await Inventory.aggregate([
      {
        $group: {
          _id: "$warehouse",
          stockUnits: { $sum: "$onHand" },
          reservedStock: { $sum: "$reserved" },
          products: { $addToSet: "$productId" },
          lowStock: {
            $sum: {
              $cond: [
                { $lte: ["$onHand", "$safetyStock"] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          stockUnits: 1,
          reservedStock: 1,
          totalProducts: { $size: "$products" },
          lowStock: 1,
          availableStock: {
            $max: [
              0,
              { $subtract: ["$stockUnits", "$reservedStock"] },
            ],
          },
        },
      },
    ]);

    const statsMap = new Map(
      inventoryStats.map((item: any) => [item._id, item])
    );

    const data = warehouses.map((warehouse: any) => {
      const stats: any = statsMap.get(warehouse.name);

      const stockUnits = stats?.stockUnits || 0;

      return {
        ...warehouse,
        stockUnits,
        reservedStock: stats?.reservedStock || 0,
        availableStock: stats?.availableStock || 0,
        totalProducts: stats?.totalProducts || 0,
        lowStock: stats?.lowStock || 0,
        capacityUsed:
          warehouse.capacity > 0
            ? Math.min(100, Math.round((stockUnits / warehouse.capacity) * 100))
            : 0,
      };
    });

    const [totalProducts, stockSummary] = await Promise.all([
      Inventory.distinct("productId"),
      Inventory.aggregate([
        {
          $group: {
            _id: null,
            totalStock: { $sum: "$onHand" },
          },
        },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      data,
      summary: {
        totalWarehouses: allWarehouses.length,
        activeWarehouses: allWarehouses.filter(
          (w: any) => w.status === "Active"
        ).length,
        totalProducts: totalProducts.length,
        totalStockUnits: stockSummary[0]?.totalStock || 0,
        cities: [...new Set(allWarehouses.map((w: any) => w.city))],
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Warehouse GET Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch warehouses" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const {
      name,
      code,
      type,
      contactPerson,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      capacity,
      status,
    } = body;

    if (!name?.trim() || !code?.trim() || !address?.trim() ||
        !city?.trim() || !state?.trim()) {
      return NextResponse.json(
        { success: false, message: "Please fill all required fields." },
        { status: 400 }
      );
    }

    const existing = await Warehouse.findOne({
      code: code.trim().toUpperCase(),
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Warehouse code already exists." },
        { status: 409 }
      );
    }

    const warehouse = await Warehouse.create({
      ...body,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      capacity: Number(capacity) || 0,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Warehouse created successfully.",
        data: warehouse,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Warehouse POST Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create warehouse." },
      { status: 500 }
    );
  }
}
