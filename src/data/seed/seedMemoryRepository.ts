import type { CrudRepository } from "@/infrastructure/repositories/contracts";

/** In-memory CRUD repo for seed command runs (no localStorage side effects). */
export class SeedMemoryRepository<TEntity extends { id: string | number }> implements CrudRepository<TEntity> {
  private items: TEntity[] = [];

  constructor(initial: TEntity[] = []) {
    this.items = [...initial];
  }

  getAll(): TEntity[] {
    return [...this.items];
  }

  getById(id: TEntity["id"]): TEntity | undefined {
    return this.items.find((item) => item.id === id);
  }

  add(entity: TEntity): void {
    this.items = [entity, ...this.items.filter((item) => item.id !== entity.id)];
  }

  update(id: TEntity["id"], updates: Partial<TEntity>): void {
    this.items = this.items.map((item) => (item.id === id ? { ...item, ...updates } : item));
  }

  remove(id: TEntity["id"]): void {
    this.items = this.items.filter((item) => item.id !== id);
  }

  replaceAll(items: TEntity[]): void {
    this.items = [...items];
  }
}
