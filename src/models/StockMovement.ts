
import mongoose, { Schema, models, model } from "mongoose";

const StockMovementSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    warehouse: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["add", "remove", "set"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

StockMovementSchema.index({ createdAt: -1 });

const StockMovement =
  models.StockMovement ||
  model("StockMovement", StockMovementSchema);

export default StockMovement;
