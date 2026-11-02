import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import ChannelListing from "@/models/ChannelListing";

export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeRequest("listings");
  if (authorization) return authorization;

  try {
    await connectDB();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid listing ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const allowed: any = {};

    if (body.channel !== undefined) {
      if (!["WEBSITE", "AMAZON", "FLIPKART", "MEESHO"].includes(body.channel)) {
        return NextResponse.json(
          { success: false, message: "Invalid channel" },
          { status: 400 }
        );
      }
      allowed.channel = body.channel;
    }

    if (body.sellingPrice !== undefined) {
      const price = Number(body.sellingPrice);
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json(
          { success: false, message: "Invalid selling price" },
          { status: 400 }
        );
      }
      allowed.sellingPrice = price;
    }

    if (body.stock !== undefined) {
      const stock = Number(body.stock);
      if (!Number.isInteger(stock) || stock < 0) {
        return NextResponse.json(
          { success: false, message: "Invalid stock" },
          { status: 400 }
        );
      }
      allowed.stock = stock;
    }

    if (body.listingTitle !== undefined) {
      allowed.listingTitle = body.listingTitle;
    }

    if (body.description !== undefined) {
      allowed.description = body.description;
    }

    if (body.image !== undefined) {
      if (
        typeof body.image !== "string" ||
        (body.image && !body.image.startsWith("https://"))
      ) {
        return NextResponse.json(
          { success: false, message: "Cover image must be a valid HTTPS URL." },
          { status: 400 }
        );
      }
      allowed.image = body.image;
    }

    if (body.images !== undefined) {
      if (
        !Array.isArray(body.images) ||
        body.images.some(
          (url: unknown) =>
            typeof url !== "string" || !url.startsWith("https://")
        )
      ) {
        return NextResponse.json(
          { success: false, message: "Listing images must be valid HTTPS URLs." },
          { status: 400 }
        );
      }
      allowed.images =
        body.image && !body.images.includes(body.image)
          ? [body.image, ...body.images]
          : body.images;
    }

    const listing = await ChannelListing.findByIdAndUpdate(
      id,
      { $set: allowed },
      { new: true, runValidators: true }
    );

    if (!listing) {
      return NextResponse.json(
        { success: false, message: "Listing not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Listing updated successfully",
      data: listing,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeRequest("listings");
  if (authorization) return authorization;

  try {
    await connectDB();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid listing ID" },
        { status: 400 }
      );
    }

    const listing = await ChannelListing.findByIdAndDelete(id);

    if (!listing) {
      return NextResponse.json(
        { success: false, message: "Listing not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Delete failed" },
      { status: 500 }
    );
  }
}