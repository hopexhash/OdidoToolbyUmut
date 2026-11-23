/**
 * ServiceNow's classic UI loads Prototype.js, which historically patches
 * Array.prototype.toJSON and breaks native JSON.stringify for arrays.
 * All toolkit serialization goes through this helper.
 */
export function safeStringify(value: unknown, space?: number): string {
  const ap = Array.prototype as unknown as { toJSON?: unknown };
  const saved = ap.toJSON;
  if (saved !== undefined) delete ap.toJSON;
  try {
    return JSON.stringify(value, null, space);
  } finally {
    if (saved !== undefined) ap.toJSON = saved;
  }
}

export function safeParse<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
