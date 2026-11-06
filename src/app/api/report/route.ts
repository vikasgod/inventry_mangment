
import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
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
  const authorization = await authorizeRequest("reports");
  if (authorization) return authorization;

  try {
    await connectDB();

    const params = request.nextUrl.searchParams;
    const range = params.get("range") || "30";
    const warehouse = params.get("warehouse") || "all";
    const marketplace = params.get("marketplace") || "all";
    const from = params.get("from") || undefined;
    const to = params.get("to") || undefined;

    const { start, end } = getDateRange(range, from, to);
    const dailyTrend = range === "7";
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
      salesTrendData,
      marketplaceData,
      marketplaceProfitData,
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
            _id: dailyTrend
              ? {
                  date: {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$placedAt",
                      timezone,
                    },
                  },
                }
              : {
                  year: { $year: "$placedAt" },
                  month: { $month: "$placedAt" },
                },
            sales: { $sum: "$totalAmount" },
            orders: { $sum: 1 },
          },
        },
        {
          $sort: dailyTrend
            ? { "_id.date": 1 }
            : { "_id.year": 1, "_id.month": 1 },
        },
        {
          $project: {
            _id: 0,
            label: dailyTrend
              ? "$_id.date"
              : {
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
            _id: { orderId: "$_id", channel: "$channel" },
            itemSales: { $sum: { $ifNull: ["$items.total", 0] } },
            itemDiscount: {
              $sum: {
                $cond: [
                  { $isNumber: "$items.discount" },
                  "$items.discount",
                  0,
                ],
              },
            },
            discountSnapshotItems: {
              $sum: {
                $cond: [{ $isNumber: "$items.discount" }, 1, 0],
              },
            },
            itemCount: { $sum: 1 },
            costOfGoodsSold: {
              $sum: {
                $cond: [
                  { $isNumber: "$items.unitCost" },
                  {
                    $multiply: [
                      "$items.unitCost",
                      { $ifNull: ["$items.quantity", 0] },
                    ],
                  },
                  0,
                ],
              },
            },
            missingCostItems: {
              $sum: {
                $cond: [{ $isNumber: "$items.unitCost" }, 0, 1],
              },
            },
            discount: { $first: { $ifNull: ["$discount", 0] } },
            subtotal: { $first: { $ifNull: ["$subtotal", 0] } },
          },
        },
        {
          $addFields: {
            netItemSales: {
              $cond: [
                { $eq: ["$discountSnapshotItems", "$itemCount"] },
                { $subtract: ["$itemSales", "$itemDiscount"] },
                {
                  $subtract: [
                    "$itemSales",
                    {
                      $multiply: [
                        { $min: ["$discount", "$subtotal"] },
                        {
                          $cond: [
                            { $gt: ["$subtotal", 0] },
                            { $divide: ["$itemSales", "$subtotal"] },
                            0,
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: "$_id.channel",
            netItemSales: { $sum: "$netItemSales" },
            costOfGoodsSold: { $sum: "$costOfGoodsSold" },
            missingCostItems: { $sum: "$missingCostItems" },
          },
        },
      ]),

      Order.aggregate([
        { $match: orderMatch },
        { $unwind: "$items" },
        {
          $addFields: {
            netItemSales: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ["$items.total", 0] },
                    {
                      $cond: [
                        { $isNumber: "$items.discount" },
                        "$items.discount",
                        {
                          $multiply: [
                            { $min: ["$discount", "$subtotal"] },
                            {
                              $cond: [
                                { $gt: ["$subtotal", 0] },
                                { $divide: ["$items.total", "$subtotal"] },
                                0,
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              productId: "$items.productId",
              name: "$items.name",
              sku: "$items.sku",
              image: "$items.image",
            },
            sales: { $sum: "$netItemSales" },
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

    let salesTrend = salesTrendData;
    if (dailyTrend) {
      const salesByDate = new Map(
        salesTrendData.map((item: any) => [item.label, item])
      );
      salesTrend = [];
      const date = new Date(start);
      date.setHours(0, 0, 0, 0);
      const lastDate = new Date(end);
      lastDate.setHours(0, 0, 0, 0);

      while (date <= lastDate) {
        const key = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const item = salesByDate.get(key);
        salesTrend.push({
          label: date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            timeZone: timezone,
          }),
          sales: item?.sales ?? 0,
          orders: item?.orders ?? 0,
        });
        date.setDate(date.getDate() + 1);
      }
    }

    const marketplaceTotals = channels.map((channel) => {
      const found = marketplaceData.find((item: any) => item._id === channel);
      const profit = marketplaceProfitData.find(
        (item: any) => item._id === channel
      );
      return {
        channel,
        sales: found?.sales || 0,
        orders: found?.orders || 0,
        netItemSales: profit?.netItemSales || 0,
        costOfGoodsSold: profit?.costOfGoodsSold || 0,
        grossProfit:
          (profit?.missingCostItems || 0) > 0
            ? null
            : (profit?.netItemSales || 0) - (profit?.costOfGoodsSold || 0),
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
        grossProfit: marketplaceTotals.some(
          (item) => item.orders > 0 && item.grossProfit === null
        )
          ? null
          : marketplaceTotals.reduce(
              (total, item) => total + (item.grossProfit || 0),
              0
            ),
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
