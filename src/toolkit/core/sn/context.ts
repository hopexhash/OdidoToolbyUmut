import { collectWindows, deepQuery } from './dom';

/** A minimal typing of the ServiceNow client-side GlideForm API we rely on. */
export interface GlideForm {
  getTableName(): string;
  getUniqueValue(): string;
  getValue(field: string): string;
  setValue(field: string, value: string, displayValue?: string): void;
  getControl?(field: string): HTMLElement | null;
  getDisplayBox?(field: string): HTMLInputElement | null;
  getOption?(field: string, value: string): HTMLOptionElement | null;
  hasField?(field: string): boolean;
  getElement?(field: string): HTMLElement | null;
  isNewRecord?(): boolean;
}

export type UiKind = 'classic' | 'next-experience' | 'workspace' | 'portal' | 'unknown';

export interface SnContext {
  kind: UiKind;
  /** Window that owns g_form (classic form, possibly inside gsft_main). */
  formWin: Window | null;
  gForm: GlideForm | null;
  table: string | null;
  sysId: string | null;
  /** Session CSRF token (g_ck) for the REST API, if exposed by the page. */
  gck: string | null;
  /** Logged-in user name (for default technician name). */
  userName: string | null;
  /** Document title-derived ticket number (last resort). */
  titleNumber: string | null;
  /** Stable signature used to detect ticket navigation. */
  signature: string;
}

const SYS_ID_RE = /^[0-9a-f]{32}$/;
const TICKET_RE = /\b(INC|RITM|REQ|SCTASK|TASK|CHG|CTASK|PRB|PTASK|CS|WO|WOT|IMS|HRC|SIR)\d{5,}\b/;

function hasGForm(w: Window): GlideForm | null {
  try {
    const g = (w as any).g_form as GlideForm | undefined;
    if (g && typeof g.getTableName === 'function' && typeof g.getValue === 'function') {
      const t = g.getTableName();
      if (t) return g;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Parses table + sys_id from a classic (incident.do?sys_id=), Polaris or Workspace URL. */
export function parseRecordUrl(href: string): { table: string; sysId: string } | null {
  let url = href;
  for (let i = 0; i < 3; i++) {
    try {
      const dec = decodeURIComponent(url);
      if (dec === url) break;
      url = dec;
    } catch {
      break;
    }
  }
  // Workspace / UI Builder: /now/sow/record/incident/<sys_id>, /now/cwf/agent/record/incident/<sys_id>
  let m = /\/record\/([a-z0-9_]+)\/([0-9a-f]{32})/i.exec(url);
  if (m) return { table: m[1], sysId: m[2].toLowerCase() };
  // Classic / Polaris: incident.do?sys_id=<sys_id>
  m = /\/([a-z0-9_]+)\.do\?(?:[^#]*&)?sys_id=([0-9a-f]{32}|-1)/i.exec(url);
  if (m && m[2] !== '-1') return { table: m[1], sysId: m[2].toLowerCase() };
  // Service Portal: ?id=ticket&table=incident&sys_id=...
  m = /[?&]table=([a-z0-9_]+)&(?:[^#]*&)?sys_id=([0-9a-f]{32})/i.exec(url);
  if (m) return { table: m[1], sysId: m[2].toLowerCase() };
  return null;
}

function findGck(wins: Window[]): string | null {
  for (const w of wins) {
    try {
      const anyW = w as any;
      const v = anyW.g_ck || anyW.NOW?.g_ck || anyW.NOW?.user?.token;
      if (typeof v === 'string' && v.length > 10) return v;
      const meta = w.document.querySelector('input[name="sysparm_ck"], #sysparm_ck') as HTMLInputElement | null;
      if (meta?.value) return meta.value;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function findUserName(wins: Window[]): string | null {
  for (const w of wins) {
    try {
      const anyW = w as any;
      const g = anyW.g_user;
      if (g && (g.fullName || g.firstName)) return g.fullName || `${g.firstName} ${g.lastName}`.trim();
      const n = anyW.NOW?.user?.fullName || anyW.NOW?.user_display_name;
      if (typeof n === 'string' && n) return n;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function detectContext(top: Window = window): SnContext {
  const wins = collectWindows(top);
  let formWin: Window | null = null;
  let gForm: GlideForm | null = null;
  // Prefer a form window that holds an existing record.
  for (const w of wins) {
    const g = hasGForm(w);
    if (!g) continue;
    let sid = '';
    try {
      sid = g.getUniqueValue();
    } catch {
      /* ignore */
    }
    if (!formWin || (sid && SYS_ID_RE.test(sid))) {
      formWin = w;
      gForm = g;
      if (sid && SYS_ID_RE.test(sid)) break;
    }
  }

  let table: string | null = null;
  let sysId: string | null = null;
  if (gForm) {
    try {
      table = gForm.getTableName();
      const sid = gForm.getUniqueValue();
      sysId = SYS_ID_RE.test(sid) ? sid : null;
    } catch {
      /* ignore */
    }
  }
  const hrefs: string[] = [];
  for (const w of wins) {
    try {
      hrefs.push(w.location.href);
    } catch {
      /* ignore */
    }
  }
  if (!sysId) {
    for (const h of hrefs) {
      const r = parseRecordUrl(h);
      if (r) {
        table = table || r.table;
        sysId = r.sysId;
        break;
      }
    }
  }

  const path = top.location.pathname;
  let kind: UiKind = 'unknown';
  if (/\/now\/(sow|cwf|workspace|[a-z-]+\/record)/.test(path) || /\/now\/[a-z0-9-]+\/[a-z0-9-]*\/?record\//.test(path)) kind = 'workspace';
  else if (path.startsWith('/now/nav/ui') || deepQuery(top.document, 'macroponent-f51912f4c700201072b211d4d8c26010, sn-polaris-layout')) kind = 'next-experience';
  else if (path === '/sp' || path.startsWith('/sp/') || /^\/[a-z_]+_?portal/.test(path)) kind = 'portal';
  else if (gForm || /\.do$/.test(path)) kind = 'classic';
  if (kind === 'unknown' && path.startsWith('/now/')) kind = 'next-experience';

  let titleNumber: string | null = null;
  for (const w of wins) {
    try {
      const m = TICKET_RE.exec(w.document.title);
      if (m) {
        titleNumber = m[0];
        break;
      }
    } catch {
      /* ignore */
    }
  }

  return {
    kind,
    formWin,
    gForm,
    table,
    sysId,
    gck: findGck(wins),
    userName: findUserName(wins),
    titleNumber,
    signature: `${table || ''}:${sysId || ''}:${hrefs.join('|')}`,
  };
}

let cachedFrame: HTMLIFrameElement | null = null;
let lastFrameLookup = 0;
function gsftFrame(top: Window): HTMLIFrameElement | null {
  if (cachedFrame && cachedFrame.isConnected) return cachedFrame;
  if (Date.now() - lastFrameLookup < 8000) return null;
  lastFrameLookup = Date.now();
  cachedFrame =
    (top.document.getElementById('gsft_main') as HTMLIFrameElement | null) ||
    deepQuery<HTMLIFrameElement>(top.document, 'iframe#gsft_main, iframe[name="gsft_main"]');
  return cachedFrame;
}

/** Cheap signature used by the auto-rescan poller (avoids full DOM traversal). */
export function quickSignature(top: Window = window): string {
  const parts = [top.location.href];
  try {
    const f = gsftFrame(top);
    if (f?.contentWindow) {
      parts.push(f.contentWindow.location.href);
      const g = (f.contentWindow as any).g_form;
      if (g?.getUniqueValue) parts.push(g.getUniqueValue());
    }
  } catch {
    /* ignore */
  }
  return parts.join('|');
}

export { TICKET_RE };
