
import mongoose, { Schema, models, model } from "mongoose";

const InventorySchema = new Schema(
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
      trim: true,
    },
    onHand: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reserved: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    safetyStock: {
      type: Number,
      required: true,
      default: 10,
      min: 0,
    },
  },
  { timestamps: true }
);

InventorySchema.index(
  { productId: 1, warehouse: 1 },
  { unique: true }
);

const Inventory =
  models.Inventory || model("Inventory", InventorySchema);

export default Inventory;
