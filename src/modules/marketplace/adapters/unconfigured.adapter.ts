import type { ChannelAdapter, PublishProductInput, AdapterResult } from "../types";

export function unconfiguredAdapter(channel: string): ChannelAdapter {
  return {
    async publishProduct(_input: PublishProductInput): Promise<AdapterResult> {
      return { status: "manual_required", message: `${channel} API is not configured. Add approved credentials and implement the official API mapper.` };
    },
    async updateInventory(_sku: string, _quantity: number) {
      throw new Error(`${channel} inventory API is not configured`);
    },
    async updatePrice(_sku: string, _mrp: number, _sellingPrice: number) {
      throw new Error(`${channel} pricing API is not configured`);
    },
  };
}
