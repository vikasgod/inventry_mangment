
import mongoose, { Schema, models, model } from "mongoose";

const OrderItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: false,
    },
    name: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    variant: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["Website", "Amazon", "Flipkart", "Meesho"],
      required: true,
      index: true,
    },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      address: { type: String, default: "" },
    },
    items: {
      type: [OrderItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
      ],
      default: "Pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      default: "Cash on Delivery (COD)",
    },
    paymentStatus: {
      type: String,
      default: "Pending Payment",
    },
    shippingMethod: {
      type: String,
      default: "Standard Delivery (3-5 days)",
    },
    trackingNumber: {
      type: String,
      default: "",
    },
    placedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    statusHistory: [
      {
        status: String,
        note: String,
        at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

const Order =
  models.Order || model("Order", OrderSchema);

export default Order;
