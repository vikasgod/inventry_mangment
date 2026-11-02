import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import mongoose from "mongoose";
import Order from "@/models/Order";
import connectDB from "@/lib/mongodb";
import {
  consumeOrderStock,
  isTransactionUnsupportedError,
  OrderStockError,
  releaseOrderStock,
  reserveOrderStock,
  rollbackOrderStockConsumption,
  type StockAllocation,
  type StockConsumption,
} from "@/lib/order-stock";

type Context = {
  params: Promise<{ id: string }>;
};

const validStatuses = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

export async function GET(
  _request: NextRequest,
  context: Context
) {
  const authorization = await authorizeRequest("orders");
  if (authorization) return authorization;

  try {
    await connectDB();

    const { id } = await context.params;

    const order = mongoose.isValidObjectId(id)
      ? await Order.findById(id).lean()
      : await Order.findOne({
          orderNumber: id,
        }).lean();

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order details:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: Context
) {
  const authorization = await authorizeRequest("orders");
  if (authorization) return authorization;

  let session: mongoose.ClientSession | undefined;

  try {
    await connectDB();

    const { id } = await context.params;
    const body = await request.json();

    const hasStatus = Object.hasOwn(body, "status");
    const hasTracking = Object.hasOwn(
      body,
      "trackingNumber"
    );
    const hasPayment = Object.hasOwn(
      body,
      "paymentStatus"
    );

    if (!hasStatus && !hasTracking && !hasPayment) {
      return NextResponse.json(
        { success: false, message: "No valid update provided" },
        { status: 400 }
      );
    }

    if (
      hasStatus &&
      !validStatuses.includes(body.status)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid status" },
        { status: 400 }
      );
    }

    if (hasTracking) {
      if (typeof body.trackingNumber !== "string") {
        return NextResponse.json(
          {
            success: false,
            message: "Tracking number must be text",
          },
          { status: 400 }
        );
      }
    }

    if (hasPayment) {
      // Payment status must be updated by a trusted,
      // authenticated server-side payment workflow.
      return NextResponse.json(
        {
          success: false,
          message:
            "Update payment status through your verified payment workflow",
        },
        { status: 403 }
      );
    }

    const transactionSession = await mongoose.startSession();
    session = transactionSession;
    let response: NextResponse | undefined;
    let transactionUnsupported = false;

    try {
      await transactionSession.withTransaction(async () => {
      const order = mongoose.isValidObjectId(id)
        ? await Order.findById(id).session(transactionSession)
        : await Order.findOne({ orderNumber: id }).session(transactionSession);

      if (!order) {
        response = NextResponse.json(
          { success: false, message: "Order not found" },
          { status: 404 }
        );
        return;
      }

      if (
        order.status === "Cancelled" &&
        hasStatus &&
        body.status !== "Cancelled"
      ) {
        response = NextResponse.json(
          {
            success: false,
            message: "Cancelled order cannot be reopened",
          },
          { status: 409 }
        );
        return;
      }

      const allocations: StockAllocation[] = order.stockAllocations.map(
        (allocation: {
          productId: mongoose.Types.ObjectId;
          quantity: number;
        }) => ({
          productId: allocation.productId,
          quantity: allocation.quantity,
        })
      );

      if (hasStatus && order.status !== body.status) {
        if (
          order.inventoryStatus === "deducted" &&
          (body.status === "Pending" || body.status === "Processing")
        ) {
          response = NextResponse.json(
            {
              success: false,
              message:
                "A shipped order cannot be moved back to an unshipped status.",
            },
            { status: 409 }
          );
          return;
        }

        if (
          body.status === "Cancelled" &&
          order.inventoryStatus === "deducted"
        ) {
          response = NextResponse.json(
            {
              success: false,
              message:
                "This order has shipped. Record any returned stock through inventory adjustment instead of cancelling it.",
            },
            { status: 409 }
          );
          return;
        }

        if (
          order.inventoryStatus === "reserved" &&
          (body.status === "Shipped" || body.status === "Delivered")
        ) {
          await consumeOrderStock(
            allocations,
            order.warehouse,
            transactionSession
          );
          order.inventoryStatus = "deducted";
        } else if (
          order.inventoryStatus === "reserved" &&
          body.status === "Cancelled"
        ) {
          await releaseOrderStock(
            allocations,
            order.warehouse,
            transactionSession
          );
          order.inventoryStatus = "released";
        }

        order.status = body.status;
        order.statusHistory.push({
          status: body.status,
          note:
            typeof body.note === "string"
              ? body.note.slice(0, 250)
              : `Status changed to ${body.status}`,
          at: new Date(),
        });
      }

      if (hasTracking) {
        order.trackingNumber =
          body.trackingNumber.trim().slice(0, 100);
      }

      await order.save({ session: transactionSession });
      response = NextResponse.json({
        success: true,
        message: "Order updated successfully",
        order,
      });
      });
    } catch (error) {
      if (!isTransactionUnsupportedError(error)) throw error;
      transactionUnsupported = true;
    }

    if (transactionUnsupported) {
      await transactionSession.endSession();
      session = undefined;

      const order = mongoose.isValidObjectId(id)
        ? await Order.findById(id)
        : await Order.findOne({ orderNumber: id });

      if (!order) {
        return NextResponse.json(
          { success: false, message: "Order not found" },
          { status: 404 }
        );
      }

      if (
        order.status === "Cancelled" &&
        hasStatus &&
        body.status !== "Cancelled"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Cancelled order cannot be reopened",
          },
          { status: 409 }
        );
      }

      const allocations: StockAllocation[] = order.stockAllocations.map(
        (allocation: {
          productId: mongoose.Types.ObjectId;
          quantity: number;
        }) => ({
          productId: allocation.productId,
          quantity: allocation.quantity,
        })
      );
      const previousStatus = order.status;
      const previousInventoryStatus = order.inventoryStatus;
      let consumptions: StockConsumption[] = [];
      let releasedReservation = false;

      if (hasStatus && order.status !== body.status) {
        if (
          order.inventoryStatus === "deducted" &&
          (body.status === "Pending" || body.status === "Processing")
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "A shipped order cannot be moved back to an unshipped status.",
            },
            { status: 409 }
          );
        }

        if (
          body.status === "Cancelled" &&
          order.inventoryStatus === "deducted"
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "This order has shipped. Record any returned stock through inventory adjustment instead of cancelling it.",
            },
            { status: 409 }
          );
        }

        if (
          order.inventoryStatus === "reserved" &&
          (body.status === "Shipped" || body.status === "Delivered")
        ) {
          consumptions = await consumeOrderStock(
            allocations,
            order.warehouse
          );
          order.inventoryStatus = "deducted";
        } else if (
          order.inventoryStatus === "reserved" &&
          body.status === "Cancelled"
        ) {
          await releaseOrderStock(allocations, order.warehouse);
          releasedReservation = true;
          order.inventoryStatus = "released";
        }

        order.status = body.status;
        order.statusHistory.push({
          status: body.status,
          note:
            typeof body.note === "string"
              ? body.note.slice(0, 250)
              : `Status changed to ${body.status}`,
          at: new Date(),
        });
      }

      if (hasTracking) {
        order.trackingNumber =
          body.trackingNumber.trim().slice(0, 100);
      }

      const updates: {
        $set: Record<string, unknown>;
        $push?: Record<string, unknown>;
      } = {
        $set: {
          status: order.status,
          inventoryStatus: order.inventoryStatus,
        },
      };

      if (hasTracking) {
        updates.$set.trackingNumber = order.trackingNumber;
      }

      if (hasStatus && order.status !== previousStatus) {
        updates.$push = {
          statusHistory: order.statusHistory[order.statusHistory.length - 1],
        };
      }

      const updateResult = await Order.updateOne(
        {
          _id: order._id,
          status: previousStatus,
          inventoryStatus: previousInventoryStatus,
        },
        updates
      );

      if (updateResult.matchedCount !== 1) {
        if (consumptions.length > 0) {
          await rollbackOrderStockConsumption(consumptions, true);
        }
        if (releasedReservation) {
          await reserveOrderStock(allocations, order.warehouse);
        }
        return NextResponse.json(
          {
            success: false,
            message: "Order changed concurrently. Refresh and retry.",
          },
          { status: 409 }
        );
      }

      const updatedOrder = await Order.findById(order._id);
      return NextResponse.json({
        success: true,
        message: "Order updated successfully",
        order: updatedOrder,
      });
    }

    if (response) return response;

  } catch (error) {
    console.error("Update order:", error);

    if (error instanceof OrderStockError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update order" },
      { status: 500 }
    );
  } finally {
    await session?.endSession();
  }
}