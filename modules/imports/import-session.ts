export type ImportChange<T> = {
  key: string;
  before: T | null;
  after: T;
};

export type AppliedImport<T> = {
  batchId: string;
  appliedAt: string;
  changes: ImportChange<T>[];
};

export function applyImport<T>(
  existing: Map<string, T>,
  incoming: Map<string, T>,
  batchId: string,
  appliedAt = new Date(),
): { records: Map<string, T>; batch: AppliedImport<T> } {
  if (!batchId.trim()) throw new Error("IMPORT_BATCH_ID_REQUIRED");
  const records = new Map(existing);
  const changes: ImportChange<T>[] = [];
  for (const [key, after] of incoming) {
    changes.push({ key, before: records.get(key) ?? null, after });
    records.set(key, after);
  }
  return {
    records,
    batch: { batchId, appliedAt: appliedAt.toISOString(), changes },
  };
}

export function rollbackImport<T>(
  current: Map<string, T>,
  batch: AppliedImport<T>,
): Map<string, T> {
  const records = new Map(current);
  for (const change of [...batch.changes].reverse()) {
    if (change.before == null) records.delete(change.key);
    else records.set(change.key, change.before);
  }
  return records;
}
