import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InlineEditField, InlineEditSelect } from "./inline-edit";

describe("InlineEditField", () => {
  it("clicking the value turns it into an input with the current value", () => {
    render(<InlineEditField label="Title" value="Task" onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Task/ }));
    const input = screen.getByRole("textbox", { name: "Title" });
    expect(input).toHaveValue("Task");
  });

  it("Enter saves the new value by calling onSave", async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    render(<InlineEditField label="Title" value="Old" onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /Old/ }));
    const input = screen.getByRole("textbox", { name: "Title" });
    fireEvent.change(input, { target: { value: "New" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSave).toHaveBeenCalledWith("New");
    // Optimistic: the new value is visible immediately.
    await waitFor(() => expect(screen.getByRole("button", { name: /New/ })).toBeTruthy());
  });

  it("Esc cancels the edit and restores the original value without calling onSave", () => {
    const onSave = vi.fn();
    render(<InlineEditField label="Title" value="Original" onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /Original/ }));
    const input = screen.getByRole("textbox", { name: "Title" });
    fireEvent.change(input, { target: { value: "Draft" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Original/ })).toBeTruthy();
  });

  it("a save error rolls the optimistic value back to the original and shows the error", async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: false, error: "No permission" });
    render(<InlineEditField label="Title" value="Original" onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /Original/ }));
    const input = screen.getByRole("textbox", { name: "Title" });
    fireEvent.change(input, { target: { value: "New" } });
    fireEvent.keyDown(input, { key: "Enter" });
    // First optimistically "New", then rollback to "Original" + error.
    await waitFor(() => expect(screen.getByRole("button", { name: /Original/ })).toBeTruthy());
    expect(screen.getByText("No permission")).toBeTruthy();
  });

  it("onSave is not called when the value is unchanged", () => {
    const onSave = vi.fn();
    render(<InlineEditField label="Title" value="Task" onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /Task/ }));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Title" }), { key: "Enter" });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("readOnly prevents entering edit mode (RBAC)", () => {
    render(<InlineEditField label="Title" value="Task" onSave={vi.fn()} readOnly />);
    fireEvent.click(screen.getByRole("button", { name: /Task/ }));
    expect(screen.queryByRole("textbox", { name: "Title" })).toBeNull();
  });
});

describe("InlineEditSelect", () => {
  const options = [
    { value: "order", label: "Order" },
    { value: "test", label: "Test / trial" },
  ];

  it("shows the label of the selected value and edits it on click", () => {
    render(<InlineEditSelect label="Goal" value="order" onSave={vi.fn()} options={options} />);
    expect(screen.getByRole("button", { name: /Order/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Order/ }));
    expect(screen.getByRole("combobox", { name: "Goal" })).toHaveValue("order");
  });

  it("Enter saves the selected value (not the label)", async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    render(<InlineEditSelect label="Goal" value="order" onSave={onSave} options={options} />);
    fireEvent.click(screen.getByRole("button", { name: /Order/ }));
    const select = screen.getByRole("combobox", { name: "Goal" });
    fireEvent.change(select, { target: { value: "test" } });
    fireEvent.keyDown(select, { key: "Enter" });
    expect(onSave).toHaveBeenCalledWith("test");
    await waitFor(() => expect(screen.getByRole("button", { name: /Test/ })).toBeTruthy());
  });

  it("Esc cancels and restores the original label", () => {
    const onSave = vi.fn();
    render(<InlineEditSelect label="Goal" value="order" onSave={onSave} options={options} />);
    fireEvent.click(screen.getByRole("button", { name: /Order/ }));
    const select = screen.getByRole("combobox", { name: "Goal" });
    fireEvent.change(select, { target: { value: "test" } });
    fireEvent.keyDown(select, { key: "Escape" });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Order/ })).toBeTruthy();
  });
});
