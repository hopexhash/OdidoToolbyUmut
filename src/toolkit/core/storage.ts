import { safeParse, safeStringify } from './safeJson';

/**
 * Persistent storage lives in the ServiceNow origin's localStorage under a
 * dedicated prefix. Only settings, templates, window geometry and a small,
 * optional recent-ticket list are persisted. Per-ticket drafts use
 * sessionStorage (cleared when the browser session ends).
 */
const PREFIX = 'itsmtk.v1.';

function ls(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
function ss(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export const storage = {
  get<T>(key: string, fallback: T): T {
    return safeParse<T>(ls()?.getItem(PREFIX + key), fallback);
  },
  set(key: string, value: unknown) {
    try {
      ls()?.setItem(PREFIX + key, safeStringify(value));
    } catch {
      /* quota / disabled */
    }
  },
  remove(key: string) {
    try {
      ls()?.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  },
  session: {
    get<T>(key: string, fallback: T): T {
      return safeParse<T>(ss()?.getItem(PREFIX + key), fallback);
    },
    set(key: string, value: unknown) {
      try {
        ss()?.setItem(PREFIX + key, safeStringify(value));
      } catch {
        /* ignore */
      }
    },
    remove(key: string) {
      try {
        ss()?.removeItem(PREFIX + key);
      } catch {
        /* ignore */
      }
    },
  },
  /** Removes every key written by the toolkit (both storages). */
  clearAll() {
    for (const s of [ls(), ss()]) {
      if (!s) continue;
      const keys: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k && k.startsWith(PREFIX)) keys.push(k);
      }
      keys.forEach((k) => s.removeItem(k));
    }
  },
};
