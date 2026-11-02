import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Pricing from "@/models/Pricing";
import Offer from "@/models/Offer";
import Warehouse from "@/models/Warehouse";
import {
  consumeOrderStock,
  isTransactionUnsupportedError,
  OrderStockError,
  releaseOrderStock,
  rollbackOrderStockConsumption,
  reserveOrderStock,
  type StockAllocation,
  type StockConsumption,
} from "@/lib/order-stock";

type ResolvedOrderItem = {
  productId: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  image: string;
  variant: string;
  price: number;
  unitCost?: number;
  quantity: number;
  total: number;
  discount: number;
  cgstRate: number;
  sgstRate: number;
};

type ProductSnapshot = {
  _id: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  images?: { url: string }[];
  cgstRate?: number;
  sgstRate?: number;
  costPrice?: number;
  price?: number;
  category?: string;
};

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

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export async function GET(request: NextRequest) {
  const authorization = await authorizeRequest("orders");
  if (authorization) return authorization;

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

    const requestedItems = body.items.map((item: any) => {
      if (!item || typeof item !== "object") {
        throw new Error("INVALID_ORDER_ITEM");
      }

      const quantity = Number(item.quantity);

      if (
        (item.price !== undefined &&
          (!Number.isFinite(Number(item.price)) || Number(item.price) < 0)) ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        throw new Error("INVALID_ORDER_ITEM");
      }

      return { item, quantity };
    });

    const shipping = Number(body.shipping ?? 0);
    const requestedDiscount = Number(body.discount ?? 0);
    const offerCode =
      typeof body.offerCode === "string" ? body.offerCode.trim().toUpperCase() : "";

    if (
      !Number.isFinite(shipping) ||
      shipping < 0 ||
      !Number.isFinite(requestedDiscount) ||
      requestedDiscount < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid shipping or discount amount",
        },
        { status: 400 }
      );
    }

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

    const warehouseName =
      typeof body.warehouse === "string" && body.warehouse.trim()
        ? body.warehouse.trim()
        : process.env.DEFAULT_ORDER_WAREHOUSE?.trim() || "";

    if (!warehouseName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Warehouse is required. Set DEFAULT_ORDER_WAREHOUSE or include warehouse in the order.",
        },
        { status: 400 }
      );
    }

    const warehouse = await Warehouse.findOne({
      name: warehouseName,
      status: "Active",
    }).lean();

    if (!warehouse) {
      return NextResponse.json(
        {
          success: false,
          message: `Active warehouse "${warehouseName}" was not found.`,
        },
        { status: 400 }
      );
    }

    const items: ResolvedOrderItem[] = [];
    const quantitiesByProduct = new Map<string, number>();
    const categoriesByProduct = new Map<string, string>();

    for (const { item, quantity } of requestedItems) {
      const productQuery = item.productId
        ? mongoose.isValidObjectId(item.productId)
          ? { _id: item.productId, isArchived: { $ne: true } }
          : null
        : typeof item.sku === "string" && item.sku.trim()
          ? {
              sku: item.sku.trim().toUpperCase(),
              isArchived: { $ne: true },
            }
          : null;

      if (!productQuery) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Each order item must reference an active product using productId or SKU.",
          },
          { status: 400 }
        );
      }

      const product = await Product.findOne(productQuery)
        .lean<ProductSnapshot>()
        .exec();

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            message: `Product ${item.sku || item.productId} was not found.`,
          },
          { status: 400 }
        );
      }

      const productId = String(product._id);
      const pricing = await Pricing.findOne({ productId: product._id })
        .select(`prices.${body.channel}`)
        .lean<{ prices?: Record<string, number> } | null>();
      const channelPrice = pricing?.prices?.[body.channel];
      const price =
        channelPrice !== undefined && Number.isFinite(Number(channelPrice))
          ? Number(channelPrice)
          : Number(product.price ?? 0);
      quantitiesByProduct.set(
        productId,
        (quantitiesByProduct.get(productId) || 0) + quantity
      );
      categoriesByProduct.set(productId, product.category || "");

      items.push({
        productId: product._id,
        name: product.name,
        sku: product.sku,
        image:
          typeof item.image === "string"
            ? item.image
            : product.images?.[0]?.url || "",
        variant: typeof item.variant === "string" ? item.variant : "",
        price,
        unitCost:
          Number(product.costPrice) > 0
            ? Number(product.costPrice)
            : undefined,
        discount: 0,
        quantity,
        total: price * quantity,
        cgstRate: Number(product.cgstRate ?? 0),
        sgstRate: Number(product.sgstRate ?? 0),
      });
    }

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const now = new Date();
    const activeOffers = await Offer.find({
      channel: { $in: ["All Channels", body.channel] },
      code: offerCode,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ startDate: -1, createdAt: -1 })
      .lean();
    const applicableOffer = activeOffers.find((offer) =>
      items.some((item) => {
        const category = categoriesByProduct.get(String(item.productId));
        return offer.products === "All Products" || offer.products === category;
      })
    );

    if (offerCode && !applicableOffer) {
      return NextResponse.json(
        {
          success: false,
          message: "The offer code is invalid, expired, or not applicable to this order.",
        },
        { status: 400 }
      );
    }

    if (applicableOffer) {
      const eligibleItems = items.filter((item) => {
        const category = categoriesByProduct.get(String(item.productId));
        return (
          applicableOffer.products === "All Products" ||
          applicableOffer.products === category
        );
      });
      const eligibleSubtotal = eligibleItems.reduce(
        (sum, item) => sum + item.total,
        0
      );

      if (applicableOffer.type === "Percentage") {
        for (const item of eligibleItems) {
          item.discount = roundMoney(
            (item.total * Number(applicableOffer.value)) / 100
          );
        }
      } else if (eligibleSubtotal > 0) {
        const totalOfferDiscount = Math.min(
          Number(applicableOffer.value),
          eligibleSubtotal
        );
        let allocatedDiscount = 0;
        eligibleItems.forEach((item, index) => {
          const itemDiscount =
            index === eligibleItems.length - 1
              ? totalOfferDiscount - allocatedDiscount
              : Math.min(
                  totalOfferDiscount - allocatedDiscount,
                  roundMoney((totalOfferDiscount * item.total) / eligibleSubtotal)
                );
          item.discount = roundMoney(itemDiscount);
          allocatedDiscount += item.discount;
        });
      }
    } else if (requestedDiscount > 0 && subtotal > 0) {
      const itemDiscount = Math.min(requestedDiscount, subtotal);
      let allocatedDiscount = 0;
      items.forEach((item, index) => {
        const itemDiscountAmount =
          index === items.length - 1
            ? itemDiscount - allocatedDiscount
            : Math.min(
                itemDiscount - allocatedDiscount,
                roundMoney((itemDiscount * item.total) / subtotal)
              );
        item.discount = roundMoney(itemDiscountAmount);
        allocatedDiscount += item.discount;
      });
    }

    const discount = applicableOffer
      ? roundMoney(items.reduce((sum, item) => sum + item.discount, 0))
      : requestedDiscount;

    if (discount > subtotal + shipping) {
      return NextResponse.json(
        { success: false, message: "Invalid shipping or discount amount" },
        { status: 400 }
      );
    }

    const totalAmount = subtotal + shipping - discount;
    const allocations: StockAllocation[] = [...quantitiesByProduct].map(
      ([productId, quantity]) => ({
        productId: new mongoose.Types.ObjectId(productId),
        quantity,
      })
    );

    const externalOrderId =
      typeof body.externalOrderId === "string"
        ? body.externalOrderId.trim()
        : "";

    const inventoryStatus =
      status === "Cancelled"
        ? "released"
        : status === "Shipped" || status === "Delivered"
          ? "deducted"
          : "reserved";

    const orderData = {
      orderNumber: body.orderNumber || `ORD-${Date.now()}`,
      channel: body.channel,
      warehouse: warehouseName,
      stockAllocations:
        inventoryStatus === "released" ? [] : allocations,
      inventoryStatus,
      ...(externalOrderId ? { externalOrderId } : {}),
      customer: {
        ...body.customer,
        billingAddress:
          typeof body.customer.billingAddress === "string"
            ? body.customer.billingAddress
            : body.customer.address || "",
        shippingAddress:
          typeof body.customer.shippingAddress === "string"
            ? body.customer.shippingAddress
            : body.customer.address || "",
      },
      items,
      subtotal,
      shipping,
      discount,
      appliedOfferCode: applicableOffer?.code || "",
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
    };

    const session = await mongoose.startSession();
    let order;
    let transactionUnsupported = false;

    try {
      await session.withTransaction(async () => {
        if (inventoryStatus !== "released") {
          await reserveOrderStock(allocations, warehouseName, session);

          if (inventoryStatus === "deducted") {
            await consumeOrderStock(allocations, warehouseName, session);
          }
        }

        const createdOrders = await Order.create([orderData], { session });
        order = createdOrders[0];
      });
    } catch (error) {
      if (!isTransactionUnsupportedError(error)) throw error;
      transactionUnsupported = true;
    } finally {
      await session.endSession();
    }

    if (transactionUnsupported) {
      let reservationCreated = false;
      let fallbackOrder: InstanceType<typeof Order> | undefined;
      let consumptions: StockConsumption[] = [];

      try {
        if (inventoryStatus !== "released") {
          await reserveOrderStock(allocations, warehouseName);
          reservationCreated = true;
        }

        fallbackOrder = await Order.create({
          ...orderData,
          inventoryStatus:
            inventoryStatus === "deducted" ? "reserved" : inventoryStatus,
        });

        if (inventoryStatus === "deducted") {
          consumptions = await consumeOrderStock(
            allocations,
            warehouseName
          );
          fallbackOrder.inventoryStatus = "deducted";
          await fallbackOrder.save();
        }

        order = fallbackOrder;
      } catch (error) {
        if (consumptions.length > 0) {
          await rollbackOrderStockConsumption(consumptions, true);
        }
        if (fallbackOrder) {
          await Order.deleteOne({ _id: fallbackOrder._id });
        }
        if (reservationCreated) {
          await releaseOrderStock(allocations, warehouseName);
        }
        throw error;
      }
    }

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

    if (error instanceof OrderStockError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 409 }
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
