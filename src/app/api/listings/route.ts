import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import ChannelListing from "@/models/ChannelListing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validChannels = ["WEBSITE", "AMAZON", "FLIPKART", "MEESHO"];

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const params = request.nextUrl.searchParams;

    const q = params.get("q")?.trim() || "";
    const channel = params.get("channel") || "ALL";
    const status = params.get("status") || "ALL";

    const page = Math.max(1, Number(params.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") || 10)));

    const filter: any = {};

    if (q) {
      filter.$or = [
        { productName: { $regex: q, $options: "i" } },
        { sku: { $regex: q, $options: "i" } },
        { listingId: { $regex: q, $options: "i" } },
        { listingTitle: { $regex: q, $options: "i" } },
      ];
    }

    if (channel !== "ALL") filter.channel = channel;
    if (status !== "ALL") filter.status = status;

    const [data, total, active, pending, failed, inactive] =
      await Promise.all([
        ChannelListing.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),

        ChannelListing.countDocuments(filter),
        ChannelListing.countDocuments({ status: "ACTIVE" }),
        ChannelListing.countDocuments({ status: "PENDING" }),
        ChannelListing.countDocuments({ status: "FAILED" }),
        ChannelListing.countDocuments({ status: "INACTIVE" }),
      ]);

    return NextResponse.json({
      success: true,
      data,
      stats: {
        total: await ChannelListing.countDocuments(),
        active,
        pending,
        failed,
        inactive,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: any) {
    console.error("Marketplace listings GET:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Failed to load listings" },
      { status: 500 }
    );
  }
}

// Create listing from an existing Product
// export async function POST(request: NextRequest) {
//   try {
//     await connectDB();

//     const body = await request.json();

//     const {
//       productId,
//       variantId,
//       channel,
//       sellingPrice,
//       stock,
//       listingTitle,
//       description,
//     } = body;

//     if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
//       return NextResponse.json(
//         { success: false, message: "Please select a valid product" },
//         { status: 400 }
//       );
//     }

//     if (!validChannels.includes(channel)) {
//       return NextResponse.json(
//         { success: false, message: "Invalid marketplace channel" },
//         { status: 400 }
//       );
//     }

//     if (!Number.isFinite(Number(sellingPrice)) || Number(sellingPrice) < 0) {
//       return NextResponse.json(
//         { success: false, message: "Enter a valid selling price" },
//         { status: 400 }
//       );
//     }

//     if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
//       return NextResponse.json(
//         { success: false, message: "Enter a valid stock quantity" },
//         { status: 400 }
//       );
//     }

//     const product: any = await Product.findOne({
//       _id: productId,
//       isArchived: false,
//     }).lean();

//     if (!product) {
//       return NextResponse.json(
//         { success: false, message: "Product not found" },
//         { status: 404 }
//       );
//     }

//     let variant: any = null;

//     if (variantId) {
//       variant = product.variants?.find(
//         (v: any) => String(v._id) === String(variantId)
//       );

//       if (!variant) {
//         return NextResponse.json(
//           { success: false, message: "Selected variant not found" },
//           { status: 404 }
//         );
//       }
//     }

//     const duplicate = await ChannelListing.findOne({
//       productId: product._id,
//       variantId: variant?._id || null,
//       channel,
//     });

//     if (duplicate) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: `This product is already listed on ${channel}`,
//         },
//         { status: 409 }
//       );
//     }

//     const listing = await ChannelListing.create({
//       productId: product._id,
//       variantId: variant?._id || null,
//       productName: product.name,
//       sku: variant?.sku || product.sku,
//       image: product.images?.[0]?.url || "",
//       category: product.category || "",
//       channel,
//       listingTitle: listingTitle || product.name,
//       description: description || product.description || "",
//       sellingPrice: Number(sellingPrice),
//       stock: Number(stock),
//       listingId: "",
//       status: "PENDING",
//       syncState: "NOT_SYNCED",
//       lastSyncMessage: "Saved in CRM. Seller API connection is pending.",
//     });

//     return NextResponse.json(
//       {
//         success: true,
//         message: "Listing created successfully",
//         data: listing,
//       },
//       { status: 201 }
//     );
//   } catch (error: any) {
//     console.error("Marketplace listing POST:", error);

//     if (error.code === 11000) {
//       return NextResponse.json(
//         {
//           success: false,
//           message: "This product is already listed on this channel",
//         },
//         { status: 409 }
//       );
//     }

//     return NextResponse.json(
//       { success: false, message: error.message || "Failed to create listing" },
//       { status: 500 }
//     );
//   }
// }

type ProductVariant = {
  _id: string;
  name?: string;
  sku?: string;
  price?: number;
  stock?: number;
  attributes?: Record<string, string>;
};

type ProductData = {
  _id: string;
  name: string;
  sku: string;
  category?: string;
  images?: {
    url: string;
    publicId?: string;
  }[];
  variants?: ProductVariant[];
  description?: string
};

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const {
      productId,
      variantId,
      channel,
      sellingPrice,
      stock,
      listingTitle,
      description,
    } = body;

    if (!productId || !channel) {
      return NextResponse.json(
        {
          success: false,
          message: "Product and marketplace are required.",
        },
        { status: 400 }
      );
    }

    if (
      !["AMAZON", "FLIPKART", "MEESHO", "WEBSITE"].includes(channel)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid marketplace channel.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(Number(sellingPrice)) ||
      Number(sellingPrice) < 0 ||
      !Number.isFinite(Number(stock)) ||
      Number(stock) < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid selling price and stock are required.",
        },
        { status: 400 }
      );
    }

    const product = (await Product.findOne({
      _id: productId,
      isArchived: false,
    }).lean()) as ProductData | null;

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    const variant = variantId
      ? product.variants?.find(
        (v) => String(v._id) === String(variantId)
      )
      : null;

    if (variantId && !variant) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected product variant not found.",
        },
        { status: 404 }
      );
    }

    const existingListing = await ChannelListing.findOne({
      productId: product._id,
      variantId: variant?._id || null,
      channel,
    });

    if (existingListing) {
      return NextResponse.json(
        {
          success: false,
          message: "This product is already listed on this marketplace.",
        },
        { status: 409 }
      );
    }

    const listing = await ChannelListing.create({
      productId: product._id,
      variantId: variant?._id || null,

      productName: product.name,
      sku: variant?.sku || product.sku,
      image: product.images?.[0]?.url || "",
      category: product.category || "",

      channel,

      listingTitle: listingTitle || product.name,
      description: description || product.description || "",

      sellingPrice: Number(sellingPrice),
      stock: Number(stock),

      status: "PENDING",
      syncState: "NOT_SYNCED",

      lastSyncMessage:
        "Saved in CRM. Marketplace publishing is pending seller API connection.",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Listing saved successfully in your CRM.",
        data: listing,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create listing error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.code === 11000
            ? "This product is already listed on this marketplace."
            : error.message || "Failed to create listing.",
      },
      { status: 500 }
    );
  }
}
