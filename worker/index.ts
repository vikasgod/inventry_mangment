import { Worker } from "bullmq";
import IORedis from "ioredis";
import mongoose from "mongoose";
import dbConnect from "../src/lib/mongodb";
import SyncJob from "../src/models/SyncJob";
import Product from "../src/models/Product";
import Inventory from "../src/models/Inventory";
import ChannelListing from "../src/models/ChannelListing";
import { getAdapter } from "../src/modules/marketplace/registry";
import type { Channel, PublishProductInput } from "../src/modules/marketplace/types";

if (!process.env.REDIS_URL) throw new Error("REDIS_URL is missing");
const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker("marketplace-sync", async (job) => {
  await dbConnect();
  const syncJob = await SyncJob.findById(job.data.syncJobId);
  if (!syncJob) throw new Error("Sync job record not found");
  syncJob.status = "processing";
  syncJob.attempts += 1;
  await syncJob.save();

  try {
    const channel = syncJob.channel as Channel;
    const adapter = getAdapter(channel);
    const product: any = await Product.findOne({ sku: syncJob.sku }).lean();
    if (!product) throw new Error(`Product ${syncJob.sku} not found`);
    const inventory: any = await Inventory.findOne({ sku: syncJob.sku, warehouse: "MAIN" }).lean();
    const quantity = inventory ? Math.max(0, inventory.onHand - inventory.reserved - inventory.safetyStock) : 0;
    const listing: any = await ChannelListing.findOne({ sku: syncJob.sku, channel }).lean();
    const input: PublishProductInput = {
      sku: product.sku, name: product.name, description: product.description ?? "",
      images: product.images ?? [], mrp: product.mrp,
      sellingPrice: listing?.sellingPrice ?? product.mrp, quantity,
      attributes: product.attributes ?? {},
    };

    if (syncJob.type === "publish_product") {
      const result = await adapter.publishProduct(input);
      syncJob.result = result;
      if (result.status === "manual_required") {
        syncJob.status = "manual_required";
        syncJob.lastError = result.message;
        if (listing) {
          listing.syncStatus = "manual_required";
          listing.lastError = result.message;
          await listing.save();
        }
      } else {
        syncJob.status = result.status === "failed" ? "failed" : "succeeded";
        if (listing) {
          listing.syncStatus = result.status === "failed" ? "failed" : "synced";
          listing.listingStatus = result.status === "accepted" ? "pending" : listing.listingStatus;
          listing.externalListingId = result.externalListingId ?? listing.externalListingId;
          listing.publishedQuantity = quantity;
          listing.lastSyncedAt = new Date();
          listing.lastError = result.message;
          await listing.save();
        }
      }
    } else if (syncJob.type === "update_inventory") {
      await adapter.updateInventory(syncJob.sku, quantity);
      syncJob.status = "succeeded";
      if (listing) { listing.publishedQuantity = quantity; listing.syncStatus = "synced"; listing.lastSyncedAt = new Date(); await listing.save(); }
    } else if (syncJob.type === "update_price") {
      const price = Number(syncJob.payload?.desiredPrice);
      if (!Number.isFinite(price) || price < 0) throw new Error("Invalid desired price in job payload");
      await adapter.updatePrice(syncJob.sku, product.mrp, price);
      syncJob.status = "succeeded";
      if (listing) { listing.sellingPrice = price; listing.syncStatus = "synced"; listing.lastSyncedAt = new Date(); await listing.save(); }
    }
    syncJob.completedAt = new Date();
    await syncJob.save();
    if (syncJob.status === "manual_required") return { status: "manual_required" };
    if (syncJob.status === "failed") throw new Error(syncJob.lastError || "Adapter returned failed");
    return { status: syncJob.status };
  } catch (error) {
    syncJob.status = "failed";
    syncJob.lastError = error instanceof Error ? error.message : "Unknown sync error";
    await syncJob.save();
    throw error;
  }
}, { connection, concurrency: 5 });

worker.on("completed", job => console.log(`Sync job ${job.id} completed`));
worker.on("failed", (job, err) => console.error(`Sync job ${job?.id} failed:`, err.message));
process.on("SIGINT", async () => { await worker.close(); await connection.quit(); await mongoose.disconnect(); process.exit(0); });
