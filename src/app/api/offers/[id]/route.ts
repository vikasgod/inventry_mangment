import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Offer from "@/models/Offer";

type Context = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  _request: NextRequest,
  context: Context
) {
  try {
    await connectDB();

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid offer ID" },
        { status: 400 }
      );
    }

    const offer = await Offer.findByIdAndDelete(id);

    if (!offer) {
      return NextResponse.json(
        { success: false, message: "Offer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    console.error("Offer DELETE error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete offer" },
      { status: 500 }
    );
  }
}