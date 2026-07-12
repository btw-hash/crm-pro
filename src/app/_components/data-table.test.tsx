import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable, type DataColumn, type DataRow } from "./data-table";

const COLUMNS: DataColumn[] = [
  { label: "Name" },
  { label: "Score", align: "right" },
  { label: "Action", sortable: false },
];

function rows(): DataRow[] {
  return [
    {
      id: "a",
      cells: ["Boris", 30, <span key="x">button-B</span>],
      sortValues: ["Boris", 30, null],
    },
    { id: "b", cells: ["Anna", 50, "act"], sortValues: ["Anna", 50, null] },
    { id: "c", cells: ["Vera", 10, "act"], sortValues: ["Vera", 10, null] },
  ];
}

// Names in display order: getAllByText returns elements in DOM order, exact match
// so it doesn't also match "button-B".
function order(): string[] {
  return screen.getAllByText(/^(Boris|Anna|Vera)$/).map((el) => el.textContent ?? "");
}

describe("DataTable", () => {
  it("shows emptyText when there are no rows", () => {
    render(<DataTable columns={COLUMNS} rows={[]} emptyText="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("renders rows in the original order by default", () => {
    render(<DataTable columns={COLUMNS} rows={rows()} />);
    expect(order()).toEqual(["Boris", "Anna", "Vera"]);
  });

  it("sorts on header click (asc), a second click — desc", () => {
    render(<DataTable columns={COLUMNS} rows={rows()} />);
    const header = screen.getByRole("button", { name: /Score/ });

    fireEvent.click(header); // asc by score: 10, 30, 50 → Vera, Boris, Anna
    expect(order()).toEqual(["Vera", "Boris", "Anna"]);

    fireEvent.click(header); // desc: 50, 30, 10 → Anna, Boris, Vera
    expect(order()).toEqual(["Anna", "Boris", "Vera"]);
  });

  it("does not sort on a non-sortable column", () => {
    render(<DataTable columns={COLUMNS} rows={rows()} />);
    fireEvent.click(screen.getByText("Action"));
    expect(order()).toEqual(["Boris", "Anna", "Vera"]);
  });

  it("paginates: shows pageSize rows and pages further", () => {
    render(<DataTable columns={COLUMNS} rows={rows()} pageSize={2} />);
    expect(order()).toEqual(["Boris", "Anna"]);

    fireEvent.click(screen.getByLabelText("Next page"));
    expect(order()).toEqual(["Vera"]);
  });

  it("applies initialSort", () => {
    render(<DataTable columns={COLUMNS} rows={rows()} initialSort={{ index: 1, dir: "desc" }} />);
    expect(order()).toEqual(["Anna", "Boris", "Vera"]);
  });

  it("renders arbitrary ReactNode cells (buttons/badges)", () => {
    render(<DataTable columns={COLUMNS} rows={rows()} />);
    expect(screen.getByText("button-B")).toBeInTheDocument();
  });
});
