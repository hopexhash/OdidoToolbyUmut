import { create } from 'zustand';
import { emptyDraft, type Draft } from '../core/draft';
import { completion, generateComment, generateWorkNotes } from '../core/generator';
import { loadSettings, saveSettings, type Settings } from '../core/settings';
import { extractTicket, type TicketSnapshot } from '../core/sn/extract';
import { safeStringify } from '../core/safeJson';
import { storage } from '../core/storage';
import { DEFAULT_TEMPLATES } from '../core/templates/defaults';
import type { Template } from '../core/templates/engine';

export type TabId = 'ticket' | 'contact' | 'update' | 'recent' | 'advice' | 'assets' | 'hardware' | 'settings';

export interface RecentTicket {
  number: string;
  table: string;
  sysId: string;
  short: string;
  at: number;
}

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  text: string;
}

interface State {
  settings: Settings;
  templates: Template[];
  snapshot: TicketSnapshot | null;
  scanning: boolean;
  draftKey: string;
  draft: Draft;
  tab: TabId;
  recent: RecentTicket[];
  recentTemplates: string[];
  toasts: Toast[];

  setTab(t: TabId): void;
  updateSettings(patch: Partial<Settings>): void;
  rescan(): Promise<void>;
  patchDraft(fn: (d: Draft) => void): void;
  resetDraft(): void;
  setTemplates(list: Template[]): void;
  upsertTemplate(t: Template): void;
  deleteTemplate(id: string): void;
  selectTemplate(id: string | null): void;
  clearRecent(): void;
  toast(kind: Toast['kind'], text: string): void;
  dismissToast(id: number): void;
}

const loadTemplates = (): Template[] => storage.get<Template[] | null>('templates', null) || DEFAULT_TEMPLATES;
const draftKeyFor = (s: TicketSnapshot | null) => (s?.sysId || s?.fields.number?.value || 'manual');

let toastSeq = 0;
let draftTimer: number | undefined;

export const useStore = create<State>((set, get) => {
  const settings = loadSettings();
  return {
    settings,
    templates: loadTemplates(),
    snapshot: null,
    scanning: false,
    draftKey: 'manual',
    draft: emptyDraft(settings.language),
    tab: storage.get<TabId>('tab', 'ticket'),
    recent: storage.get<RecentTicket[]>('recent', []),
    recentTemplates: storage.get<string[]>('recentTemplates', []),
    toasts: [],

    setTab(t) {
      set({ tab: t });
      storage.set('tab', t);
    },

    updateSettings(patch) {
      const next = { ...get().settings, ...patch };
      saveSettings(next);
      set({ settings: next });
    },

    async rescan() {
      if (get().scanning) return;
      set({ scanning: true });
      try {
        const { settings } = get();
        const snap = await extractTicket({ fieldMap: settings.fieldMap, useRest: settings.useRestApi });
        const key = draftKeyFor(snap);
        const patch: Partial<State> = { snapshot: snap };
        if (key !== get().draftKey) {
          patch.draftKey = key;
          patch.draft = storage.session.get<Draft | null>(`draft.${key}`, null) || emptyDraft(settings.language);
        }
        // Recent tickets (number + short description only)
        if (settings.keepHistory && snap.fields.number && snap.sysId && snap.table) {
          const item: RecentTicket = {
            number: snap.fields.number.display,
            table: snap.table,
            sysId: snap.sysId,
            short: (snap.fields.short_description?.display || '').slice(0, 120),
            at: Date.now(),
          };
          const recent = [item, ...get().recent.filter((r) => r.sysId !== item.sysId)].slice(0, 15);
          storage.set('recent', recent);
          patch.recent = recent;
        }
        set(patch as State);
      } catch (e) {
        get().toast('error', `Scan failed: ${(e as Error).message}`);
      } finally {
        set({ scanning: false });
      }
    },

    patchDraft(fn) {
      const d: Draft = JSON.parse(safeStringify(get().draft));
      fn(d);
      set({ draft: d });
      window.clearTimeout(draftTimer);
      const key = get().draftKey;
      draftTimer = window.setTimeout(() => storage.session.set(`draft.${key}`, d), 400);
    },

    resetDraft() {
      const d = emptyDraft(get().settings.language);
      storage.session.remove(`draft.${get().draftKey}`);
      set({ draft: d });
    },

    setTemplates(list) {
      storage.set('templates', list);
      set({ templates: list });
    },
    upsertTemplate(t) {
      const list = get().templates;
      const i = list.findIndex((x) => x.id === t.id);
      const next = i >= 0 ? list.map((x) => (x.id === t.id ? { ...t, updatedAt: Date.now() } : x)) : [...list, { ...t, updatedAt: Date.now() }];
      get().setTemplates(next);
    },
    deleteTemplate(id) {
      get().setTemplates(get().templates.filter((t) => t.id !== id));
      if (get().draft.update.templateId === id) get().selectTemplate(null);
    },
    selectTemplate(id) {
      get().patchDraft((d) => {
        d.update.templateId = id;
      });
      if (id) {
        const r = [id, ...get().recentTemplates.filter((x) => x !== id)].slice(0, 8);
        storage.set('recentTemplates', r);
        set({ recentTemplates: r });
      }
    },
    clearRecent() {
      storage.remove('recent');
      storage.remove('recentTemplates');
      set({ recent: [], recentTemplates: [] });
    },

    toast(kind, text) {
      const id = ++toastSeq;
      set({ toasts: [...get().toasts, { id, kind, text }].slice(-4) });
      window.setTimeout(() => get().dismissToast(id), kind === 'error' ? 9000 : 4500);
    },
    dismissToast(id) {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    },
  };
});

/** Derived data: selected template, generated output and completion. */
export function useDerived() {
  const { snapshot, draft, settings, templates } = useStore();
  const template = templates.find((t) => t.id === draft.update.templateId) || null;
  const autoWork = generateWorkNotes(snapshot, draft, settings, template);
  const autoComment = generateComment(snapshot, draft, settings, template, draft.commentLang);
  return {
    template,
    workNotes: draft.workNotesManual ?? autoWork,
    comments: draft.commentsManual ?? autoComment,
    autoWork,
    autoComment,
    completion: completion(snapshot, draft, template),
  };
}
