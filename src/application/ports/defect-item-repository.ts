import type { DefectItem, DefectItemId } from "@/domain/defect/defect-item";

export interface DefectItemRepository {
  save(item: DefectItem): Promise<void>;
  findById(id: DefectItemId): Promise<DefectItem | null>;
  /** All defect warehouse items, newest first. */
  list(): Promise<readonly DefectItem[]>;
}
