import { detectContext, type SnContext } from './context';
import { deepQueryAll, isVisible, setNativeValue } from './dom';

export type JournalKind = 'work_notes' | 'comments';

export interface InsertResult {
  kind: JournalKind;
  ok: boolean;
  method: 'g_form' | 'dom' | 'none';
  message: string;
}

export interface InsertOptions {
  mode: 'append' | 'replace';
  selectors: { work_notes: string[]; comments: string[] };
  /** Field names to try with g_form (defaults to the journal name). */
  fieldNames?: { work_notes?: string[]; comments?: string[] };
}

const LABELS: Record<JournalKind, RegExp> = {
  work_notes: /work\s*notes?|werknotitie|interne notitie/i,
  comments: /additional\s*comments|customer\s*visible|aanvullende\s*opmerking|opmerkingen\s*\(klant/i,
};

const combine = (existing: string, text: string, mode: 'append' | 'replace') =>
  mode === 'append' && existing.trim() ? `${existing.replace(/\s+$/, '')}\n\n${text}` : text;

function tryGForm(ctx: SnContext, kind: JournalKind, text: string, opts: InsertOptions): InsertResult | null {
  const g = ctx.gForm;
  if (!g) return null;
  const names = opts.fieldNames?.[kind]?.length ? opts.fieldNames[kind]! : [kind];
  for (const f of names) {
    let has = false;
    try {
      has = typeof g.hasField === 'function' ? g.hasField(f) : !!g.getControl?.(f);
    } catch {
      /* ignore */
    }
    if (!has) continue;
    try {
      const next = combine(String(g.getValue(f) || ''), text, opts.mode);
      g.setValue(f, next);
      // Keep the visible UI16 activity-stream textarea in sync (it is Angular-bound).
      syncVisibleTextarea(ctx, kind, next, opts);
      const now = String(g.getValue(f) || '');
      if (now.replace(/\r/g, '') === next.replace(/\r/g, '')) {
        return { kind, ok: true, method: 'g_form', message: 'Filled in. Review the ticket and click Save.' };
      }
    } catch (e) {
      return { kind, ok: false, method: 'g_form', message: 'ServiceNow did not accept the text.' };
    }
  }
  return null;
}

function candidateTextareas(ctx: SnContext, kind: JournalKind, opts: InsertOptions): HTMLTextAreaElement[] {
  const roots: ParentNode[] = [];
  try {
    if (ctx.formWin) roots.push(ctx.formWin.document);
  } catch {
    /* ignore */
  }
  roots.push(document);
  const found: HTMLTextAreaElement[] = [];
  for (const raw of opts.selectors[kind]) {
    const sel = ctx.table ? raw.replace(/\{table\}/g, ctx.table) : raw.replace(/\{table\}/g, '*');
    for (const r of roots) {
      for (const el of deepQueryAll<HTMLTextAreaElement>(r, sel, 10)) {
        if (el.tagName === 'TEXTAREA' && !found.includes(el)) found.push(el);
      }
    }
  }
  return found;
}

function syncVisibleTextarea(ctx: SnContext, kind: JournalKind, value: string, opts: InsertOptions) {
  for (const ta of candidateTextareas(ctx, kind, opts)) {
    if (isVisible(ta) && ta.value !== value) {
      try {
        setNativeValue(ta, value);
      } catch {
        /* ignore */
      }
    }
  }
}

function labelOf(el: HTMLTextAreaElement): string {
  return [el.getAttribute('aria-label'), el.getAttribute('placeholder'), el.id, el.name, el.closest('[label]')?.getAttribute('label')]
    .filter(Boolean)
    .join(' ');
}

function tryDom(ctx: SnContext, kind: JournalKind, text: string, opts: InsertOptions): InsertResult | null {
  const tas = candidateTextareas(ctx, kind, opts).filter((t) => isVisible(t) && !t.disabled && !t.readOnly);
  // Prefer elements whose label really matches the requested journal.
  tas.sort((a, b) => Number(LABELS[kind].test(labelOf(b))) - Number(LABELS[kind].test(labelOf(a))));
  const ta = tas[0];
  if (!ta) return null;
  const next = combine(ta.value, text, opts.mode);
  setNativeValue(ta, next);
  if (ta.value === next) {
    return { kind, ok: true, method: 'dom', message: 'Filled in. Review the ticket and click Save.' };
  }
  return { kind, ok: false, method: 'dom', message: 'ServiceNow did not accept the text.' };
}

/** Detects Workspace's single compose box that toggles between work notes and comments. */
function otherJournalVisible(ctx: SnContext, kind: JournalKind, opts: InsertOptions): boolean {
  const other: JournalKind = kind === 'work_notes' ? 'comments' : 'work_notes';
  return candidateTextareas(ctx, other, opts).some((t) => isVisible(t));
}

/**
 * Populates the ServiceNow journal field. Never submits, saves or clicks
 * anything — the technician reviews and saves the ticket.
 */
export function insertJournal(kind: JournalKind, text: string, opts: InsertOptions, ctx: SnContext = detectContext()): InsertResult {
  if (!text.trim()) return { kind, ok: false, method: 'none', message: 'Nothing to insert yet.' };
  const g = tryGForm(ctx, kind, text, opts);
  if (g?.ok) return g;
  const d = tryDom(ctx, kind, text, opts);
  if (d?.ok) return d;
  if (otherJournalVisible(ctx, kind, opts)) {
    return {
      kind,
      ok: false,
      method: 'none',
      message:
        kind === 'comments'
          ? 'In the ticket, switch the reply box to "Additional comments (Customer visible)" and try again — or paste the text with Ctrl+V.'
          : 'In the ticket, switch the reply box to "Work notes" and try again — or paste the text with Ctrl+V.',
    };
  }
  return g || d || { kind, ok: false, method: 'none', message: 'The notes field could not be found on this page. Open the ticket form and try again — or paste the text with Ctrl+V.' };
}
