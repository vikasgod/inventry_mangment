export type Channel = "website" | "amazon" | "flipkart" | "meesho";
export type PublishProductInput = {
  sku: string; name: string; description: string; images: string[];
  mrp: number; sellingPrice: number; quantity: number;
  attributes: Record<string, unknown>;
};
export type AdapterResult = { status: "accepted" | "pending" | "failed" | "manual_required"; externalListingId?: string; message?: string };
export interface ChannelAdapter {
  publishProduct(input: PublishProductInput): Promise<AdapterResult>;
  updateInventory(sku: string, quantity: number): Promise<void>;
  updatePrice(sku: string, mrp: number, sellingPrice: number): Promise<void>;
}
