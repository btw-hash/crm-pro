import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductCatalog, type CatalogItem } from "./product-catalog";
import type { ProductId } from "@/domain/product/product";
import type { ProductDescription } from "@/domain/product/product-description";

// LaunchSkuButton pulls in a server-action ("use server") — stubbed for the component test.
vi.mock("./launch-sku-button", () => ({
  LaunchSkuButton: () => <button type="button">Schedule SKU launch</button>,
}));

// GenerateDescriptionsButton pulls in a server-action — stubbed to render the header.
vi.mock("./generate-descriptions-button", () => ({
  GenerateDescriptionsButton: () => <button type="button">Generate AI descriptions</button>,
}));

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const writeText = vi.fn();

function kit(rspMinor: number, category: string, marginPercent: number) {
  return {
    category,
    benefits: [],
    shelfLife: "12 months",
    rspFormatted: "",
    rspMinor,
    marginPercent,
    pitch: "pitch",
  };
}

const ITEMS: CatalogItem[] = [
  {
    id: "p1" as ProductId,
    name: "Dark chocolate",
    sku: "SKU-001",
    kit: kit(92000, "Chocolate", 18),
    shelfLife: "12 months",
    packaging: "Box, 5 kg",
    stock: { freeQuantity: 320, unit: "kg" },
  },
  {
    id: "p2" as ProductId,
    name: "Vanilla extract",
    sku: "SKU-002",
    kit: kit(45000, "Flavorings", 25),
    shelfLife: "24 months",
    packaging: "Jug, 10 L",
    stock: { freeQuantity: 12, unit: "L" },
  },
  {
    id: "p3" as ProductId,
    name: "Cocoa powder",
    sku: "SKU-003",
    kit: kit(30000, "Chocolate", 15),
    shelfLife: "18 months",
    packaging: "Bag, 25 kg",
    stock: { freeQuantity: 0, unit: "kg" },
  },
];

const DESC = new Map<ProductId, ProductDescription>();

function renderCatalog(overrides: Partial<Parameters<typeof ProductCatalog>[0]> = {}) {
  render(
    <ProductCatalog
      items={ITEMS}
      descById={DESC}
      showMargin={false}
      canCurate={false}
      canLaunchSku={false}
      clients={[]}
      {...overrides}
    />,
  );
}

describe("ProductCatalog (SKU table)", () => {
  beforeEach(() => {
    push.mockReset();
    writeText.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  it("renders table rows with all columns instead of shop cards", () => {
    renderCatalog();
    // Reference table column headers.
    expect(screen.getByRole("columnheader", { name: "SKU" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Stock" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Shelf life" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Packaging" })).toBeInTheDocument();
    // Row data: SKU, shelf life, packaging.
    expect(screen.getByText("SKU-001")).toBeInTheDocument();
    expect(screen.getByText("Box, 5 kg")).toBeInTheDocument();
    // 3 products = 3 table body rows.
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(1 + ITEMS.length);
  });

  it("has no cart or checkout anymore", () => {
    renderCatalog();
    expect(screen.queryByRole("button", { name: "Cart" })).not.toBeInTheDocument();
    expect(screen.queryByText("Place order")).not.toBeInTheDocument();
    expect(screen.queryByText("Add to cart")).not.toBeInTheDocument();
  });

  it("shows margin only when showMargin is set", () => {
    renderCatalog({ showMargin: true });
    expect(screen.getByText(/margin 18%/)).toBeInTheDocument();
  });

  it("search filters rows by name", () => {
    renderCatalog();
    fireEvent.change(screen.getByPlaceholderText("Search by name or SKU"), {
      target: { value: "vanilla" },
    });
    expect(screen.getByText("Vanilla extract")).toBeInTheDocument();
    expect(screen.queryByText("Dark chocolate")).not.toBeInTheDocument();
  });

  it("category filter leaves only that category's products", () => {
    renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: "Chocolate" }));
    expect(screen.getByText("Dark chocolate")).toBeInTheDocument();
    expect(screen.getByText("Cocoa powder")).toBeInTheDocument();
    expect(screen.queryByText("Vanilla extract")).not.toBeInTheDocument();
  });

  it("the 'Back-order' stock filter leaves only zero-stock items", () => {
    renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: "Back-order" }));
    expect(screen.getByText("Cocoa powder")).toBeInTheDocument();
    expect(screen.queryByText("Dark chocolate")).not.toBeInTheDocument();
  });

  it("selecting rows shows the proposal panel and copies the selected items", () => {
    renderCatalog();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Dark chocolate" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Vanilla extract" }));
    expect(screen.getByText("Selected items: 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy selection for proposal" }));
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0]?.[0] as string;
    expect(copied).toContain("Dark chocolate (SKU-001)");
    expect(copied).toContain("Vanilla extract (SKU-002)");
    expect(copied).not.toContain("Cocoa powder");
    expect(screen.getByText("Copied ✓")).toBeInTheDocument();
  });

  it("the header checkbox selects all visible rows", () => {
    renderCatalog();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all visible" }));
    expect(screen.getByText(`Selected items: ${ITEMS.length}`)).toBeInTheDocument();
  });

  it("selection survives a filter change — a proposal can span categories", () => {
    renderCatalog();
    // Select vanilla (Flavorings), then switch to the Chocolate category.
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Vanilla extract" }));
    fireEvent.click(screen.getByRole("button", { name: "Chocolate" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Dark chocolate" }));
    expect(screen.getByText("Selected items: 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy selection for proposal" }));
    const copied = writeText.mock.calls[0]?.[0] as string;
    expect(copied).toContain("Vanilla extract (SKU-002)");
    expect(copied).toContain("Dark chocolate (SKU-001)");
  });

  it("clicking a row opens the product card", () => {
    renderCatalog();
    fireEvent.click(screen.getByText("SKU-001"));
    expect(push).toHaveBeenCalledWith("/products/p1");
  });

  it("clicking the checkbox selects the row and does NOT open the card", () => {
    renderCatalog();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Dark chocolate" }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByText("Selected items: 1")).toBeInTheDocument();
  });

  it("row actions are hidden behind a chevron and expand on click (canLaunchSku)", () => {
    renderCatalog({ canLaunchSku: true });
    // Before expanding, row actions aren't visible — only the chevron trigger.
    expect(screen.queryByRole("button", { name: "Schedule SKU launch" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy pitch" })).not.toBeInTheDocument();

    // Clicking the cocoa row's chevron expands the actions panel.
    fireEvent.click(screen.getByRole("button", { name: "Actions for Cocoa powder" }));
    expect(screen.getByRole("button", { name: "Schedule SKU launch" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy pitch" })).toBeInTheDocument();
  });

  it("clicking the chevron expands actions and does NOT open the card", () => {
    renderCatalog({ canLaunchSku: true });
    fireEvent.click(screen.getByRole("button", { name: "Actions for Dark chocolate" }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Schedule SKU launch" })).toBeInTheDocument();
  });

  it("the chevron and row actions are hidden without canLaunchSku", () => {
    renderCatalog({ canLaunchSku: false });
    expect(screen.queryByRole("button", { name: /Actions for/ })).not.toBeInTheDocument();
  });

  it("renders the AI description generation button in the header when canCurate", () => {
    renderCatalog({ canCurate: true });
    expect(screen.getByRole("button", { name: "Generate AI descriptions" })).toBeInTheDocument();
  });
});
