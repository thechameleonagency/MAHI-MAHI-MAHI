/**
 * ER6 — serialize warehouse inventory commands so rapid vendor-bill / UI clicks
 * cannot interleave reads/writes on the same stock snapshot.
 */
let movementChain: Promise<unknown> = Promise.resolve();

export function enqueueWarehouseMovement<T>(task: () => Promise<T>): Promise<T> {
  const run = movementChain.then(task, task);
  movementChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Test-only: reset queue between cases. */
export function resetWarehouseMovementQueueForTests(): void {
  movementChain = Promise.resolve();
}
