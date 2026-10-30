import { Schema, models, model } from "mongoose";

const ChannelListingSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    image: { type: String, default: "" },
    category: { type: String, default: "" },

    channel: {
      type: String,
      enum: ["WEBSITE", "AMAZON", "FLIPKART", "MEESHO"],
      required: true,
    },

    // Future seller API fields
    sellerAccountId: {
      type: Schema.Types.ObjectId,
      ref: "SellerAccount",
      default: null,
    },
    externalListingId: { type: String, default: "" },

    listingId: { type: String, default: "" },
    listingTitle: { type: String, default: "" },
    description: { type: String, default: "" },

    sellingPrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ["ACTIVE", "PENDING", "FAILED", "INACTIVE"],
      default: "PENDING",
    },

    syncState: {
      type: String,
      enum: ["NOT_SYNCED", "PENDING", "SYNCED", "FAILED"],
      default: "NOT_SYNCED",
    },

    lastSyncedAt: { type: Date, default: null },
    lastSyncMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

// One product/variant can have one listing per channel.
ChannelListingSchema.index(
  { productId: 1, variantId: 1, channel: 1 },
  { unique: true }
);

const ChannelListing =
  models.ChannelListing ||
  model("ChannelListing", ChannelListingSchema);

export default ChannelListing;