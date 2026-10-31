
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Inventory from "@/models/Inventory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const channels = ["Website", "Amazon", "Flipkart", "Meesho"];

function getDateRange(range: string, from?: string, to?: string) {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (from && to) {
    start = new Date(from);
    end = new Date(to);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  switch (range) {
    case "7":
      start.setDate(now.getDate() - 6);
      break;
    case "90":
      start.setDate(now.getDate() - 89);
      break;
    case "365":
      start.setDate(now.getDate() - 364);
      break;
    case "today":
      break;
    default:
      start.setDate(now.getDate() - 29);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const params = request.nextUrl.searchParams;
    const range = params.get("range") || "30";
    const warehouse = params.get("warehouse") || "all";
    const marketplace = params.get("marketplace") || "all";
    const from = params.get("from") || undefined;
    const to = params.get("to") || undefined;

    const { start, end } = getDateRange(range, from, to);

    const orderMatch: any = {
      placedAt: { $gte: start, $lte: end },
      status: { $ne: "Cancelled" },
    };

    if (marketplace !== "all") {
      orderMatch.channel = marketplace;
    }

    const inventoryMatch: any = {};
    if (warehouse !== "all") {
      inventoryMatch.warehouse = warehouse;
    }

    const [
      orderSummary,
      salesTrend,
      marketplaceData,
      topProducts,
      inventoryData,
      warehouses,
    ] = await Promise.all([
      Order.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$totalAmount" },
            totalOrders: { $sum: 1 },
          },
        },
      ]),

      Order.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: {
              year: { $year: "$placedAt" },
              month: { $month: "$placedAt" },
            },
            sales: { $sum: "$totalAmount" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        {
          $project: {
            _id: 0,
            month: {
              $dateToString: {
                format: "%b",
                date: {
                  $dateFromParts: {
                    year: "$_id.year",
                    month: "$_id.month",
                    day: 1,
                  },
                },
              },
            },
            sales: 1,
            orders: 1,
            year: "$_id.year",
            monthNumber: "$_id.month",
          },
        },
      ]),

      Order.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: "$channel",
            sales: { $sum: "$totalAmount" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { sales: -1 } },
      ]),

      Order.aggregate([
        { $match: orderMatch },
        { $unwind: "$items" },
        {
          $group: {
            _id: {
              productId: "$items.productId",
              name: "$items.name",
              sku: "$items.sku",
              image: "$items.image",
            },
            sales: { $sum: "$items.total" },
            unitsSold: { $sum: "$items.quantity" },
          },
        },
        { $sort: { sales: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            productId: "$_id.productId",
            name: "$_id.name",
            sku: "$_id.sku",
            image: "$_id.image",
            sales: 1,
            unitsSold: 1,
          },
        },
      ]),

      Inventory.aggregate([
        { $match: inventoryMatch },
        {
          $lookup: {
            from: Product.collection.name,
            localField: "productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $addFields: {
            availableStock: {
              $subtract: ["$onHand", "$reserved"],
            },
            stockValue: {
              $multiply: [
                "$onHand",
                { $ifNull: ["$product.costPrice", 0] },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            inventoryValue: { $sum: "$stockValue" },
            totalUnits: { $sum: "$onHand" },
            lowStockRecords: {
              $sum: {
                $cond: [
                  { $lte: ["$availableStock", "$safetyStock"] },
                  1,
                  0,
                ],
              },
            },
            productIds: { $addToSet: "$productId" },
          },
        },
        {
          $project: {
            _id: 0,
            inventoryValue: 1,
            totalUnits: 1,
            lowStockRecords: 1,
            totalProducts: { $size: "$productIds" },
          },
        },
      ]),

      Inventory.distinct("warehouse"),
    ]);

    const summary = orderSummary[0] || {
      totalSales: 0,
      totalOrders: 0,
    };

    const inventory = inventoryData[0] || {
      inventoryValue: 0,
      totalUnits: 0,
      lowStockRecords: 0,
      totalProducts: 0,
    };

    const marketplaceTotals = channels.map((channel) => {
      const found = marketplaceData.find((item: any) => item._id === channel);
      return {
        channel,
        sales: found?.sales || 0,
        orders: found?.orders || 0,
      };
    });

    return NextResponse.json({
      success: true,
      filters: {
        range,
        warehouse,
        marketplace,
        startDate: start,
        endDate: end,
      },
      summary: {
        totalSales: summary.totalSales,
        totalOrders: summary.totalOrders,
        inventoryValue: inventory.inventoryValue,
        lowStockProducts: inventory.lowStockRecords,
        totalUnits: inventory.totalUnits,
        totalProducts: inventory.totalProducts,
      },
      salesTrend,
      marketplaceData: marketplaceTotals,
      topProducts,
      warehouses: warehouses.filter(Boolean).sort(),
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch reports data" },
      { status: 500 }
    );
  }
}
