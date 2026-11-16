/**
 * Preparación del entorno de pruebas.
 *
 * <p>Node 22+ expone un `localStorage` experimental en `globalThis` que, sin el flag
 * `--localstorage-file`, devuelve `undefined` y pisa la implementación de jsdom que
 * vitest instala. En ese caso se restaura un almacenamiento en memoria con la misma
 * interfaz, de modo que las pruebas que usan `localStorage` y `sessionStorage`
 * sigan teniendo un comportamiento de navegador.
 */

interface MemoryStorage extends Storage {
  [name: string]: unknown;
}

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  const storage: MemoryStorage = {
    get length() {
      return values.size;
    },
    key(index: number): string | null {
      return [...values.keys()][index] ?? null;
    },
    getItem(name: string): string | null {
      return values.has(String(name)) ? values.get(String(name))! : null;
    },
    setItem(name: string, value: string): void {
      values.set(String(name), String(value));
    },
    removeItem(name: string): void {
      values.delete(String(name));
    },
    clear(): void {
      values.clear();
    }
  } as MemoryStorage;
  return storage;
}

function install(name: 'localStorage' | 'sessionStorage'): void {
  const target = globalThis as unknown as Record<string, unknown>;
  const current = target[name] as Storage | undefined;
  if (current && typeof current.getItem === 'function') return;
  Object.defineProperty(globalThis, name, {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
    enumerable: false
  });
}

install('localStorage');
install('sessionStorage');
