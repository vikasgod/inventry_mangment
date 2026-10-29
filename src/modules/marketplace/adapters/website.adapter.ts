import type { ChannelAdapter, PublishProductInput, AdapterResult } from "../types";

// Replace these methods with your website catalog service calls if the storefront
// is deployed separately. This adapter only confirms that a sync job was processed.
export const websiteAdapter: ChannelAdapter = {
  async publishProduct(input: PublishProductInput): Promise<AdapterResult> {
    return { status: "accepted", externalListingId: input.sku, message: "Website adapter placeholder: connect your storefront catalog service." };
  },
  async updateInventory(_sku: string, _quantity: number) {
    // TODO: update the storefront inventory API/service.
  },
  async updatePrice(_sku: string, _mrp: number, _sellingPrice: number) {
    // TODO: update the storefront pricing API/service.
  },
};
