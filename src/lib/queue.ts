import dbConnect from "@/lib/mongodb";
import SyncJob from "@/models/SyncJob";

export type Channel = "website" | "amazon" | "flipkart" | "meesho";
export type SyncJobInput = {
  type: "publish_product" | "update_inventory" | "update_price";
  channel: Channel;
  sku: string;
  payload?: Record<string, unknown>;
};

export async function enqueueSyncJob(input: SyncJobInput) {
  await dbConnect();
  const job = await SyncJob.create({
    ...input,
    status: "queued",
    attempts: 0,
    payload: input.payload ?? {},
  });
  return { id: String(job._id), queued: true };
}
