
import mongoose, { Schema, model, models } from "mongoose";

const VariantSchema = new Schema(
  {
    name: { type: String, trim: true, required: true },
    sku: { type: String, trim: true, required: true },
    attributes: {
      type: Map,
      of: String,
      default: {},
    },
    price: { type: Number, min: 0, required: true },
    stock: { type: Number, min: 0, default: 0 },
  },
  { _id: true }
);

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },
    description: { type: String, default: "" },
    category: { type: String, required: true, trim: true },
    brand: { type: String, default: "" },

    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, default: "" },
        },
      ],
      default: [],
    },

    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0, default: 0 },
    costPrice: { type: Number, min: 0, default: 0 },

    stock: { type: Number, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 5 },

    variants: { type: [VariantSchema], default: [] },

    channels: {
      type: [String],
      enum: ["Website", "Amazon", "Flipkart", "Meesho"],
      default: ["Website"],
    },

    status: {
      type: String,
      enum: ["Active", "Low Stock", "Out of Stock", "Draft"],
      default: "Active",
    },

    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ProductSchema.index({
  name: "text",
  sku: "text",
  category: "text",
});

const Product =
  models.Product || model("Product", ProductSchema);

export default Product;
