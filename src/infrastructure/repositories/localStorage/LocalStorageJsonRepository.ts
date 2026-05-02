import type { CrudRepository } from "@/infrastructure/repositories/contracts";

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export class LocalStorageJsonRepository<TEntity extends { id: string | number }>
  implements CrudRepository<TEntity>
{
  constructor(private readonly storageKey: string, private readonly seedData: TEntity[] = []) {}

  private read(): TEntity[] {
    return safeParse<TEntity[]>(localStorage.getItem(this.storageKey), this.seedData);
  }

  private write(items: TEntity[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  getAll(): TEntity[] {
    return this.read();
  }

  getById(id: TEntity["id"]): TEntity | undefined {
    return this.read().find((item) => item.id === id);
  }

  add(entity: TEntity): void {
    const items = this.read();
    this.write([entity, ...items]);
  }

  update(id: TEntity["id"], updates: Partial<TEntity>): void {
    const items = this.read().map((item) => (item.id === id ? { ...item, ...updates } : item));
    this.write(items);
  }

  remove(id: TEntity["id"]): void {
    const items = this.read().filter((item) => item.id !== id);
    this.write(items);
  }

  replaceAll(items: TEntity[]): void {
    this.write(items);
  }
}
