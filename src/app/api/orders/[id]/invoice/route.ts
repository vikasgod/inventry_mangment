import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Warehouse from "@/models/Warehouse";

type Context = { params: Promise<{ id: string }> };

type InvoiceItem = {
  productId?: mongoose.Types.ObjectId | null;
  sku: string;
  cgstRate?: number;
  sgstRate?: number;
  [key: string]: unknown;
};

type InvoiceOrder = {
  items: InvoiceItem[];
  warehouse: string;
  [key: string]: unknown;
};

export async function GET(_request: NextRequest, context: Context) {
  const authorization = await authorizeRequest("orders");
  if (authorization) return authorization;

  try {
    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: "Invalid order ID." }, { status: 400 });
    }

    await connectDB();
    const order = await Order.findById(id).lean<InvoiceOrder | null>();
    if (!order) {
      return NextResponse.json({ message: "Order not found." }, { status: 404 });
    }

    const productIds = order.items
      .map((item) => item.productId)
      .filter((productId): productId is mongoose.Types.ObjectId =>
        Boolean(productId)
      );
    const productSkus = order.items.map((item) => item.sku).filter(Boolean);
    const productConditions: Record<string, unknown>[] = [];
    if (productIds.length) productConditions.push({ _id: { $in: productIds } });
    if (productSkus.length) productConditions.push({ sku: { $in: productSkus } });

    const products = productConditions.length
      ? await Product.find({ $or: productConditions })
          .select("sku cgstRate sgstRate")
          .lean<
            {
              _id: mongoose.Types.ObjectId;
              sku: string;
              cgstRate?: number;
              sgstRate?: number;
            }[]
          >()
      : [];
    const productsById = new Map(products.map((product) => [String(product._id), product]));
    const productsBySku = new Map(products.map((product) => [product.sku, product]));

    const warehouse = order.warehouse
      ? await Warehouse.findOne({ name: order.warehouse })
          .select("name address city state pincode")
          .lean<{
            name: string;
            address: string;
            city: string;
            state: string;
            pincode: string;
          } | null>()
      : null;

    const invoiceOrder = {
      ...order,
      items: order.items.map((item) => {
        const product =
          (item.productId && productsById.get(String(item.productId))) ||
          productsBySku.get(item.sku);
        return {
          ...item,
          cgstRate: Number(item.cgstRate ?? product?.cgstRate ?? 0),
          sgstRate: Number(item.sgstRate ?? product?.sgstRate ?? 0),
        };
      }),
    };

    return NextResponse.json({
      order: invoiceOrder,
      seller: {
        companyName: process.env.INVOICE_COMPANY_NAME || "",
        gstin: process.env.INVOICE_GSTIN || "",
        panNumber: process.env.INVOICE_PAN_NUMBER || process.env.PAN_NUMBER || "",
        shippingFromAddress: process.env.INVOICE_SHIPPING_FROM_ADDRESS || "",
        warehouse: warehouse
          ? {
              name: warehouse.name,
              address: [warehouse.address, warehouse.city, warehouse.state, warehouse.pincode]
                .filter(Boolean)
                .join(", "),
            }
          : null,
      },
    });
  } catch (error) {
    console.error("GET order invoice data failed:", error);
    return NextResponse.json(
      { message: "Unable to prepare invoice." },
      { status: 500 }
    );
  }
}
