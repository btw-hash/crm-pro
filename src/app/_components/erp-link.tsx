import { loadEnv } from "@/infrastructure/config/env";
import { ErpEmbedButton } from "./erp-embed-button";

/**
 * Contextual "Open in ERP" button (an ERP window — orders/reservations from the CRM).
 * Opens the ERP window RIGHT ON the site (an iframe in a modal) — see {@link ErpEmbedButton}.
 * Rendered ONLY where it's relevant (a deal/client card), not in the global header.
 * If `ERP_UI_URL` isn't set — renders nothing. The role gate lives on the caller's side.
 */
export function ErpLink({
  label = "Open in ERP",
  title = "Open the ERP window — orders and reservations created from the CRM",
}: {
  label?: string;
  title?: string;
}) {
  const url = loadEnv().ERP_UI_URL;
  if (!url) {
    return null;
  }
  return <ErpEmbedButton url={url} label={label} title={title} />;
}
