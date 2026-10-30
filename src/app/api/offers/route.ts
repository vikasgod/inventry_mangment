import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Offer from "@/models/Offer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStatus(startDate: Date, endDate: Date) {
  const now = new Date();

  if (endDate < now) return "EXPIRED";
  if (startDate > now) return "SCHEDULED";
  return "ACTIVE";
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 10)
    );

    const q = searchParams.get("q")?.trim() || "";
    const channel = searchParams.get("channel") || "";
    const status = searchParams.get("status") || "";

    const filter: any = {};

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { code: { $regex: q, $options: "i" } },
      ];
    }

    if (channel && channel !== "All Channels") {
      filter.channel = channel;
    }

    const now = new Date();

    if (status === "ACTIVE") {
      filter.startDate = { $lte: now };
      filter.endDate = { $gte: now };
    } else if (status === "SCHEDULED") {
      filter.startDate = { $gt: now };
    } else if (status === "EXPIRED") {
      filter.endDate = { $lt: now };
    }

    const total = await Offer.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const offers = await Offer.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const data = offers.map((offer: any) => {
      let offerStatus = "ACTIVE";

      if (new Date(offer.endDate) < now) {
        offerStatus = "EXPIRED";
      } else if (new Date(offer.startDate) > now) {
        offerStatus = "SCHEDULED";
      }

      return {
        ...offer,
        _id: String(offer._id),
        startDate: new Date(offer.startDate).toISOString().slice(0, 10),
        endDate: new Date(offer.endDate).toISOString().slice(0, 10),
        status: offerStatus,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Offers GET error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch offers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const {
      name,
      code = "",
      type,
      value,
      startDate,
      endDate,
      channel = "All Channels",
      products = "All Products",
    } = body;

    if (
      !name?.trim() ||
      !["Percentage", "Flat"].includes(type) ||
      !Number.isFinite(Number(value)) ||
      Number(value) < 1 ||
      !startDate ||
      !endDate
    ) {
      return NextResponse.json(
        { success: false, message: "Please provide valid offer details" },
        { status: 400 }
      );
    }

    if (type === "Percentage" && Number(value) > 100) {
      return NextResponse.json(
        { success: false, message: "Percentage discount cannot exceed 100" },
        { status: 400 }
      );
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59.999`);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end < start
    ) {
      return NextResponse.json(
        { success: false, message: "Please select a valid date range" },
        { status: 400 }
      );
    }

    const validChannels = [
      "All Channels", "Website", "Amazon", "Flipkart", "Meesho",
    ];

    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        { success: false, message: "Invalid channel" },
        { status: 400 }
      );
    }

    const offer = await Offer.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      type,
      value: Number(value),
      startDate: start,
      endDate: end,
      channel,
      products,
      status: getStatus(start, end),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Offer created successfully",
        data: offer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Offers POST error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create offer" },
      { status: 500 }
    );
  }
}