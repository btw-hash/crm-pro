"use client";

import { Fragment, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { searchProducts } from "@/domain/product/product-search";
import type { ProductDescription } from "@/domain/product/product-description";
import type { ProductId } from "@/domain/product/product";
import { ProductKitActions } from "./product-kit-actions";
import { LaunchSkuButton } from "./launch-sku-button";
import { GenerateDescriptionsButton } from "./generate-descriptions-button";

interface ClientOption {
  readonly id: string;
  readonly name: string;
}

/** Sales-kit card data in plain form (no domain classes like Money) —
 *  so it can be serialized from a server- to a client-component. */
export interface CatalogItemKit {
  readonly category: string;
  readonly benefits: readonly string[];
  readonly shelfLife: string;
  readonly rspFormatted: string;
  readonly rspMinor: number;
  readonly marginPercent: number;
  readonly pitch: string;
}

/** Plain product DTO for the catalog (server → client). */
export interface CatalogItem {
  readonly id: ProductId;
  readonly name: string;
  readonly sku: string;
  readonly kit: CatalogItemKit | null;
  /** Shelf life from the ERP catalog (also present in Postgres). */
  readonly shelfLife: string | null;
  /** Packaging from the ERP catalog. */
  readonly packaging: string | null;
  readonly stock: { readonly freeQuantity: number; readonly unit: string } | null;
}

interface ProductCatalogProps {
  readonly items: readonly CatalogItem[];
  readonly descById: ReadonlyMap<ProductId, ProductDescription>;
  readonly showMargin: boolean;
  readonly canCurate: boolean;
  readonly canLaunchSku: boolean;
  readonly clients: readonly ClientOption[];
}

/** Number format with a comma thousands separator: 1240 → "$1,240", 436000 → "$436,000". */
function formatUsd(minor: number): string {
  return `$${new Intl.NumberFormat("en-US").format(Math.round(minor / 100))}`;
}

type StatusTone = "ok" | "warn" | "bad";

/** Maps ERP stock into the reference's word-based status badge. */
function stockStatus(stock: { freeQuantity: number } | null): {
  label: string;
  tone: StatusTone;
} {
  if (stock === null || stock.freeQuantity === 0) {
    return { label: "back-order", tone: "bad" };
  }
  if (stock.freeQuantity <= 50) {
    return { label: "low", tone: "warn" };
  }
  return { label: "in stock", tone: "ok" };
}

const TONE_COLORS: Record<StatusTone, { bg: string; color: string }> = {
  ok: { bg: "#e7f5ee", color: "#197a48" },
  warn: { bg: "#fbf1d6", color: "#9a6a00" },
  bad: { bg: "#f7e4e2", color: "var(--accent)" },
};

function StatusBadge({ stock }: { stock: { freeQuantity: number } | null }) {
  const { label, tone } = stockStatus(stock);
  const c = TONE_COLORS[tone];
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        font: "600 10px Arial",
        padding: "3px 8px",
        borderRadius: "999px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

/** Search magnifier SVG (reference): viewBox 0 0 24 24, stroke #6b6f78. */
function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b6f78" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4" />
    </svg>
  );
}

/** Chevron indicator for navigating to the card (reference): 16x16, stroke #c2c6cf, path M9 6l6 6-6 6.
 *  When the row is expanded, we rotate it 90° down — a visual marker for open actions. */
function RowChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#c2c6cf"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform .15s" }}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

const ALL_CATEGORIES = "All products";

/** Filter by stock status — word-based tones from stockStatus. */
type StatusFilter = "all" | StatusTone;
const STATUS_FILTERS: ReadonlyArray<readonly [StatusFilter, string]> = [
  ["all", "Any stock"],
  ["ok", "In stock"],
  ["warn", "Low"],
  ["bad", "Back-order"],
];

const GLASS_PANEL: CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(22px) saturate(1.3)",
  WebkitBackdropFilter: "blur(22px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
  borderRadius: "22px",
  padding: "6px 18px 12px",
  overflowX: "auto",
};

const TH: CSSProperties = {
  font: "600 11px Arial",
  color: "#9a9ea8",
  letterSpacing: ".5px",
  textAlign: "left",
  padding: "13px 8px 11px",
  borderBottom: "1px solid #e8e1d9",
  whiteSpace: "nowrap",
};

const TD: CSSProperties = {
  font: "400 13px Arial",
  color: "#16181d",
  padding: "12px 8px",
  borderBottom: "1px solid #f0ebe4",
  verticalAlign: "middle",
};

const NUM: CSSProperties = { textAlign: "right", fontVariantNumeric: "tabular-nums" };

const CHECKBOX: CSSProperties = {
  cursor: "pointer",
  width: "15px",
  height: "15px",
  accentColor: "#1c1f27",
};

function chipStyle(active: boolean): CSSProperties {
  return active
    ? {
        border: "none",
        background: "#1c1f27",
        color: "#fff",
        font: "600 12px Arial",
        padding: "7px 14px",
        borderRadius: "999px",
        cursor: "pointer",
      }
    : {
        border: "1px solid rgba(255,255,255,0.6)",
        background: "rgba(255,255,255,0.5)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        color: "#16181d",
        font: "600 12px Arial",
        padding: "7px 14px",
        borderRadius: "999px",
        boxShadow: "0 2px 8px rgba(31,45,80,0.06)",
        cursor: "pointer",
      };
}

export function ProductCatalog({
  items,
  descById,
  showMargin,
  canCurate,
  canLaunchSku,
  clients,
}: ProductCatalogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<ReadonlySet<ProductId>>(new Set());
  const [copied, setCopied] = useState(false);
  // Expanded catalog row — shows row actions (pitch + launch SKU), hidden behind the
  // chevron per the design (the last column is the navigation indicator).
  const [expandedId, setExpandedId] = useState<ProductId | null>(null);

  // Whether row actions exist at all — only then is the chevron interactive and the panel needed.
  const hasRowActions = canLaunchSku;

  // Categories — from the catalog data (as in the reference: filter chips by category).
  const categories = useMemo(
    () => [
      ALL_CATEGORIES,
      ...Array.from(
        new Set(
          items
            .map((i) => i.kit?.category)
            .filter((c): c is string => typeof c === "string" && c.length > 0),
        ),
      ),
    ],
    [items],
  );

  const filtered = useMemo(() => {
    const searched = searchProducts(items, query);
    return searched.filter((i) => {
      const byCategory = category === ALL_CATEGORIES || i.kit?.category === category;
      const byStatus = status === "all" || stockStatus(i.stock).tone === status;
      return byCategory && byStatus;
    });
  }, [items, query, category, status]);

  const filteredIds = useMemo(() => filtered.map((i) => i.id), [filtered]);
  const allVisibleSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

  function toggleOne(id: ProductId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setCopied(false);
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filteredIds.forEach((id) => next.delete(id));
      else filteredIds.forEach((id) => next.add(id));
      return next;
    });
    setCopied(false);
  }

  function clearSelection() {
    setSelected(new Set());
    setCopied(false);
  }

  function toggleExpanded(id: ProductId) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // Line items for a proposal (name + SKU + price/unit) from all selected items,
  // including ones hidden by the current filter — a manager builds a proposal across
  // several categories.
  const selectedItems = items.filter((i) => selected.has(i.id));
  function copyForProposal() {
    const lines = selectedItems.map((i) => {
      const price = i.kit ? ` — ${formatUsd(i.kit.rspMinor)} / ${i.stock?.unit ?? "kg"}` : "";
      return `• ${i.name} (${i.sku})${price}`;
    });
    void navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
  }

  // Table column count — for the row-expansion colSpan.
  const COLS = 9;

  return (
    <>
      {/* Screen header: title on the left, AI description generation + search capsule on the right. */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <div>
          <div style={{ font: "700 28px Arial", letterSpacing: "-.5px", color: "#16181d" }}>
            Catalog
          </div>
          <div style={{ font: "400 13px Arial", color: "#9a9ea8", marginTop: "4px" }}>
            Item reference › ERP stock and prices
            {showMargin ? " · margin is visible to commercial roles only" : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {canCurate ? <GenerateDescriptionsButton /> : null}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "1px solid rgba(255,255,255,0.6)",
              background: "rgba(255,255,255,0.5)",
              backdropFilter: "blur(14px) saturate(1.4)",
              WebkitBackdropFilter: "blur(14px) saturate(1.4)",
              padding: "0 14px",
              borderRadius: "24px",
              boxShadow: "0 4px 14px rgba(31,45,80,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
            }}
          >
            <SearchIcon />
            <input
              type="search"
              placeholder="Search by name or SKU"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                font: "400 13px Arial",
                color: "#16181d",
                border: "none",
                background: "transparent",
                outline: "none",
                padding: "10px 0",
                width: "236px",
              }}
            />
          </div>
        </div>
      </div>

      {/* Filters: category + stock status. */}
      <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginBottom: "14px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              style={chipStyle(cat === category)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {STATUS_FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              style={chipStyle(key === status)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Action panel above the selection — the line-item list for a proposal. */}
      {selected.size > 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "12px",
            padding: "10px 14px",
            borderRadius: "14px",
            background: "rgba(28,31,39,0.05)",
            border: "1px solid #e8e1d9",
          }}
        >
          <span style={{ font: "600 13px Arial", color: "#16181d" }}>
            Selected items: {selected.size}
          </span>
          <button
            type="button"
            onClick={copyForProposal}
            style={{
              border: "none",
              background: "#1c1f27",
              color: "#fff",
              font: "600 13px Arial",
              padding: "9px 16px",
              borderRadius: "12px",
              cursor: "pointer",
            }}
          >
            {copied ? "Copied ✓" : "Copy selection for proposal"}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            style={{
              border: "1px solid #e8e1d9",
              background: "#fff",
              color: "#16181d",
              font: "600 13px Arial",
              padding: "9px 16px",
              borderRadius: "12px",
              cursor: "pointer",
            }}
          >
            Clear selection
          </button>
          <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>
            for a proposal across multiple categories
          </span>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p style={{ font: "400 13px Arial", color: "#9a9ea8" }}>
          Nothing found{query ? ` for "${query}"` : ""}.
        </p>
      ) : (
        <div className="r-table" style={GLASS_PANEL}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: "34px" }}>
                  <input
                    type="checkbox"
                    aria-label="Select all visible"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    style={CHECKBOX}
                  />
                </th>
                <th style={TH}>SKU</th>
                <th style={TH}>Name</th>
                <th style={TH}>Category</th>
                <th style={{ ...TH, ...NUM }}>Stock</th>
                <th style={{ ...TH, ...NUM }}>Price{showMargin ? " · margin" : ""}</th>
                <th style={TH}>Shelf life</th>
                <th style={TH}>Packaging</th>
                {/* Empty header above the chevron column (reference). */}
                <th style={{ ...TH, width: "36px" }} aria-hidden />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const isSelected = selected.has(item.id);
                const isExpanded = expandedId === item.id;
                const unit = item.stock?.unit ?? "kg";
                return (
                  <Fragment key={item.id}>
                    <tr
                      onClick={() => router.push(`/products/${item.id}`)}
                      style={{
                        cursor: "pointer",
                        background: isSelected ? "rgba(231,179,43,0.10)" : undefined,
                      }}
                    >
                      {/* The checkbox must not open the card — stop click propagation. */}
                      <td style={TD} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${item.name}`}
                          checked={isSelected}
                          onChange={() => toggleOne(item.id)}
                          style={CHECKBOX}
                        />
                      </td>
                      <td style={{ ...TD, font: "600 12px Arial", color: "#6b6f78" }}>
                        {item.sku}
                      </td>
                      <td
                        style={{ ...TD, font: "600 13px Arial" }}
                        title={descById.get(item.id)?.text ?? item.kit?.pitch ?? undefined}
                      >
                        {item.name}
                      </td>
                      <td style={{ ...TD, color: "#6b6f78" }}>{item.kit?.category ?? "—"}</td>
                      <td style={{ ...TD, ...NUM }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: "8px",
                          }}
                        >
                          <span style={{ font: "600 13px Arial", whiteSpace: "nowrap" }}>
                            {item.stock
                              ? `${new Intl.NumberFormat("en-US").format(item.stock.freeQuantity)} ${unit}`
                              : "—"}
                          </span>
                          <StatusBadge stock={item.stock} />
                        </div>
                      </td>
                      <td style={{ ...TD, ...NUM }}>
                        {item.kit ? (
                          <>
                            <span style={{ font: "600 13px Arial", whiteSpace: "nowrap" }}>
                              {formatUsd(item.kit.rspMinor)}
                              <span style={{ font: "400 10px Arial", color: "#9a9ea8" }}>
                                {" "}
                                / {unit}
                              </span>
                            </span>
                            {showMargin ? (
                              <div style={{ font: "400 11px Arial", color: "#9a9ea8" }}>
                                margin {item.kit.marginPercent}%
                              </div>
                            ) : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        style={{
                          ...TD,
                          font: "400 12px Arial",
                          color: "#6b6f78",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.shelfLife ?? "—"}
                      </td>
                      <td
                        style={{
                          ...TD,
                          font: "400 12px Arial",
                          color: "#6b6f78",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.packaging ?? "—"}
                      </td>
                      {/* Chevron column: navigation indicator. When row actions exist, it's
                          clickable and expands the actions panel without opening the card. */}
                      <td
                        style={{ ...TD, textAlign: "right" }}
                        onClick={
                          hasRowActions
                            ? (e) => {
                                e.stopPropagation();
                                toggleExpanded(item.id);
                              }
                            : undefined
                        }
                      >
                        {hasRowActions ? (
                          <button
                            type="button"
                            aria-label={`Actions for ${item.name}`}
                            aria-expanded={isExpanded}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(item.id);
                            }}
                            style={{
                              display: "inline-flex",
                              justifyContent: "flex-end",
                              border: "none",
                              background: "transparent",
                              padding: 0,
                              cursor: "pointer",
                            }}
                          >
                            <RowChevron expanded={isExpanded} />
                          </button>
                        ) : (
                          <span style={{ display: "flex", justifyContent: "flex-end" }}>
                            <RowChevron expanded={false} />
                          </span>
                        )}
                      </td>
                    </tr>
                    {/* Row expansion: catalog row actions (pitch + launch SKU). */}
                    {hasRowActions && isExpanded ? (
                      <tr>
                        <td
                          colSpan={COLS}
                          style={{
                            padding: "0 8px 14px",
                            borderBottom: "1px solid #f0ebe4",
                            background: "rgba(28,31,39,0.02)",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "10px",
                              flexWrap: "wrap",
                              paddingTop: "12px",
                            }}
                          >
                            {item.kit ? (
                              <ProductKitActions pitch={item.kit.pitch} variant="row" />
                            ) : null}
                            <LaunchSkuButton productId={item.id} clients={clients} />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
