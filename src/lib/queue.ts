import { Queue } from "bullmq";
import IORedis from "ioredis";
import dbConnect from "@/lib/mongodb";
import SyncJob from "@/models/SyncJob";

export type Channel = "website" | "amazon" | "flipkart" | "meesho";
export type SyncJobInput = {
  type: "publish_product" | "update_inventory" | "update_price";
  channel: Channel;
  sku: string;
  payload?: Record<string, unknown>;
};

let connection: IORedis | null = null;
let queue: Queue | null = null;

function getQueue() {
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is not configured");
  if (!connection) connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  if (!queue) queue = new Queue("marketplace-sync", { connection });
  return queue;
}

export async function enqueueSyncJob(input: SyncJobInput) {
  await dbConnect();
  const job = await SyncJob.create({
    ...input,
    status: "queued",
    attempts: 0,
    payload: input.payload ?? {},
  });
  try {
    const q = getQueue();
    await q.add(input.type, { syncJobId: String(job._id) }, {
      jobId: String(job._id),
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 500,
      removeOnFail: 1000,
    });
    return { id: String(job._id), queued: true };
  } catch (error) {
    job.status = "queue_error";
    job.lastError = error instanceof Error ? error.message : "Unable to enqueue job";
    await job.save();
    throw error;
  }
}
