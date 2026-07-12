/**
 * Barrel of demo data (synthetic, no real PII/trade secrets). Simulates an ERP
 * export. Split by domain across `./seed/*`; external imports of
 * `@/infrastructure/persistence/seed` don't change. When the ERP integration is
 * connected, the source changes in the composition root; screens/logic are untouched.
 */
export * from "./seed/refs";
export * from "./seed/catalog";
export * from "./seed/clients";
export * from "./seed/operations";
export * from "./seed/sales";
export * from "./seed/deals";
export * from "./seed/procurement";
