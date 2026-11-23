import { FIELD_DEFS, GENERIC_DOM_PATTERNS, type FieldKey, type FieldMap } from '../fields';
import { detectContext, type GlideForm, type SnContext, type UiKind } from './context';
import { deepQuery, deepQueryAll, readElementValue } from './dom';
import { dv, SnRest, SnRestError, type DisplayAll } from './rest';

export type ValueSource = 'g_form' | 'rest' | 'dom' | 'title' | 'user';

export interface FieldValue {
  value: string;
  display: string;
  source: ValueSource;
  snField?: string;
}

export interface SlaInfo {
  name: string;
  stage: string;
  breached: boolean;
  due: string;
  percentage: number;
  timeLeft: string;
}

export interface UserInfo {
  sysId: string;
  name: string;
  firstName: string;
  email: string;
  phone: string;
  mobile: string;
  userName: string;
  department: string;
  location: string;
  title: string;
  vip: boolean;
}

export interface TicketSnapshot {
  kind: UiKind;
  table: string | null;
  sysId: string | null;
  hasGForm: boolean;
  hasToken: boolean;
  /** Session CSRF token (kept in memory only, never persisted). */
  gck: string | null;
  url: string;
  sessionUser: string | null;
  fields: Partial<Record<FieldKey, FieldValue>>;
  user: UserInfo | null;
  sla: SlaInfo[];
  warnings: string[];
  sources: ValueSource[];
  scannedAt: number;
}

export interface ExtractOptions {
  fieldMap: FieldMap;
  useRest: boolean;
}

function candidates(key: FieldKey, map: FieldMap): string[] {
  const def = FIELD_DEFS.find((d) => d.key === key)!;
  const custom = map[key]?.fields?.filter(Boolean);
  return custom && custom.length ? custom : def.fields;
}

function gFormHas(g: GlideForm, field: string): boolean {
  try {
    if (typeof g.hasField === 'function') return g.hasField(field);
    if (typeof g.getControl === 'function') return !!g.getControl(field);
  } catch {
    /* ignore */
  }
  return false;
}

function gFormRead(g: GlideForm, field: string, reference: boolean): { value: string; display: string } {
  const value = String(g.getValue(field) ?? '');
  let display = value;
  try {
    if (reference && g.getDisplayBox) {
      const box = g.getDisplayBox(field);
      if (box && box.value) display = box.value;
    } else {
      const ctl = g.getControl?.(field) as HTMLSelectElement | null;
      if (ctl && ctl.tagName === 'SELECT' && ctl.selectedIndex >= 0) display = ctl.options[ctl.selectedIndex].text;
      else if (g.getOption) {
        const opt = g.getOption(field, value);
        if (opt?.text) display = opt.text;
      }
    }
  } catch {
    /* ignore */
  }
  return { value, display: display || value };
}

function domRead(ctx: SnContext, key: FieldKey, map: FieldMap): FieldValue | null {
  const roots: ParentNode[] = [];
  try {
    if (ctx.formWin) roots.push(ctx.formWin.document);
  } catch {
    /* ignore */
  }
  roots.push(document);
  const selectors = [...(map[key]?.selectors || [])];
  if (ctx.table) {
    for (const f of candidates(key, map)) {
      for (const p of GENERIC_DOM_PATTERNS) selectors.push(p.replace('{table}', ctx.table).replace('{field}', f));
    }
  }
  for (const sel of selectors) {
    const s = ctx.table ? sel.replace(/\{table\}/g, ctx.table) : sel;
    for (const r of roots) {
      const el = deepQuery(r, s);
      if (el) {
        const v = readElementValue(el);
        if (v) return { value: v, display: v, source: 'dom', snField: s };
      }
    }
  }
  return null;
}

async function loadUser(rest: SnRest, sysId: string): Promise<UserInfo | null> {
  const r = await rest.record('sys_user', sysId, [
    'sys_id', 'name', 'first_name', 'email', 'phone', 'mobile_phone', 'user_name', 'department', 'location', 'title', 'vip',
  ]);
  return {
    sysId,
    name: dv(r, 'name').display,
    firstName: dv(r, 'first_name').display,
    email: dv(r, 'email').display,
    phone: dv(r, 'phone').display,
    mobile: dv(r, 'mobile_phone').display,
    userName: dv(r, 'user_name').display,
    department: dv(r, 'department').display,
    location: dv(r, 'location').display,
    title: dv(r, 'title').display,
    vip: dv(r, 'vip').value === 'true',
  };
}

async function loadSla(rest: SnRest, sysId: string): Promise<SlaInfo[]> {
  const rows = await rest.query<Record<string, string>>(
    'task_sla',
    `task=${sysId}^ORDERBYDESCsys_created_on`,
    ['sla', 'stage', 'has_breached', 'planned_end_time', 'percentage', 'business_percentage', 'business_time_left', 'time_left'],
    10,
  );
  return rows.map((r) => ({
    name: r.sla || 'SLA',
    stage: r.stage || '',
    breached: r.has_breached === 'true' || r.has_breached === 'Yes' || r.has_breached === 'Ja',
    due: r.planned_end_time || '',
    percentage: parseFloat(String(r.business_percentage || r.percentage || '0').replace(',', '.')) || 0,
    timeLeft: r.business_time_left || r.time_left || '',
  }));
}

/**
 * Scans the current ServiceNow page and returns everything we could find about
 * the active ticket. Strategy (each layer only fills what earlier layers missed):
 *   1. GlideForm (classic UI, also inside Next Experience's gsft_main iframe) – live, includes unsaved edits
 *   2. REST Table API with the session token – works in Workspaces, adds journals, user details, SLAs
 *   3. Configurable DOM selectors – for locked-down instances where REST is blocked
 */
export async function extractTicket(opts: ExtractOptions, ctx: SnContext = detectContext()): Promise<TicketSnapshot> {
  const snap: TicketSnapshot = {
    kind: ctx.kind,
    table: ctx.table,
    sysId: ctx.sysId,
    hasGForm: !!ctx.gForm,
    hasToken: !!ctx.gck,
    gck: ctx.gck,
    url: location.href,
    sessionUser: ctx.userName,
    fields: {},
    user: null,
    sla: [],
    warnings: [],
    sources: [],
    scannedAt: Date.now(),
  };
  const addSource = (s: ValueSource) => {
    if (!snap.sources.includes(s)) snap.sources.push(s);
  };

  // 1) GlideForm
  if (ctx.gForm) {
    for (const def of FIELD_DEFS) {
      if (def.journal) continue;
      for (const f of candidates(def.key, opts.fieldMap)) {
        if (!gFormHas(ctx.gForm, f)) continue;
        try {
          const r = gFormRead(ctx.gForm, f, !!def.reference);
          if (r.value || r.display) {
            snap.fields[def.key] = { ...r, source: 'g_form', snField: f };
            addSource('g_form');
            break;
          }
        } catch {
          /* ignore */
        }
      }
    }
  }

  // 2) REST
  let rest: SnRest | null = null;
  if (opts.useRest && ctx.table && ctx.sysId) {
    rest = new SnRest(location.origin, ctx.gck);
    try {
      const rec: DisplayAll = await rest.record(ctx.table, ctx.sysId);
      for (const def of FIELD_DEFS) {
        if (snap.fields[def.key] && !def.journal) continue;
        for (const f of candidates(def.key, opts.fieldMap)) {
          if (!(f in rec)) continue;
          const r = dv(rec, f);
          if (r.value || r.display) {
            snap.fields[def.key] = { value: r.value, display: r.display || r.value, source: 'rest', snField: f };
            addSource('rest');
            break;
          }
        }
      }
    } catch (e) {
      const status = e instanceof SnRestError ? e.status : 0;
      snap.warnings.push(
        status === 401 || status === 403
          ? 'Some details could not be loaded because your ServiceNow account has limited access. The basic ticket information is still available.'
          : 'Some details could not be loaded from ServiceNow. The basic ticket information is still available.',
      );
      rest = null;
    }
  } else if (!ctx.sysId) {
    snap.warnings.push('No saved ticket was found on this page. Open an existing ticket and click the refresh button.');
  }

  // 3) DOM selectors
  for (const def of FIELD_DEFS) {
    if (snap.fields[def.key] || def.journal) continue;
    const r = domRead(ctx, def.key, opts.fieldMap);
    if (r) {
      snap.fields[def.key] = r;
      addSource('dom');
    }
  }
  if (!snap.fields.number && ctx.titleNumber) {
    snap.fields.number = { value: ctx.titleNumber, display: ctx.titleNumber, source: 'title' };
    addSource('title');
  }

  // Journal history fallback (classic activity stream) when REST was not available
  if (!snap.fields.work_notes && !snap.fields.comments && ctx.formWin) {
    try {
      const entries = deepQueryAll(ctx.formWin.document, 'li.h-card, .activity-stream-item, .sn-widget-list-item', 15)
        .map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      if (entries.length) {
        const text = entries.join('\n\n');
        snap.fields.work_notes = { value: text, display: text, source: 'dom', snField: 'activity stream' };
      }
    } catch {
      /* ignore */
    }
  }

  // Related data via REST: affected user details + SLAs
  if (rest && ctx.sysId) {
    const userRef = snap.fields.affected_user || snap.fields.caller;
    const userId = userRef && /^[0-9a-f]{32}$/.test(userRef.value) ? userRef.value : null;
    const [u, sla] = await Promise.allSettled([userId ? loadUser(rest, userId) : Promise.resolve(null), loadSla(rest, ctx.sysId)]);
    if (u.status === 'fulfilled' && u.value) {
      snap.user = u.value;
      addSource('user');
      if (!snap.fields.phone && (u.value.mobile || u.value.phone)) {
        const p = u.value.mobile || u.value.phone;
        snap.fields.phone = { value: p, display: p, source: 'user', snField: u.value.mobile ? 'sys_user.mobile_phone' : 'sys_user.phone' };
      }
      if (!snap.fields.email && u.value.email) {
        snap.fields.email = { value: u.value.email, display: u.value.email, source: 'user', snField: 'sys_user.email' };
      }
    }
    if (sla.status === 'fulfilled') snap.sla = sla.value;
  }

  if (!snap.fields.number) snap.warnings.push('The ticket number could not be found. You can type the details yourself, or ask your admin to check Settings → Field mapping.');
  return snap;
}
