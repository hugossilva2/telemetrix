/**
 * Wrapper mínimo de IndexedDB usado pelo modo offline-first.
 * Guarda operações pendentes (viagens, eventos) até haver conexão.
 */
const DB_NAME = "telemetrix-offline";
const DB_VERSION = 1;
export const STORE_QUEUE = "queue";

let dbPromise: Promise<IDBDatabase> | null = null;

export function isIdbAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  if (!isIdbAvailable()) return Promise.reject(new Error("IndexedDB indisponível"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Falha ao abrir IndexedDB"));
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_QUEUE, mode);
        const request = run(transaction.objectStore(STORE_QUEUE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Erro no IndexedDB"));
      }),
  );
}

export const idb = {
  put: <T>(value: T) => tx("readwrite", (s) => s.put(value as unknown as never)),
  delete: (id: string) => tx("readwrite", (s) => s.delete(id)),
  clear: () => tx("readwrite", (s) => s.clear()),
  all: <T>() => tx<T[]>("readonly", (s) => s.getAll() as IDBRequest<T[]>),
};
