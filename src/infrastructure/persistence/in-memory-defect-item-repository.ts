import type { DefectItemRepository } from "@/application/ports/defect-item-repository";
import type { DefectItem, DefectItemId } from "@/domain/defect/defect-item";

export class InMemoryDefectItemRepository implements DefectItemRepository {
  private readonly items = new Map<DefectItemId, DefectItem>();

  constructor(seed: readonly DefectItem[] = []) {
    for (const item of seed) {
      this.items.set(item.id, item);
    }
  }

  async save(item: DefectItem): Promise<void> {
    this.items.set(item.id, item);
  }

  async findById(id: DefectItemId): Promise<DefectItem | null> {
    return this.items.get(id) ?? null;
  }

  async list(): Promise<readonly DefectItem[]> {
    return [...this.items.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
