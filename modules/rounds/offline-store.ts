export type OfflineHoleScore = {
  strokes: number;
  penalties: number;
  updatedAt: string;
};

export type PendingScoreMutation = OfflineHoleScore & {
  holeNumber: number;
  clientMutationId: string;
};

export type OfflineRoundState = {
  schemaVersion: 2;
  eventId: string;
  ownerScope: string;
  roundId: string | null;
  serverVersion: number;
  scores: Array<OfflineHoleScore | null>;
  pending: PendingScoreMutation[];
  updatedAt: string;
  lastSyncedAt: string | null;
};

const databaseName = "flightforge-offline";
const storeName = "active-rounds";
const localPrefix = "flightforge:round:v2:";
const legacyPrefix = "flightforge:round:v1:";
const memoryFallback = new Map<string, OfflineRoundState>();
const writeChains = new Map<string, Promise<void>>();

export function offlineRoundKey(eventId: string, ownerScope: string): string {
  return `${localPrefix}${encodeURIComponent(ownerScope)}:${eventId}`;
}

export async function readOfflineRound(eventId: string, ownerScope: string): Promise<OfflineRoundState | null> {
  const key = offlineRoundKey(eventId, ownerScope);
  let indexedRecord: OfflineRoundState | null = null;
  try {
    const database = await openDatabase();
    const stored = await requestResult<unknown>(database.transaction(storeName, "readonly").objectStore(storeName).get(key));
    database.close();
    indexedRecord = validateOfflineRound(stored, eventId, ownerScope);
  } catch {
    // IndexedDB can be unavailable in private browsing or after a storage denial.
  }

  const local = readLocalStorage(key, eventId, ownerScope) ?? (ownerScope === "guest" ? readLegacyLocalStorage(eventId) : null);
  const memory = memoryFallback.get(key) ?? null;
  return newestRecord(indexedRecord, local, memory);
}

export async function writeOfflineRound(state: OfflineRoundState): Promise<void> {
  const key = offlineRoundKey(state.eventId, state.ownerScope);
  const previous = writeChains.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(async () => {
    memoryFallback.set(key, state);
    // Keep a synchronous journal until IndexedDB confirms its durable write.
    safeLocalStorageSet(key, JSON.stringify(state));
    try {
      const database = await openDatabase();
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(state, key);
      await transactionComplete(transaction);
      database.close();
      safeLocalStorageRemove(key);
      if (state.ownerScope === "guest") safeLocalStorageRemove(`${legacyPrefix}${state.eventId}`);
      return;
    } catch {
      // The localStorage journal remains as the durable fallback.
    }
  });
  writeChains.set(key, next);
  await next;
  if (writeChains.get(key) === next) writeChains.delete(key);
}

export async function removeOfflineRound(eventId: string, ownerScope: string): Promise<void> {
  const key = offlineRoundKey(eventId, ownerScope);
  memoryFallback.delete(key);
  safeLocalStorageRemove(key);
  if (ownerScope === "guest") safeLocalStorageRemove(`${legacyPrefix}${eventId}`);
  try {
    const database = await openDatabase();
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(key);
    await transactionComplete(transaction);
    database.close();
  } catch {
    // Removing the browser fallback is sufficient when IndexedDB is unavailable.
  }
}

export function validateOfflineRound(value: unknown, eventId: string, ownerScope: string): OfflineRoundState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<OfflineRoundState>;
  if (!ownerScope || candidate.schemaVersion !== 2 || candidate.eventId !== eventId || candidate.ownerScope !== ownerScope) return null;
  if (!Array.isArray(candidate.scores) || !Array.isArray(candidate.pending)) return null;
  if (!Number.isInteger(candidate.serverVersion) || (candidate.serverVersion ?? -1) < 0) return null;
  if (!candidate.scores.every((score) => score === null || isScore(score))) return null;
  if (!candidate.pending.every(isPendingMutation)) return null;
  if (!isIsoDate(candidate.updatedAt) || (candidate.lastSyncedAt !== null && !isIsoDate(candidate.lastSyncedAt))) return null;
  return candidate as OfflineRoundState;
}

function readLegacyLocalStorage(eventId: string): OfflineRoundState | null {
  const raw = safeLocalStorageGet(`${legacyPrefix}${eventId}`);
  if (!raw) return null;
  try {
    const legacy = JSON.parse(raw) as {
      version?: number;
      scores?: Array<{ strokes?: number; penalties?: number } | null>;
      pending?: Array<{ holeNumber?: number; strokes?: number; penalties?: number; clientMutationId?: string }>;
      updatedAt?: string;
    };
    const updatedAt = isIsoDate(legacy.updatedAt) ? legacy.updatedAt : new Date().toISOString();
    if (legacy.version !== 1 || !Array.isArray(legacy.scores) || !Array.isArray(legacy.pending)) return null;
    const scores = legacy.scores.map((score) => score && isFiniteScore(score.strokes, score.penalties)
      ? { strokes: score.strokes!, penalties: score.penalties!, updatedAt }
      : null);
    const pending = legacy.pending.flatMap((mutation) =>
      Number.isInteger(mutation.holeNumber) && typeof mutation.clientMutationId === "string" && isFiniteScore(mutation.strokes, mutation.penalties)
        ? [{ holeNumber: mutation.holeNumber!, strokes: mutation.strokes!, penalties: mutation.penalties!, clientMutationId: mutation.clientMutationId, updatedAt }]
        : [],
    );
    return { schemaVersion: 2, eventId, ownerScope: "guest", roundId: null, serverVersion: 0, scores, pending, updatedAt, lastSyncedAt: null };
  } catch {
    safeLocalStorageRemove(`${legacyPrefix}${eventId}`);
    return null;
  }
}

function readLocalStorage(key: string, eventId: string, ownerScope: string): OfflineRoundState | null {
  const raw = safeLocalStorageGet(key);
  if (!raw) return null;
  try {
    const validated = validateOfflineRound(JSON.parse(raw) as unknown, eventId, ownerScope);
    if (!validated) safeLocalStorageRemove(key);
    return validated;
  } catch {
    safeLocalStorageRemove(key);
    return null;
  }
}

function isPendingMutation(value: unknown): value is PendingScoreMutation {
  if (!isScore(value)) return false;
  const candidate = value as Partial<PendingScoreMutation>;
  return Number.isInteger(candidate.holeNumber) && (candidate.holeNumber ?? 0) > 0
    && typeof candidate.clientMutationId === "string" && candidate.clientMutationId.length >= 8;
}

function isScore(value: unknown): value is OfflineHoleScore {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OfflineHoleScore>;
  return isFiniteScore(candidate.strokes, candidate.penalties) && isIsoDate(candidate.updatedAt);
}

function isFiniteScore(strokes: unknown, penalties: unknown): strokes is number {
  return Number.isInteger(strokes) && Number(strokes) >= 1 && Number(strokes) <= 99
    && Number.isInteger(penalties) && Number(penalties) >= 0 && Number(penalties) <= 20;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function newestRecord(...records: Array<OfflineRoundState | null>): OfflineRoundState | null {
  return records.reduce<OfflineRoundState | null>((newest, record) => {
    if (!record) return newest;
    if (!newest || Date.parse(record.updatedAt) >= Date.parse(newest.updatedAt)) return record;
    return newest;
  }, null);
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("INDEXED_DB_UNAVAILABLE"));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("INDEXED_DB_OPEN_FAILED"));
    request.onblocked = () => reject(new Error("INDEXED_DB_BLOCKED"));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("INDEXED_DB_REQUEST_FAILED"));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("INDEXED_DB_TRANSACTION_FAILED"));
    transaction.onabort = () => reject(transaction.error ?? new Error("INDEXED_DB_TRANSACTION_ABORTED"));
  });
}

function safeLocalStorageGet(key: string): string | null {
  try { return typeof localStorage === "undefined" ? null : localStorage.getItem(key); }
  catch { return null; }
}

function safeLocalStorageSet(key: string, value: string): void {
  try { if (typeof localStorage !== "undefined") localStorage.setItem(key, value); }
  catch { /* The in-memory fallback still preserves this tab's round. */ }
}

function safeLocalStorageRemove(key: string): void {
  try { if (typeof localStorage !== "undefined") localStorage.removeItem(key); }
  catch { /* Storage access can be denied without breaking scoring. */ }
}
