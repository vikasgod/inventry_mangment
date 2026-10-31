import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Integration from "@/models/Integration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const providers = [
  { provider: "Amazon", category: "Marketplace" },
  { provider: "Flipkart", category: "Marketplace" },
  { provider: "Meesho", category: "Marketplace" },
  { provider: "Website", category: "Website" },
  { provider: "Shiprocket", category: "Shipping" },
  { provider: "Razorpay", category: "Payment" },
  { provider: "WhatsApp", category: "Communication" },
];

export async function GET() {
  try {
    await connectDB();

    // Ensure all available integrations appear in the list.
    await Promise.all(
      providers.map((item) =>
        Integration.updateOne(
          { provider: item.provider },
          {
            $setOnInsert: {
              ...item,
              status: "Not Connected",
              syncEnabled: false,
            },
          },
          { upsert: true }
        )
      )
    );

    const integrations = await Integration.find().sort({ createdAt: 1 });

    return NextResponse.json({
      success: true,
      data: integrations,
    });
  } catch (error) {
    console.error("GET integrations error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { provider, accountName, storeUrl, sellerId, syncEnabled } = body;

    if (!provider) {
      return NextResponse.json(
        { success: false, message: "Provider is required" },
        { status: 400 }
      );
    }

    const integration = await Integration.findOne({ provider });

    if (!integration) {
      return NextResponse.json(
        { success: false, message: "Invalid integration provider" },
        { status: 404 }
      );
    }

    integration.accountName = accountName || "";
    integration.storeUrl = storeUrl || "";
    integration.sellerId = sellerId || "";
    integration.syncEnabled = Boolean(syncEnabled);
    integration.status = "Configured";
    integration.lastActivity = "Configuration saved";

    await integration.save();

    return NextResponse.json({
      success: true,
      message: "Integration configuration saved",
      data: integration,
    });
  } catch (error) {
    console.error("POST integration error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save integration" },
      { status: 500 }
    );
  }
}