import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Integration from "@/models/Integration";

export const runtime = "nodejs";

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
        { success: false, message: "Invalid integration ID" },
        { status: 400 }
      );
    }

    const integration = await Integration.findById(id);

    if (!integration) {
      return NextResponse.json(
        { success: false, message: "Integration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: integration });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch integration" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: Context
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid integration ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const allowedFields = [
      "accountName",
      "storeUrl",
      "sellerId",
      "syncEnabled",
      "status",
    ];

    const update: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        update[field] = body[field];
      }
    }

    const integration = await Integration.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!integration) {
      return NextResponse.json(
        { success: false, message: "Integration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Integration updated",
      data: integration,
    });
  } catch (error) {
    console.error("PATCH integration error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update integration" },
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
        { success: false, message: "Invalid integration ID" },
        { status: 400 }
      );
    }

    const integration = await Integration.findByIdAndDelete(id);

    if (!integration) {
      return NextResponse.json(
        { success: false, message: "Integration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Integration removed",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to delete integration" },
      { status: 500 }
    );
  }
}