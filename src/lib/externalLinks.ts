import { supabase } from "@/integrations/supabase/client";

export type ExternalProvider = "maps" | "tours" | "stays";

export type ExternalLink = {
  provider: ExternalProvider;
  label: string;
  url: string;
};

const query = (...parts: Array<string | undefined>) =>
  encodeURIComponent(parts.filter(Boolean).join(", "));

export const placeLinks = (name: string, city: string, country: string): ExternalLink[] => [
  { provider: "maps", label: "Open in Maps", url: `https://www.google.com/maps/search/?api=1&query=${query(name, city, country)}` },
  { provider: "tours", label: "Find tours", url: `https://www.getyourguide.com/s/?q=${query(name, city, country)}` },
];

export const destinationLinks = (city: string, country: string): ExternalLink[] => [
  { provider: "stays", label: "Find stays", url: `https://www.booking.com/searchresults.html?ss=${query(city, country)}` },
  { provider: "tours", label: "Find tours", url: `https://www.getyourguide.com/s/?q=${query(city, country)}` },
];

type OutboundInsert = {
  insert: (value: Record<string, unknown>) => PromiseLike<unknown>;
};

export const trackOutboundClick = (
  provider: ExternalProvider,
  entityType: "experience" | "destination",
  entityName: string,
  destination: string,
) => {
  const client = supabase as unknown as { from: (table: string) => OutboundInsert };
  void client.from("outbound_clicks").insert({
    provider,
    entity_type: entityType,
    entity_name: entityName,
    destination,
  });
};
