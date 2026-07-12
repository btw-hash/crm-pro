"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const CONTROL: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.6)",
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  color: "#16181d",
  font: "600 13px Arial",
  padding: "8px 13px",
  borderRadius: "999px",
  cursor: "pointer",
};

/**
 * "My shipments" filters: client picker (dropdown) and shipment date (calendar).
 * They push `?client=` / `?date=` into the URL, keeping the other params
 * (status chips). The server page reads them and narrows the table.
 */
export function MyShipmentFilters({ clients }: { clients: readonly string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const client = searchParams.get("client") ?? "";
  const date = searchParams.get("date") ?? "";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
        marginBottom: "16px",
      }}
    >
      <select
        aria-label="Filter by client"
        value={client}
        onChange={(e) => update("client", e.target.value)}
        style={CONTROL}
      >
        <option value="">All clients</option>
        {clients.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <input
        type="date"
        aria-label="Filter by shipment date"
        value={date}
        onChange={(e) => update("date", e.target.value)}
        style={{ ...CONTROL, cursor: "auto" }}
      />

      {date || client ? (
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("client");
            params.delete("date");
            const query = params.toString();
            router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
          }}
          style={{ ...CONTROL, color: "#9a6a00" }}
        >
          Reset
        </button>
      ) : null}
    </div>
  );
}
