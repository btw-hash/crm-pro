/** Client type by business profile (per the Puratos model). */
export const CLIENT_TYPES = [
  "artisan_baker",
  "horeca",
  "confectioner",
  "distributor",
  "industry",
  "retail",
] as const;

export type ClientType = (typeof CLIENT_TYPES)[number];

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  artisan_baker: "Artisan bakery",
  horeca: "HoReCa",
  confectioner: "Confectionery producer",
  distributor: "Distributor",
  industry: "Industrial plant",
  retail: "Retail",
};

export function isClientType(value: unknown): value is ClientType {
  return typeof value === "string" && (CLIENT_TYPES as readonly string[]).includes(value);
}
