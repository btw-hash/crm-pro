"use client";

import { useState, type ReactNode } from "react";
import { LaunchSkuFormPanel, LaunchSkuHeaderButton } from "./launch-sku-button";
import { ProductKitActions } from "./product-kit-actions";

interface ClientOption {
  readonly id: string;
  readonly name: string;
}

const FROSTED: React.CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(22px) saturate(1.3)",
  WebkitBackdropFilter: "blur(22px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
};

/**
 * Client component for the product card header: title + status + meta line on the left,
 * action row on the right (Open in ERP / Copy pitch / Schedule launch). The SKU launch
 * button expands the form as a separate frosted panel ABOVE the metrics row (per the
 * design reference) — so the header and the form live in one client component sharing
 * `launchOpen` state.
 *
 * `erpLink` arrives as a ready-made element (the server-side `ErpLink` reads env) — passed
 * through as a prop so we don't have to move env reads into a client component.
 */
export function ProductCardHeader({
  productId,
  name,
  sku,
  category,
  statusLabel,
  statusBg,
  statusColor,
  pitch,
  canLaunchSku,
  clients,
  erpLink,
}: {
  readonly productId: string;
  readonly name: string;
  readonly sku: string;
  readonly category: string | null;
  readonly statusLabel: string;
  readonly statusBg: string;
  readonly statusColor: string;
  readonly pitch: string | null;
  readonly canLaunchSku: boolean;
  readonly clients: readonly ClientOption[];
  readonly erpLink: ReactNode;
}) {
  const [launchOpen, setLaunchOpen] = useState(false);

  return (
    <>
      <div
        style={{
          ...FROSTED,
          borderRadius: "22px",
          padding: "22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "11px", flexWrap: "wrap" }}>
            <span style={{ font: "700 23px Arial", letterSpacing: "-.3px" }}>{name}</span>
            <span
              style={{
                background: statusBg,
                color: statusColor,
                font: "600 11px Arial",
                padding: "4px 11px",
                borderRadius: "999px",
              }}
            >
              {statusLabel}
            </span>
          </div>
          <div style={{ font: "400 12px Arial", color: "#9a9ea8", marginTop: "5px" }}>
            SKU {sku}
            {category ? ` · ${category}` : ""} · ERP item master
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flex: "none",
            flexWrap: "wrap",
          }}
        >
          {erpLink}
          {pitch !== null ? <ProductKitActions pitch={pitch} /> : null}
          {canLaunchSku ? <LaunchSkuHeaderButton onClick={() => setLaunchOpen((v) => !v)} /> : null}
        </div>
      </div>

      {canLaunchSku ? (
        <LaunchSkuFormPanel
          open={launchOpen}
          onClose={() => setLaunchOpen(false)}
          productId={productId}
          clients={clients}
        />
      ) : null}
    </>
  );
}
