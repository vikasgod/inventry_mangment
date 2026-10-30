import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";

export const dynamic = "force-dynamic";

const statuses = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const channels = [
  "Website",
  "Amazon",
  "Flipkart",
  "Meesho",
];

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const params = request.nextUrl.searchParams;

    const channel = params.get("channel") || "all";
    const status = params.get("status") || "all";
    const q = params.get("q")?.trim();
    const from = params.get("from");
    const to = params.get("to");

    const page = Math.max(
      1,
      Number(params.get("page") || 1)
    );

    const limit = Math.min(
      100,
      Math.max(1, Number(params.get("limit") || 50))
    );

    const filter: Record<string, unknown> = {};

    if (channel !== "all") {
      if (!channels.includes(channel)) {
        return NextResponse.json(
          { success: false, message: "Invalid channel" },
          { status: 400 }
        );
      }

      filter.channel = channel;
    }

    if (status !== "all") {
      if (!statuses.includes(status)) {
        return NextResponse.json(
          { success: false, message: "Invalid status" },
          { status: 400 }
        );
      }

      filter.status = status;
    }

    if (q) {
      const safeQuery = q.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.$or = [
        {
          orderNumber: {
            $regex: safeQuery,
            $options: "i",
          },
        },
        {
          "customer.name": {
            $regex: safeQuery,
            $options: "i",
          },
        },
        {
          "customer.email": {
            $regex: safeQuery,
            $options: "i",
          },
        },
        {
          "items.sku": {
            $regex: safeQuery,
            $options: "i",
          },
        },
      ];
    }

    if (from || to) {
      const dateFilter: Record<string, Date> = {};

      if (from) {
        const start = new Date(`${from}T00:00:00.000Z`);

        if (Number.isNaN(start.getTime())) {
          return NextResponse.json(
            { success: false, message: "Invalid start date" },
            { status: 400 }
          );
        }

        dateFilter.$gte = start;
      }

      if (to) {
        const end = new Date(`${to}T23:59:59.999Z`);

        if (Number.isNaN(end.getTime())) {
          return NextResponse.json(
            { success: false, message: "Invalid end date" },
            { status: 400 }
          );
        }

        dateFilter.$lte = end;
      }

      filter.placedAt = dateFilter;
    }

    const [orders, total, allStats] = await Promise.all([
      Order.find(filter)
        .sort({ placedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Order.countDocuments(filter),

      Order.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const counts: Record<string, number> = {};

    for (const item of allStats) {
      counts[item._id] = item.count;
    }

    return NextResponse.json({
      success: true,
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        total: Object.values(counts).reduce(
          (sum, value) => sum + value,
          0
        ),
        pending:
          (counts.Pending || 0) +
          (counts.Processing || 0),
        shipped: counts.Shipped || 0,
        delivered: counts.Delivered || 0,
        cancelled: counts.Cancelled || 0,
      },
    });
  } catch (error) {
    console.error("GET orders error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}



export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const allowedChannels = [
      "Website",
      "Amazon",
      "Flipkart",
      "Meesho",
    ];

    const allowedStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    // Validate channel
    if (!allowedChannels.includes(body.channel)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid channel",
        },
        { status: 400 }
      );
    }

    // Validate customer
    if (
      !body.customer?.name ||
      typeof body.customer.name !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer name is required",
        },
        { status: 400 }
      );
    }

    // Validate items
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one order item is required",
        },
        { status: 400 }
      );
    }

    const items = body.items.map((item: any) => {
      const price = Number(item.price);
      const quantity = Number(item.quantity);

      if (
        !item.name ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        throw new Error("INVALID_ORDER_ITEM");
      }

      return {
        ...(item.productId
          ? { productId: item.productId }
          : {}),
        name: item.name,
        sku: item.sku || "",
        image: item.image || "",
        variant: item.variant || "",
        price,
        quantity,
        total: price * quantity,
      };
    });

    // Calculate subtotal
    const subtotal = items.reduce(
      (sum: number, item: { total: number }) =>
        sum + item.total,
      0
    );

    const shipping = Number(body.shipping ?? 0);
    const discount = Number(body.discount ?? 0);

    // Validate shipping and discount
    if (
      !Number.isFinite(shipping) ||
      shipping < 0 ||
      !Number.isFinite(discount) ||
      discount < 0 ||
      discount > subtotal + shipping
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid shipping or discount amount",
        },
        { status: 400 }
      );
    }

    const totalAmount = subtotal + shipping - discount;

    // Validate status
    const status = body.status || "Pending";

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid order status",
        },
        { status: 400 }
      );
    }

    // Handle external order ID
    const externalOrderId =
      typeof body.externalOrderId === "string"
        ? body.externalOrderId.trim()
        : "";

    // Create order
    const order = await Order.create({
      orderNumber:
        body.orderNumber || `ORD-${Date.now()}`,

      channel: body.channel,

      ...(externalOrderId
        ? { externalOrderId }
        : {}),

      customer: body.customer,

      items,

      subtotal,
      shipping,
      discount,
      totalAmount,

      status,

      paymentMethod:
        body.paymentMethod || "Cash on Delivery (COD)",

      paymentStatus:
        body.paymentStatus || "Pending Payment",

      shippingMethod:
        body.shippingMethod ||
        "Standard Delivery (3-5 days)",

      trackingNumber: body.trackingNumber || "",

      placedAt: body.placedAt
        ? new Date(body.placedAt)
        : new Date(),

      statusHistory: [
        {
          status,
          note: "Order created",
          at: new Date(),
        },
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Order created successfully",
        order,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("POST orders error:", error);

    // Invalid item
    if (
      error instanceof Error &&
      error.message === "INVALID_ORDER_ITEM"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Each item needs a name, valid price and quantity",
        },
        { status: 400 }
      );
    }

    // MongoDB duplicate key
    const mongoError = error as {
      code?: number;
      keyPattern?: Record<string, number>;
    };

    if (mongoError.code === 11000) {
      if (mongoError.keyPattern?.orderNumber) {
        return NextResponse.json(
          {
            success: false,
            message: "Order number already exists",
          },
          { status: 409 }
        );
      }

      if (mongoError.keyPattern?.externalOrderId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "External order ID already exists for this channel",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Duplicate order record",
        },
        { status: 409 }
      );
    }

    // Mongoose validation
    if (
      error instanceof Error &&
      (error.name === "ValidationError" ||
        error.name === "CastError")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create order",
      },
      { status: 500 }
    );
  }
}

