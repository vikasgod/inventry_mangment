import { Schema, model, models } from "mongoose";

const InventoryMovementSchema = new Schema({
  sku: { type: String, required: true, index: true },
  warehouse: { type: String, required: true, default: "MAIN" },
  type: { type: String, enum: ["stock_in", "stock_out", "adjustment", "reservation", "release", "return"], required: true },
  quantityDelta: { type: Number, required: true },
  reason: { type: String, required: true },
  referenceId: String,
  createdBy: { type: String, default: "system" },
}, { timestamps: true });

export default models.InventoryMovement || model("InventoryMovement", InventoryMovementSchema);
