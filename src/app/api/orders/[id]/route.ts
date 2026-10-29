import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Order from "@/models/Order";
import connectDB from "@/lib/mongodb";

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
  try {
    await connectDB();

    const { id } = await context.params;
    const body = await request.json();

    const order = mongoose.isValidObjectId(id)
      ? await Order.findById(id)
      : await Order.findOne({ orderNumber: id });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

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

    if (
      hasStatus &&
      order.status !== body.status
    ) {
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
      if (typeof body.trackingNumber !== "string") {
        return NextResponse.json(
          {
            success: false,
            message: "Tracking number must be text",
          },
          { status: 400 }
        );
      }

      order.trackingNumber =
        body.trackingNumber.trim().slice(0, 100);
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

    await order.save();

    return NextResponse.json({
      success: true,
      message: "Order updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update order:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update order" },
      { status: 500 }
    );
  }
}