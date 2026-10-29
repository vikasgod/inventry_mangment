
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Order from "@/models/Order";

export const dynamic = "force-dynamic";

const PERIODS: Record<string, number> = {
    "30days": 30,
    "3months": 90,
    "6months": 180,
    "12months": 365,
};

const EXCLUDED_REVENUE_STATUSES = [
    "cancelled",
    "canceled",
    "refunded",
];

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const period = request.nextUrl.searchParams.get("period") || "6months";
        const days = PERIODS[period] ?? 180;

        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);

        // 1. Total products
        const totalProducts = await Product.countDocuments({
            isArchived: { $ne: true },
        });

        // 2. Total orders
        const totalOrders = await Order.countDocuments({});

        // 3. Total revenue
        // Cancelled and refunded orders are excluded.
        const revenueResult = await Order.aggregate([
            {
                $match: {
                    status: {
                        $nin: EXCLUDED_REVENUE_STATUSES,
                    },
                    createdAt: {
                        $gte: startDate,
                        $lte: now,
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $ifNull: ["$totalAmount", 0] } },
                },
            },
        ]);

        const totalRevenue = revenueResult[0]?.total ?? 0;

        // 4. Low stock products
        // Supports either `stock` or `quantity` in Product schema.
        const lowStockProducts = await Product.aggregate([
            {
                $match: {
                    isArchived: { $ne: true },
                },
            },
            {
                $addFields: {
                    availableStock: {
                        $ifNull: ["$stock", { $ifNull: ["$quantity", 0] }],
                    },
                    threshold: {
                        $ifNull: ["$lowStockThreshold", 10],
                    },
                },
            },
            {
                $match: {
                    $expr: {
                        $lte: ["$availableStock", "$threshold"],
                    },
                },
            },
            {
                $project: {
                    name: 1,
                    sku: 1,
                    stock: "$availableStock",
                    quantity: "$availableStock",
                    lowStockThreshold: "$threshold",
                },
            },
            { $sort: { stock: 1 } },
            { $limit: 10 },
        ]);

        // Count all low-stock products, not just the displayed 10.
        const lowStockCount = await Product.aggregate([
            {
                $match: {
                    isArchived: { $ne: true },
                },
            },
            {
                $addFields: {
                    availableStock: {
                        $ifNull: ["$stock", { $ifNull: ["$quantity", 0] }],
                    },
                    threshold: {
                        $ifNull: ["$lowStockThreshold", 10],
                    },
                },
            },
            {
                $match: {
                    $expr: {
                        $lte: ["$availableStock", "$threshold"],
                    },
                },
            },
            { $count: "count" },
        ]);

        // 5. Recent orders
        const recentOrders = await Order.find({})
            .sort({ createdAt: -1 })
            .limit(8)
            .select(
                "_id orderNumber customerName customer channel status totalAmount createdAt"
            )
            .lean();

        // 6. Monthly sales / daily sales for the last 30 days
        const salesByDate = await Order.aggregate([
            {
                $match: {
                    status: {
                        $nin: EXCLUDED_REVENUE_STATUSES,
                    },
                    createdAt: {
                        $gte: startDate,
                        $lte: now,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: days <= 30 ? "%Y-%m-%d" : "%Y-%m",
                            date: "$createdAt",
                        },
                    },
                    sales: {
                        $sum: { $ifNull: ["$totalAmount", 0] },
                    },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const salesMap = new Map<string, number>(
            salesByDate.map((item) => [item._id, item.sales])
        );

        const monthlySales: { month: string; sales: number }[] = [];

        if (days <= 30) {
            // Fill missing dates with zero sales.
            const cursor = new Date(startDate);
            cursor.setUTCHours(0, 0, 0, 0);

            const end = new Date(now);
            end.setUTCHours(0, 0, 0, 0);

            while (cursor <= end) {
                const key = cursor.toISOString().slice(0, 10);

                monthlySales.push({
                    month: cursor.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                    }),
                    sales: salesMap.get(key) ?? 0,
                });

                cursor.setUTCDate(cursor.getUTCDate() + 1);
            }
        } else {
            // Fill missing months with zero sales.
            const cursor = new Date(startDate);
            cursor.setUTCDate(1);
            cursor.setUTCHours(0, 0, 0, 0);

            const end = new Date(now);
            end.setUTCDate(1);
            end.setUTCHours(0, 0, 0, 0);

            while (cursor <= end) {
                const key = cursor.toISOString().slice(0, 7);

                monthlySales.push({
                    month: cursor.toLocaleDateString("en-IN", {
                        month: "short",
                        year: "2-digit",
                        timeZone: "UTC",
                    }),
                    sales: salesMap.get(key) ?? 0,
                });

                cursor.setUTCMonth(cursor.getUTCMonth() + 1);
            }
        }

        // 7. Channel-wise sales and order count
        const channelResults = await Order.aggregate([
            {
                $match: {
                    status: {
                        $nin: EXCLUDED_REVENUE_STATUSES,
                    },
                    createdAt: {
                        $gte: startDate,
                        $lte: now,
                    },
                },
            },
            {
                $addFields: {
                    normalizedChannel: {
                        $ifNull: ["$channel", "Website"],
                    },
                },
            },
            {
                $group: {
                    _id: "$normalizedChannel",
                    sales: {
                        $sum: { $ifNull: ["$totalAmount", 0] },
                    },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { sales: -1 } },
        ]);

        const channelSales = channelResults.map((item) => ({
            channel: item._id,
            sales: item.sales,
            orders: item.orders,
        }));

        return NextResponse.json({
            success: true,
            data: {
                totalProducts,
                totalOrders,
                totalRevenue,
                lowStockCount: lowStockCount[0]?.count ?? 0,
                monthlySales,
                recentOrders,
                lowStockProducts,
                channelSales,
            },
        });
    } catch (error) {
        console.error("Dashboard API error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Unable to load dashboard data.",
            },
            { status: 500 }
        );
    }
}
