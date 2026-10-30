import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChannelListing from "@/models/ChannelListing";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  context: Context
) {
  try {
    await connectDB();

    const { id } = await context.params;

    const listing = await ChannelListing.findById(id);

    if (!listing) {
      return NextResponse.json(
        { success: false, message: "Listing not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Listing is saved in CRM. Marketplace seller API integration is pending.",
        data: listing,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Sync error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process sync request.",
      },
      { status: 500 }
    );
  }
}