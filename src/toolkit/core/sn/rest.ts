/**
 * Thin client for the ServiceNow REST Table API using the *current* browser
 * session (same-origin cookies + the page's g_ck CSRF token). All requests are
 * same-origin, read-only (GET) and subject to the user's own ACLs.
 */
export class SnRestError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type DisplayAll = Record<string, { value: string; display_value: string } | string>;

export class SnRest {
  constructor(private origin: string, private gck: string | null) {}

  get available() {
    return true;
  }

  async get<T = any>(path: string, params: Record<string, string | number | boolean> = {}, timeoutMs = 12000): Promise<T> {
    const qs = Object.keys(params)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`)
      .join('&');
    const url = `${this.origin}${path}${qs ? '?' + qs : ''}`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.gck) headers['X-UserToken'] = this.gck;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const res = await fetch(url, { method: 'GET', credentials: 'same-origin', headers, signal: ctrl?.signal });
      if (!res.ok) {
        let msg = res.statusText;
        try {
          const j = await res.json();
          msg = j?.error?.message || msg;
        } catch {
          /* ignore */
        }
        throw new SnRestError(res.status, `${res.status} ${msg}`);
      }
      const j = await res.json();
      return j.result as T;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  record(table: string, sysId: string, fields?: string[]) {
    const p: Record<string, string> = { sysparm_display_value: 'all', sysparm_exclude_reference_link: 'true' };
    if (fields?.length) p.sysparm_fields = fields.join(',');
    return this.get<DisplayAll>(`/api/now/table/${encodeURIComponent(table)}/${sysId}`, p);
  }

  query<T = Record<string, string>>(table: string, query: string, fields: string[], limit = 20, displayValue: 'true' | 'false' | 'all' = 'true') {
    return this.get<T[]>(`/api/now/table/${encodeURIComponent(table)}`, {
      sysparm_query: query,
      sysparm_fields: fields.join(','),
      sysparm_limit: limit,
      sysparm_display_value: displayValue,
      sysparm_exclude_reference_link: 'true',
    });
  }
}

export function dv(rec: DisplayAll | undefined, field: string): { value: string; display: string } {
  const f = rec?.[field];
  if (f == null) return { value: '', display: '' };
  if (typeof f === 'string') return { value: f, display: f };
  return { value: f.value ?? '', display: f.display_value ?? f.value ?? '' };
}
