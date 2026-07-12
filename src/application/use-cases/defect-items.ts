import type { DefectItemRepository } from "@/application/ports/defect-item-repository";
import {
  advanceDefect,
  createDefectItem,
  type CreateDefectItemInput,
  type DefectItem,
  DefectItemError,
  type DefectItemId,
} from "@/domain/defect/defect-item";

export type ListDefectItems = () => Promise<readonly DefectItem[]>;

/** Items in the defect warehouse (newest on top). */
export function makeListDefectItems(deps: { defects: DefectItemRepository }): ListDefectItems {
  return () => deps.defects.list();
}

export type FileDefectItem = (input: CreateDefectItemInput) => Promise<DefectItem>;

/** Puts a product into the defect warehouse (condition + reason). */
export function makeFileDefectItem(deps: { defects: DefectItemRepository }): FileDefectItem {
  return async (input) => {
    const item = createDefectItem(input);
    await deps.defects.save(item);
    return item;
  };
}

export type AdvanceDefectItem = (input: { id: DefectItemId }) => Promise<DefectItem>;

/** Moves a product through the relabeling process (defect->request->relabel->ready->written off). */
export function makeAdvanceDefectItem(deps: { defects: DefectItemRepository }): AdvanceDefectItem {
  return async ({ id }) => {
    const item = await deps.defects.findById(id);
    if (!item) {
      throw new DefectItemError("Item not found");
    }
    const next = advanceDefect(item);
    await deps.defects.save(next);
    return next;
  };
}
