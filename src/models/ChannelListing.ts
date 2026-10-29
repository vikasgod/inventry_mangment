import { Schema, model, models } from "mongoose";

const ChannelListingSchema = new Schema({
  sku: { type: String, required: true, uppercase: true, trim: true, index: true },
  channel: { type: String, enum: ["website", "amazon", "flipkart", "meesho"], required: true },
  externalSku: { type: String, required: true, trim: true },
  externalListingId: String,
  sellingPrice: { type: Number, min: 0, default: 0 },
  mrp: { type: Number, min: 0, default: 0 },
  publishedQuantity: { type: Number, min: 0, default: 0 },
  listingStatus: { type: String, enum: ["not_created", "pending", "active", "inactive", "rejected", "error"], default: "not_created" },
  syncStatus: { type: String, enum: ["pending", "syncing", "synced", "failed", "manual_required"], default: "pending" },
  lastSyncedAt: Date,
  lastError: String,
}, { timestamps: true });

ChannelListingSchema.index({ channel: 1, externalSku: 1 }, { unique: true });
ChannelListingSchema.index({ sku: 1, channel: 1 }, { unique: true });
export default models.ChannelListing || model("ChannelListing", ChannelListingSchema);
