// Envoltura mínima de IndexedDB (sin dependencias) para el modo sin conexión de la gestión interna.
const NOMBRE = "technosoftware-gestion";
export type Almacen = "respuestas" | "tablas" | "cola" | "fallidas" | "meta";

let abierta: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB no disponible"));
  abierta ??= new Promise((ok, mal) => {
    const r = indexedDB.open(NOMBRE, 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const a of ["respuestas", "tablas", "meta"]) if (!d.objectStoreNames.contains(a)) d.createObjectStore(a);
      for (const a of ["cola", "fallidas"]) if (!d.objectStoreNames.contains(a)) d.createObjectStore(a, { keyPath: "n", autoIncrement: true });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => { abierta = null; mal(r.error); };
  });
  return abierta;
}

function op<T>(almacen: Almacen, modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return db().then((d) => new Promise<T>((ok, mal) => {
    const t = d.transaction(almacen, modo);
    const req = f(t.objectStore(almacen));
    t.oncomplete = () => ok(req.result as T);
    t.onerror = () => mal(t.error);
  }));
}

export const leer = <T>(a: Almacen, clave: IDBValidKey) => op<T | undefined>(a, "readonly", (s) => s.get(clave)).catch(() => undefined);
export const guardar = (a: Almacen, clave: IDBValidKey | undefined, valor: unknown) =>
  op(a, "readwrite", (s) => (clave === undefined ? s.put(valor) : s.put(valor, clave))).catch(() => undefined);
export const borrar = (a: Almacen, clave: IDBValidKey) => op(a, "readwrite", (s) => s.delete(clave)).catch(() => undefined);
export const todos = <T>(a: Almacen) => op<T[]>(a, "readonly", (s) => s.getAll()).catch(() => [] as T[]);
export const vaciar = (a: Almacen) => op(a, "readwrite", (s) => s.clear()).catch(() => undefined);

/** Borra todo lo guardado en el dispositivo (al cerrar sesión o cambiar de usuario). */
export async function borrarTodo() {
  await Promise.all((["respuestas", "tablas", "cola", "fallidas", "meta"] as Almacen[]).map(vaciar));
  if (typeof caches !== "undefined") for (const k of await caches.keys()) if (k.startsWith("ts-gestion")) await caches.delete(k);
}
