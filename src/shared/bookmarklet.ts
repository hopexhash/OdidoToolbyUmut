/**
 * Bookmarklet generator. The bookmarklet is deliberately tiny (< 1 KB):
 *  1. checks location.hostname against the domains embedded at install time
 *     (nothing is loaded on any other website),
 *  2. hands over boot info in window.__SNTK_BOOT,
 *  3. injects loader.js (always fetched fresh), which loads the versioned,
 *     immutable toolkit bundle.
 */
export const BOOKMARKLET_PROTOCOL = 2;

export const DEFAULT_DOMAINS = ['*.service-now.com', '*.servicenowservices.com'];

function normalizeBase(base: string): string {
  return base.endsWith('/') ? base : base + '/';
}

export function normalizeDomains(input: string[]): string[] {
  const out: string[] = [];
  for (const raw of input) {
    let d = raw.trim().toLowerCase();
    if (!d) continue;
    d = d.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!/^(\*\.)?[a-z0-9.-]+$/.test(d)) continue;
    if (!out.includes(d)) out.push(d);
  }
  return out;
}

export interface BookmarkletOptions {
  /**
   * CSP fallback: name of a ServiceNow UI Script that contains toolkit.latest.js.
   * The bookmarklet then loads /<name>.jsdbx from the instance itself (same origin).
   */
  uiScript?: string;
}

export function buildBookmarklet(baseUrl: string, domains: string[], opts: BookmarkletOptions = {}): string {
  const base = normalizeBase(baseUrl);
  const list = normalizeDomains(domains);
  const ui = (opts.uiScript || '').replace(/[^A-Za-z0-9_.-]/g, '');
  const src = ui ? `'/${ui}.jsdbx?t='+Date.now()` : `${JSON.stringify(base)}+'loader.js?t='+Date.now()`;
  const code =
    `(function(){` +
    `var h=location.hostname.toLowerCase(),a=${JSON.stringify(list)},ok=false,i,d;` +
    `for(i=0;i<a.length;i++){d=a[i];if(d===h||(d.charAt(0)==='*'&&h.slice(-(d.length-1))===d.slice(1)))ok=true}` +
    `if(!ok){alert('ITSM Toolkit: '+h+' is not an authorized ServiceNow instance.');return}` +
    `window.__SNTK_BOOT={base:${JSON.stringify(base)},bv:${BOOKMARKLET_PROTOCOL},domains:a};` +
    `var s=document.createElement('script');s.src=${src};` +
    `s.onerror=function(){alert('ITSM Toolkit could not be loaded from '+${JSON.stringify(base)}+'. The host may be unreachable or this page blocks external scripts (Content-Security-Policy).')};` +
    `(document.head||document.documentElement).appendChild(s)` +
    `})();void 0`;
  return 'javascript:' + code;
}
