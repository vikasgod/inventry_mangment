import mongoose from "mongoose";
import dbConnect from "../src/lib/mongodb";
import SyncJob from "../src/models/SyncJob";
import Product from "../src/models/Product";
import Inventory from "../src/models/Inventory";
import ChannelListing from "../src/models/ChannelListing";
import { getAdapter } from "../src/modules/marketplace/registry";
import type { Channel, PublishProductInput } from "../src/modules/marketplace/types";

const POLL_INTERVAL_MS = 1000;
const MAX_ATTEMPTS = 5;
const CONCURRENCY = 5;
let shuttingDown = false;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function processNextJob() {
  await dbConnect();
  const now = new Date();
  const syncJob = await SyncJob.findOneAndUpdate({
    status: { $in: ["queued", "retrying"] },
    $or: [
      { nextAttemptAt: { $exists: false } },
      { nextAttemptAt: { $lte: now } },
    ],
  }, {
    $set: { status: "processing" },
    $inc: { attempts: 1 },
    $unset: { nextAttemptAt: 1 },
  }, { sort: { createdAt: 1 }, new: true });
  if (!syncJob) return false;

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
    if (syncJob.status === "manual_required") return true;
    if (syncJob.status === "failed") throw new Error(syncJob.lastError || "Adapter returned failed");
    console.log(`Sync job ${syncJob.id} completed`);
  } catch (error) {
    syncJob.lastError = error instanceof Error ? error.message : "Unknown sync error";
    if (syncJob.attempts < MAX_ATTEMPTS) {
      syncJob.status = "retrying";
      syncJob.nextAttemptAt = new Date(Date.now() + Math.min(2000 * 2 ** (syncJob.attempts - 1), 60000));
    } else {
      syncJob.status = "failed";
      syncJob.completedAt = new Date();
    }
    await syncJob.save();
    console.error(`Sync job ${syncJob.id} failed:`, syncJob.lastError);
  }
  return true;
}

async function runWorker() {
  while (!shuttingDown) {
    try {
      const processed = await processNextJob();
      if (!processed) await wait(POLL_INTERVAL_MS);
    } catch (error) {
      console.error("Sync worker polling failed:", error instanceof Error ? error.message : error);
      await wait(POLL_INTERVAL_MS);
    }
  }
}

const workers = Array.from({ length: CONCURRENCY }, () => runWorker());

async function shutdown() {
  shuttingDown = true;
  await Promise.all(workers);
  await mongoose.disconnect();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
