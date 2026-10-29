import { Schema, model, models } from "mongoose";

const OrderSchema = new Schema({
  channel: { type: String, enum: ["website", "amazon", "flipkart", "meesho"], required: true },
  externalOrderId: { type: String, required: true },
  status: { type: String, enum: ["new", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"], default: "new" },
  currency: { type: String, default: "INR" },
  total: { type: Number, min: 0, default: 0 },
  items: [{
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  }],
  orderedAt: Date,
  rawStatus: String,
}, { timestamps: true });

OrderSchema.index({ channel: 1, externalOrderId: 1 }, { unique: true });
export default models.Order || model("Order", OrderSchema);
