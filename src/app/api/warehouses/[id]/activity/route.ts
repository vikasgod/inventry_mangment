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

    const integration = await Integration.findById(id).select("activity");

    if (!integration) {
      return NextResponse.json(
        { success: false, message: "Integration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: integration.activity || [],
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const message =
      "Sync requested. External provider connector is not configured yet.";

    integration.lastActivity = message;
    integration.activity.push({
      message,
      type: "Warning",
      createdAt: new Date(),
    });

    await integration.save();

    return NextResponse.json({
      success: true,
      message,
      data: integration,
    });
  } catch (error) {
    console.error("Integration activity error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create activity" },
      { status: 500 }
    );
  }
}