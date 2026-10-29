import type { Channel, ChannelAdapter } from "./types";
import { websiteAdapter } from "./adapters/website.adapter";
import { unconfiguredAdapter } from "./adapters/unconfigured.adapter";

export function getAdapter(channel: Channel): ChannelAdapter {
  if (channel === "website") return websiteAdapter;
  // Never fake marketplace success. Implement official, authorized adapters here.
  return unconfiguredAdapter(channel);
}
