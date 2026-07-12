import type { ErpGateway } from "@/application/ports/erp-gateway";
import type { ProductRepository } from "@/application/ports/product-repository";
import type { Product } from "@/domain/product/product";

export interface SyncNomenclatureResult {
  readonly count: number;
}

export type SyncNomenclature = () => Promise<SyncNomenclatureResult>;

/**
 * Pulls the nomenclature catalog from the ERP and populates the local product DB
 * (the catalog is a synced ERP cache, not realtime — see the 06-25 call). The ERP is the
 * source of the list and base fields; CRM enrichment (Sales Kit) is preserved via a merge
 * by id, so the sync doesn't wipe it. Run via the `npm run sync:erp` script (or on a
 * schedule).
 */
export function makeSyncNomenclature(deps: {
  erp: ErpGateway;
  products: ProductRepository;
}): SyncNomenclature {
  return async () => {
    const [incoming, existing] = await Promise.all([
      deps.erp.listNomenclature(),
      deps.products.list(),
    ]);
    const byId = new Map(existing.map((p) => [p.id, p]));
    const merged: Product[] = incoming.map((item) => {
      const prev = byId.get(item.id);
      // item (ERP) overwrites base fields; prev.kit (CRM) is preserved.
      return prev ? { ...prev, ...item } : { ...item };
    });
    await deps.products.upsertMany(merged);
    return { count: merged.length };
  };
}
