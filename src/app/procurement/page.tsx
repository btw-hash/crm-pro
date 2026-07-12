import { getContainer } from "@/infrastructure/composition-root";
import { seedProducts } from "@/infrastructure/persistence/seed";
import { redirect } from "next/navigation";
import { availableVolume } from "@/domain/quota/quota";
import type { ProductId } from "@/domain/product/product";
import { canManageProcurement } from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { OpsFilters } from "@/app/_components/ops-filters";
import { ExportButton } from "@/app/_components/export-button";
import { OpsHeader, StatusBadge, type StatusTone } from "@/app/_components/ops-ui";
import { DataTable, type DataColumn, type DataRow } from "@/app/_components/data-table";

function productName(productId: ProductId): string {
  return seedProducts.find((p) => p.id === productId)?.name ?? productId;
}

function productUnit(productId: ProductId): string {
  return seedProducts.find((p) => p.id === productId)?.unit ?? "";
}

// There's no supplier in the quota source (no supplier field in the domain). A
// deterministic demo derivation: we stably derive a supplier from the product id —
// this is a stand-in for the demo stand, not a made-up backend (the real supplier
// will come from the ERP as a separate field).
const DEMO_SUPPLIERS = [
  "Cargill",
  "ADM",
  "Barry Callebaut",
  "Bunge",
  "Solvay",
  "Puratos",
  "Ingredion",
];
function demoSupplier(productId: ProductId): string {
  let hash = 0;
  for (const ch of String(productId)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return DEMO_SUPPLIERS[hash % DEMO_SUPPLIERS.length] ?? "Cargill";
}

// Item status by stock relative to the reorder point (deterministic):
//   stock < reorder point            → "reorder" (shortage, bad)
//   stock > 60% of the plan (sits)   → "overstock" (warn)
//   otherwise                        → "ok" (ok)
type StockStatus = "shortage" | "overstock" | "ok";
const STOCK_STATUS_META: Record<StockStatus, { label: string; tone: StatusTone }> = {
  shortage: { label: "reorder", tone: "bad" },
  overstock: { label: "overstock", tone: "warn" },
  ok: { label: "ok", tone: "ok" },
};

// board 7 chips: "All · Shortage · Overstock · OK".
const STOCK_FILTERS: Record<string, (s: StockStatus) => boolean> = {
  all: () => true,
  shortage: (s) => s === "shortage",
  overstock: (s) => s === "overstock",
  ok: (s) => s === "ok",
};

// The reference's shared generic table (board 7): "Product · Stock · Reorder point · Supplier · Status".
const STOCK_COLUMNS: DataColumn[] = [
  { label: "Product", flex: 2 },
  { label: "Stock", align: "right" },
  { label: "Reorder point", align: "right" },
  { label: "Supplier" },
  { label: "Status" },
];

interface StockRow {
  readonly productId: ProductId;
  readonly name: string;
  readonly unit: string;
  readonly available: number;
  readonly reorderPoint: number;
  readonly supplier: string;
  readonly status: StockStatus;
}

export default async function ProcurementPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  // Procurement section — category manager and head of sales only.
  if (!canManageProcurement(user.role)) {
    redirect("/");
  }
  const container = getContainer();

  const allQuotas = await container.listQuotas();

  // Aggregate quotas by product into stock items: stock = the sum of what's available
  // across all managers (availableVolume — domain logic), the reorder point is a
  // deterministic 15% of the total plan. This gives the per-product stock table
  // from the board 7 reference.
  const byProduct = new Map<
    string,
    { productId: ProductId; plan: number; available: number; unit: string }
  >();
  for (const q of allQuotas) {
    const key = String(q.productId);
    const entry = byProduct.get(key) ?? {
      productId: q.productId,
      plan: 0,
      available: 0,
      unit: productUnit(q.productId),
    };
    entry.plan += q.plannedVolume;
    entry.available += availableVolume(q);
    byProduct.set(key, entry);
  }

  const stockRows: StockRow[] = [...byProduct.values()].map((e) => {
    const reorderPoint = Math.round(e.plan * 0.15);
    const status: StockStatus =
      e.available < reorderPoint ? "shortage" : e.available > e.plan * 0.6 ? "overstock" : "ok";
    return {
      productId: e.productId,
      name: productName(e.productId),
      unit: e.unit,
      available: e.available,
      reorderPoint,
      supplier: demoSupplier(e.productId),
      status,
    };
  });

  const shortageCount = stockRows.filter((r) => r.status === "shortage").length;
  const overstockCount = stockRows.filter((r) => r.status === "overstock").length;
  const okCount = stockRows.filter((r) => r.status === "ok").length;

  const filter = (await searchParams).filter ?? "all";
  const predicate = STOCK_FILTERS[filter] ?? (() => true);
  const visibleRows = stockRows.filter((r) => predicate(r.status));

  const exportRows = visibleRows.map((r) => [
    r.name,
    `${r.available} ${r.unit}`,
    `${r.reorderPoint} ${r.unit}`,
    r.supplier,
    STOCK_STATUS_META[r.status].label,
  ]);

  const dataRows: DataRow[] = visibleRows.map((r) => {
    const meta = STOCK_STATUS_META[r.status];
    return {
      id: String(r.productId),
      cells: [
        r.name,
        <span key="a" style={{ fontWeight: 700 }}>
          {r.available} {r.unit}
        </span>,
        <span key="r" style={{ color: "#9a9ea8" }}>
          {r.reorderPoint} {r.unit}
        </span>,
        <span key="s" style={{ color: "#9a9ea8" }}>
          {r.supplier}
        </span>,
        <StatusBadge key="st" tone={meta.tone}>
          {meta.label}
        </StatusBadge>,
      ],
      sortValues: [r.name, r.available, r.reorderPoint, r.supplier, meta.label],
    };
  });

  return (
    <div className="scr">
      <OpsHeader
        title="Procurement"
        breadcrumb="Operations section › ERP data"
        action={
          <ExportButton
            filename="procurement-stock"
            headers={["Product", "Stock", "Reorder point", "Supplier", "Status"]}
            rows={exportRows}
          />
        }
      />

      <OpsFilters
        chips={[
          { label: "All", value: "all" },
          { label: "Shortage", value: "shortage" },
          { label: "Overstock", value: "overstock" },
          { label: "OK", value: "ok" },
        ]}
        metrics={[
          { value: shortageCount, label: "To reorder", color: "var(--accent)", bordered: false },
          { value: overstockCount, label: "Overstock", color: "#9a6a00", bordered: true },
          { value: okCount, label: "OK", color: "#197a48", bordered: true },
        ]}
      />

      <DataTable columns={STOCK_COLUMNS} rows={dataRows} emptyText="No items match this filter" />
    </div>
  );
}
