import Link from "next/link";
import { notFound } from "next/navigation";
import { ErpLink } from "@/app/_components/erp-link";
import { productPitch } from "@/domain/product/product";
import { canSeeMargin } from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { ProductCardHeader } from "../_components/product-card-header";

/**
 * Product card (#308 follow-up) — modeled on the client card `/clients/[id]`:
 * ERP data (stock/price/shelf life/packing) + AI description + "Open in ERP" button.
 * Numbers/stock are from ERP (deterministic); AI only writes the description. Margin
 * is shown to roles that have access.
 */

const FROSTED: React.CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(22px) saturate(1.3)",
  WebkitBackdropFilter: "blur(22px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
};

type StatusTone = "ok" | "warn" | "bad";
function stockStatus(free: number | null): { label: string; tone: StatusTone } {
  if (free === null || free === 0) return { label: "on order", tone: "bad" };
  if (free <= 50) return { label: "low stock", tone: "warn" };
  return { label: "in stock", tone: "ok" };
}
const TONE_COLORS: Record<StatusTone, { bg: string; color: string }> = {
  ok: { bg: "#e7f5ee", color: "#197a48" },
  warn: { bg: "#fbf1d6", color: "#9a6a00" },
  bad: { bg: "#f7e4e2", color: "var(--accent)" },
};

export default async function ProductCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireUser();
  const { role } = viewer;
  const showMargin = canSeeMargin(role);
  const canLaunchSku = role === "mop" || role === "head";

  const [items, descriptions, allClients] = await Promise.all([
    getContainer().listProductsWithStock(),
    getContainer().listProductDescriptions(),
    canLaunchSku ? getContainer().listClients(viewer) : Promise.resolve([]),
  ]);

  const entry = items.find(({ product }) => product.id === id);
  if (!entry) notFound();
  const { product, stock } = entry;
  const desc = descriptions.find((d) => d.productId === product.id) ?? null;
  const clientOptions = allClients.map((c) => ({ id: c.id, name: c.name }));

  const unit = stock?.unit ?? product.unit ?? "kg";
  const status = stockStatus(stock?.freeQuantity ?? null);
  const tone = TONE_COLORS[status.tone];
  const shelfLife = product.shelfLife ?? product.kit?.shelfLife ?? null;
  const packaging = product.packaging ?? null;
  const aiText = desc?.text ?? (product.kit ? productPitch(product) : null);

  // ERP metrics: always 4 cards in a single row (per the design reference,
  // repeat(4,1fr)) — price/stock/shelf life/packing.
  // Margin caption under price — commercial roles only (canSeeMargin) and only when a kit exists.
  const metrics: ReadonlyArray<{ label: string; value: string; sub?: string }> = [
    {
      label: "Recommended price",
      value: product.kit ? `${product.kit.rsp.format()} / ${unit}` : "—",
      ...(product.kit && showMargin ? { sub: `margin ${product.kit.marginPercent}%` } : {}),
    },
    {
      label: "Available stock",
      value: stock ? `${new Intl.NumberFormat("en-US").format(stock.freeQuantity)} ${unit}` : "—",
      sub: status.label,
    },
    { label: "Shelf life", value: shelfLife ?? "—" },
    { label: "Packing", value: packaging ?? "—" },
  ];

  return (
    <div className="scr">
      {/* Back to catalog */}
      <Link
        href="/products"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          font: "600 13px Arial",
          color: "#6b6f78",
          textDecoration: "none",
          marginBottom: "16px",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
        Back to catalog
      </Link>

      {/* Card header + SKU launch form (client component: shared form state). */}
      <ProductCardHeader
        productId={product.id}
        name={product.name}
        sku={product.sku}
        category={product.kit ? product.kit.category : null}
        statusLabel={status.label}
        statusBg={tone.bg}
        statusColor={tone.color}
        pitch={product.kit ? productPitch(product) : null}
        canLaunchSku={canLaunchSku}
        clients={clientOptions}
        erpLink={
          <ErpLink
            label="Open in ERP"
            title="Open the ERP window — item master, stock, reservations"
          />
        }
      />

      {/* ERP metrics row — always 4 cards (per the design reference). */}
      <div
        className="r-grid-2"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        {metrics.map((metric) => (
          <div key={metric.label} style={{ ...FROSTED, borderRadius: "18px", padding: "18px" }}>
            <div style={{ font: "400 12px Arial", color: "#9a9ea8" }}>{metric.label}</div>
            <div style={{ font: "700 22px Arial", letterSpacing: "-.5px", marginTop: "8px" }}>
              {metric.value}
            </div>
            {metric.sub ? (
              <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginTop: "4px" }}>
                {metric.sub}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* AI description + Sales Kit */}
      <div
        className="r-stack"
        style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "16px" }}
      >
        <div style={{ ...FROSTED, borderRadius: "22px", padding: "22px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: "#1c1f27",
              color: "#fff",
              font: "700 10px Arial",
              padding: "3px 8px",
              borderRadius: "999px",
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M7 17L17 7M17 7H8M17 7v9" />
            </svg>
            AI description
          </span>
          <div
            style={{
              font: "400 13px/1.55 Arial",
              color: "#6b6f78",
              marginTop: "12px",
              whiteSpace: "pre-wrap",
            }}
          >
            {aiText ?? "Description not generated yet."}
          </div>
          {desc?.sourceUrl ? (
            <div style={{ font: "400 12px Arial", color: "#9a9ea8", marginTop: "12px" }}>
              source:{" "}
              <a
                href={desc.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)", textDecoration: "none" }}
              >
                {desc.sourceUrl} →
              </a>{" "}
              · verified by a human
            </div>
          ) : null}
        </div>

        <div style={{ ...FROSTED, borderRadius: "22px", padding: "22px" }}>
          <div style={{ font: "600 15px Arial", marginBottom: "12px" }}>Benefits</div>
          {product.kit && product.kit.benefits.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {product.kit.benefits.map((benefit, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "9px",
                    alignItems: "flex-start",
                    font: "400 13px/1.45 Arial",
                    color: "#16181d",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "var(--accent)",
                      marginTop: "6px",
                      flex: "none",
                    }}
                  />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
