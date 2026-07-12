"use client";

/** One CSV cell: escape quotes/separators/line breaks (RFC 4180). */
function csvCell(value: string | number): string {
  const s = String(value ?? "");
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * A button that exports the table to CSV. Receives already-prepared (server-side,
 * with the current filter applied) headers and rows — builds a CSV and downloads it
 * as a file. Separator `;` + BOM — so the columns and any non-ASCII text open
 * correctly in Excel.
 */
export function ExportButton({
  filename,
  headers,
  rows,
  label = "Export",
}: {
  filename: string;
  headers: readonly string[];
  rows: readonly (readonly (string | number)[])[];
  label?: string;
}) {
  function download() {
    const lines = [headers, ...rows].map((row) => row.map(csvCell).join(";"));
    const csv = "﻿" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const disabled = rows.length === 0;

  return (
    <button
      type="button"
      onClick={download}
      disabled={disabled}
      title={disabled ? "No data to export" : "Download CSV (current filter)"}
      style={{
        border: "none",
        background: "#1c1f27",
        color: "#fff",
        font: "600 13px Arial",
        padding: "11px 16px",
        borderRadius: "24px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
        <path d="M4 21h16" />
      </svg>
    </button>
  );
}
