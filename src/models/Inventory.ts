import { Schema, model, models } from "mongoose";

const InventorySchema = new Schema({
  sku: { type: String, required: true, uppercase: true, trim: true },
  warehouse: { type: String, required: true, default: "MAIN" },
  onHand: { type: Number, required: true, min: 0, default: 0 },
  reserved: { type: Number, required: true, min: 0, default: 0 },
  safetyStock: { type: Number, required: true, min: 0, default: 0 },
}, { timestamps: true });

InventorySchema.index({ sku: 1, warehouse: 1 }, { unique: true });
export default models.Inventory || model("Inventory", InventorySchema);
