import { productPitch } from "@/domain/product/product";
import { canManageProcurement, canSeeMargin } from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { ProductCatalog, type CatalogItem } from "./_components/product-catalog";

/**
 * Product catalog with a Sales Kit (similar to Pitcher Puratos): cards for showing to the
 * client — benefits, shelf life, recommended price; margin is visible only to commercial
 * roles (a technologist doesn't see it). Content is reference material (deterministic),
 * not AI-generated.
 * #212: search by name/SKU, cart, warehouse stock from ERP.
 */
export default async function ProductsPage() {
  const viewer = await requireUser();
  const { role } = viewer;
  const showMargin = canSeeMargin(role);
  const canCurate = canManageProcurement(role);
  const canLaunchSku = role === "mop" || role === "head";
  const [items, descriptions, allClients] = await Promise.all([
    getContainer().listProductsWithStock(),
    getContainer().listProductDescriptions(),
    canLaunchSku ? getContainer().listClients(viewer) : Promise.resolve([]),
  ]);
  const descById = new Map(descriptions.map((d) => [d.productId, d]));
  const clientOptions = allClients.map((c) => ({ id: c.id, name: c.name }));
  // Serialize into a plain DTO: domain classes (Money in kit.rsp) can't be passed from a
  // server- to a client component (ProductCatalog) — RSC only serializes plain values.
  // rspMinor is a number (cents) from Money.amountMinor; the class itself doesn't cross the
  // boundary — the client formats the price ("$920 / kg") and totals the cart itself.
  const catalogItems: CatalogItem[] = items.map(({ product, stock }) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    // Shelf life/packing — from the ERP item master (also on Postgres); falls back to the
    // kit for the in-memory demo.
    shelfLife: product.shelfLife ?? product.kit?.shelfLife ?? null,
    packaging: product.packaging ?? null,
    kit: product.kit
      ? {
          category: product.kit.category,
          benefits: product.kit.benefits,
          shelfLife: product.kit.shelfLife,
          rspFormatted: product.kit.rsp.format(),
          rspMinor: product.kit.rsp.amountMinor,
          marginPercent: product.kit.marginPercent,
          pitch: productPitch(product),
        }
      : null,
    stock: stock ? { freeQuantity: stock.freeQuantity, unit: stock.unit } : null,
  }));

  return (
    <section style={{ fontFamily: "Arial, sans-serif", color: "#16181d" }}>
      <ProductCatalog
        items={catalogItems}
        descById={descById}
        showMargin={showMargin}
        canCurate={canCurate}
        canLaunchSku={canLaunchSku}
        clients={clientOptions}
      />
    </section>
  );
}
