import { Schema, model, models } from "mongoose";

const ProductSchema = new Schema({
  sku: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: "" },
  category: { type: String, default: "" },
  brand: { type: String, default: "" },
  images: { type: [String], default: [] },
  attributes: { type: Schema.Types.Mixed, default: {} },
  mrp: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "INR" },
  gstRate: { type: Number, default: 0, min: 0, max: 100 },
  status: { type: String, enum: ["draft", "active", "archived"], default: "draft" },
}, { timestamps: true });

export default models.Product || model("Product", ProductSchema);
