import { Schema, model, models } from "mongoose";

const SyncJobSchema = new Schema({
  type: { type: String, enum: ["publish_product", "update_inventory", "update_price"], required: true },
  channel: { type: String, enum: ["website", "amazon", "flipkart", "meesho"], required: true },
  sku: { type: String, required: true, index: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["queued", "processing", "succeeded", "retrying", "failed", "queue_error", "manual_required"], default: "queued", index: true },
  attempts: { type: Number, default: 0 },
  lastError: String,
  result: { type: Schema.Types.Mixed },
  completedAt: Date,
}, { timestamps: true });

export default models.SyncJob || model("SyncJob", SyncJobSchema);
