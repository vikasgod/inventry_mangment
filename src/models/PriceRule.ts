import { Schema, model, models } from "mongoose";

const PriceRuleSchema = new Schema({
  sku: { type: String, required: true, uppercase: true, trim: true },
  channel: { type: String, enum: ["website", "amazon", "flipkart", "meesho"], required: true },
  basePrice: { type: Number, required: true, min: 0 },
  discountPercent: { type: Number, min: 0, max: 100, default: 0 },
  fixedDiscount: { type: Number, min: 0, default: 0 },
  minSellingPrice: { type: Number, min: 0, required: true },
  startsAt: Date,
  endsAt: Date,
  enabled: { type: Boolean, default: true },
  desiredPrice: { type: Number, min: 0 },
}, { timestamps: true });

PriceRuleSchema.index({ sku: 1, channel: 1 }, { unique: true });
export default models.PriceRule || model("PriceRule", PriceRuleSchema);
