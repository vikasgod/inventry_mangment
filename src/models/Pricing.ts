import { Schema, models, model } from "mongoose";

const PricingSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
    },
    mrp: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    prices: {
      Website: { type: Number, default: 0, min: 0 },
      Amazon: { type: Number, default: 0, min: 0 },
      Flipkart: { type: Number, default: 0, min: 0 },
      Meesho: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true }
);

export default models.Pricing || model("Pricing", PricingSchema);