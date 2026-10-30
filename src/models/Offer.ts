import { Schema, models, model } from "mongoose";

const OfferSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, default: "", trim: true, uppercase: true },
    type: {
      type: String,
      enum: ["Percentage", "Flat"],
      required: true,
    },
    value: { type: Number, required: true, min: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    channel: {
      type: String,
      enum: ["All Channels", "Website", "Amazon", "Flipkart", "Meesho"],
      default: "All Channels",
    },
    products: { type: String, default: "All Products" },
    status: {
      type: String,
      enum: ["ACTIVE", "SCHEDULED", "EXPIRED"],
      default: "SCHEDULED",
    },
  },
  { timestamps: true }
);

export default models.Offer || model("Offer", OfferSchema);