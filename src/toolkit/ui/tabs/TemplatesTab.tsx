import { useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight, CalendarCheck, Check, CheckCircle2, Download, Eye, FilePlus2, FileText, Hourglass, Laptop, AppWindow, Pencil, Search, Star, Trash2, Upload, Wifi,
} from 'lucide-react';
import { buildVariables } from '../../core/generator';
import { safeStringify } from '../../core/safeJson';
import { CATEGORIES, newId, renderTemplate, validateImport, VARIABLES, type Template, type TemplateCategory } from '../../core/templates/engine';
import { useLang, useT } from '../../i18n';
import { useStore } from '../../state/store';
import { Button, cx, Dropdown, Empty, Field, IconButton, Input, Modal, Pill, SectionHeader, TextArea } from '../components/ui';
import { NextStep } from '../components/NextStep';

export const CATEGORY_ICON: Record<TemplateCategory, (s: number) => JSX.Element> = {
  Hardware: (s) => <Laptop size={s} />,
  Software: (s) => <AppWindow size={s} />,
  Network: (s) => <Wifi size={s} />,
  Appointments: (s) => <CalendarCheck size={s} />,
  Pending: (s) => <Hourglass size={s} />,
  Escalation: (s) => <ArrowUpRight size={s} />,
  Resolution: (s) => <CheckCircle2 size={s} />,
};

function filterTemplates(list: Template[], q: string, cat: string) {
  const s = q.trim().toLowerCase();
  return list
    .filter((t) => (cat ? t.category === cat : true))
    .filter((t) => !s || [t.name, t.category, t.workNotes, t.commentEn, t.commentNl, ...t.tags].join(' ').toLowerCase().includes(s))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function download(name: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

export function TemplatesTab() {
  const t = useT();
  const lang = useLang();
  const { templates, draft, selectTemplate, upsertTemplate, setTemplates, toast } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [preview, setPreview] = useState<Template | null>(null);
  const [editing, setEditing] = useState<Template | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const list = useMemo(() => filterTemplates(templates, q, cat), [templates, q, cat]);
  const favorites = list.filter((x) => x.favorite);
  const others = list.filter((x) => !x.favorite);
  const selected = draft.update.templateId;

  const describe = (x: Template) => (lang === 'nl' ? x.commentNl : x.commentEn) || x.workNotes;
  const use = (x: Template) => {
    selectTemplate(selected === x.id ? null : x.id);
    if (selected !== x.id) toast('success', 'Template selected', x.name);
  };

  const doImport = async (file: File) => {
    try {
      const imported = validateImport(JSON.parse(await file.text()));
      const map = new Map(templates.map((x) => [x.id, x]));
      imported.forEach((x) => map.set(x.id, x));
      setTemplates([...map.values()]);
      toast('success', 'Templates imported', t('{n} template(s) added or updated.', { n: imported.length }));
    } catch {
      toast('error', 'This file could not be imported', 'Choose a template file exported from ITSM Toolkit.');
    }
  };

  const card = (x: Template) => {
    const on = selected === x.id;
    return (
      <article
        key={x.id}
        className={cx(
          'group flex flex-col rounded-2xl border bg-white p-4 transition duration-150 hover:-translate-y-0.5 hover:shadow-lift dark:bg-ink-900',
          on ? 'border-brand-500 shadow-focus' : 'border-ink-200/80 dark:border-ink-800',
        )}
      >
        <div className="flex items-start gap-3">
          <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', on ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300')}>
            {CATEGORY_ICON[x.category](18)}
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-[14px] font-semibold leading-snug text-ink-900 dark:text-white">{x.name}</h4>
            <div className="mt-0.5 text-[12px] text-ink-500">{t(x.category)}</div>
          </div>
          <IconButton
            label={x.favorite ? t('Remove from favorites') : t('Add to favorites')}
            tipAlign="right"
            onClick={() => upsertTemplate({ ...x, favorite: !x.favorite })}
            className={cx('!h-8 !w-8', x.favorite ? '!text-amber-500' : 'opacity-60 group-hover:opacity-100')}
          >
            <Star size={16} fill={x.favorite ? 'currentColor' : 'none'} />
          </IconButton>
        </div>
        <p className="mt-3 line-clamp-2 flex-1 text-[12.5px] leading-relaxed text-ink-600 dark:text-ink-400">{describe(x)}</p>
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="ghost" icon={<Eye size={14} />} onClick={() => setPreview(x)}>
            {t('Preview')}
          </Button>
          <span className="flex-1" />
          <Button size="sm" variant={on ? 'success' : 'secondary'} icon={on ? <Check size={14} strokeWidth={3} /> : undefined} onClick={() => use(x)}>
            {on ? t('Selected') : t('Use template')}
          </Button>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-5">
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => (e.target.files?.[0] && doImport(e.target.files[0]), (e.target.value = ''))} />
      <SectionHeader
        step={t('Step 4')}
        title={t('Choose a template')}
        description={t('A template adds ready-made text to your notes and to the reply for the user.')}
        actions={
          <Button variant="secondary" icon={<FilePlus2 size={16} />} onClick={() => setEditing({ id: newId(), name: '', category: 'Software', favorite: false, workNotes: '', commentEn: '', commentNl: '', tags: [], updatedAt: Date.now() })}>
            {t('New template')}
          </Button>
        }
      />

      {templates.length > 0 && (
      <>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search templates, e.g. "VPN" or "password"')} aria-label={t('Search templates')} className="!h-12 !rounded-2xl !pl-11 !text-[14px] shadow-card" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Pill on={!cat} onClick={() => setCat('')}>
          {t('All')}
        </Pill>
        {CATEGORIES.map((c) => (
          <Pill key={c} on={cat === c} onClick={() => setCat(cat === c ? '' : c)} icon={CATEGORY_ICON[c](14)}>
            {t(c)}
          </Pill>
        ))}
      </div>
      </>
      )}

      {favorites.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink-700 dark:text-ink-300">
            <Star size={15} className="text-amber-500" fill="currentColor" /> {t('Favorites')}
          </h3>
          <div className="grid gap-3 md:grid-cols-2">{favorites.map(card)}</div>
        </section>
      )}
      <section>
        {favorites.length > 0 && <h3 className="mb-3 text-[13px] font-semibold text-ink-700 dark:text-ink-300">{t('All templates')}</h3>}
        {templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-300 bg-white dark:border-ink-700 dark:bg-ink-900">
            <Empty icon={<FileText size={24} />} title={t('No templates yet')}>
              {t('Import your templates file, or create your first template.')}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="primary" icon={<Upload size={16} />} onClick={() => fileRef.current?.click()}>
                  {t('Import templates')}
                </Button>
                <Button
                  icon={<FilePlus2 size={16} />}
                  onClick={() => setEditing({ id: newId(), name: '', category: 'Software', favorite: false, workNotes: '', commentEn: '', commentNl: '', tags: [], updatedAt: Date.now() })}
                >
                  {t('New template')}
                </Button>
              </div>
            </Empty>
          </div>
        ) : list.length === 0 ? (
          <Empty icon={<Search size={24} />} title={t('No templates found')}>
            {t('Try a different word or category.')}
          </Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">{others.map(card)}</div>
        )}
      </section>

      {templates.length > 0 && <div className="flex flex-wrap items-center gap-2 pt-2 text-[12.5px] text-ink-500">
        <Button size="sm" variant="ghost" icon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>
          {t('Import templates')}
        </Button>
        <Button size="sm" variant="ghost" icon={<Download size={14} />} onClick={() => download('itsm-toolkit-templates.json', safeStringify({ templates }, 2))}>
          {t('Export templates')}
        </Button>
      </div>}

      <NextStep to="output" label="Next: review your notes" hint="Your notes are ready on the right." />

      {preview && <PreviewModal tpl={preview} onClose={() => setPreview(null)} onEdit={() => (setEditing({ ...preview }), setPreview(null))} />}
      {editing && <EditorModal tpl={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function PreviewModal({ tpl, onClose, onEdit }: { tpl: Template; onClose: () => void; onEdit: () => void }) {
  const t = useT();
  const { snapshot, draft, settings, selectTemplate, deleteTemplate, toast } = useStore();
  const vars = buildVariables(snapshot, draft, settings);
  const lang = draft.commentLang;
  const reply = renderTemplate(lang === 'nl' ? tpl.commentNl : tpl.commentEn, vars);
  const on = draft.update.templateId === tpl.id;
  return (
    <Modal
      open
      onClose={onClose}
      title={tpl.name}
      description={t('Preview with the details of this ticket.')}
      footer={
        <>
          <Button
            variant="danger"
            icon={<Trash2 size={15} />}
            onClick={() => {
              if (confirm(t('Delete the template "{name}"?', { name: tpl.name }))) {
                deleteTemplate(tpl.id);
                onClose();
              }
            }}
          >
            {t('Delete')}
          </Button>
          <span className="flex-1" />
          <Button icon={<Pencil size={15} />} onClick={onEdit}>
            {t('Edit')}
          </Button>
          <Button
            variant="primary"
            icon={<Check size={16} strokeWidth={2.5} />}
            onClick={() => {
              if (!on) selectTemplate(tpl.id);
              toast('success', 'Template selected', tpl.name);
              onClose();
            }}
          >
            {t('Use this template')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="tk-label">{t('Work notes (internal)')}</div>
          <p className="whitespace-pre-wrap rounded-xl bg-ink-50 p-4 text-[13px] leading-relaxed dark:bg-ink-850">{renderTemplate(tpl.workNotes, vars) || '—'}</p>
        </div>
        <div>
          <div className="tk-label">
            {t('Reply to the user')} · {lang === 'nl' ? 'Nederlands' : 'English'}
          </div>
          <p className="whitespace-pre-wrap rounded-xl bg-ink-50 p-4 text-[13px] leading-relaxed dark:bg-ink-850">{reply || '—'}</p>
        </div>
      </div>
    </Modal>
  );
}

function EditorModal({ tpl, onClose }: { tpl: Template; onClose: () => void }) {
  const t = useT();
  const { templates, upsertTemplate, toast } = useStore();
  const [e, setE] = useState(tpl);
  const last = useRef<'workNotes' | 'commentEn' | 'commentNl'>('workNotes');
  const set = (p: Partial<Template>) => setE({ ...e, ...p });
  const isNew = !templates.some((x) => x.id === e.id);
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={isNew ? t('New template') : t('Edit template')}
      description={t('Use the blue buttons to add details from the ticket automatically.')}
      footer={
        <>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button
            variant="primary"
            disabled={!e.name.trim()}
            onClick={() => {
              upsertTemplate(e);
              toast('success', 'Template saved', e.name);
              onClose();
            }}
          >
            {t('Save template')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <Field label={t('Name')}>
            <Input value={e.name} onChange={(ev) => set({ name: ev.target.value })} placeholder={t('e.g. Printer driver reinstalled')} autoFocus />
          </Field>
          <Field label={t('Category')}>
            <Dropdown value={e.category} onChange={(v) => set({ category: v as TemplateCategory })} options={CATEGORIES.map((c) => ({ value: c, label: t(c) }))} />
          </Field>
        </div>
        <Field label={t('Work notes (internal)')}>
          <TextArea rows={4} value={e.workNotes} onFocus={() => (last.current = 'workNotes')} onChange={(ev) => set({ workNotes: ev.target.value })} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t('Reply to the user — Dutch')}>
            <TextArea rows={4} value={e.commentNl} onFocus={() => (last.current = 'commentNl')} onChange={(ev) => set({ commentNl: ev.target.value })} />
          </Field>
          <Field label={t('Reply to the user — English')}>
            <TextArea rows={4} value={e.commentEn} onFocus={() => (last.current = 'commentEn')} onChange={(ev) => set({ commentEn: ev.target.value })} />
          </Field>
        </div>
        <div>
          <div className="tk-label">{t('Insert ticket details')}</div>
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map((v) => (
              <button
                key={v.name}
                type="button"
                title={`{{${v.name}}}`}
                onClick={() => set({ [last.current]: `${e[last.current]}{{${v.name}}}` } as Partial<Template>)}
                className="rounded-lg bg-brand-50 px-2.5 py-1 text-[12px] font-medium text-brand-700 transition hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-200"
              >
                + {t(v.description)}
              </button>
            ))}
          </div>
        </div>
        <Field label={t('Search words (optional)')} help={t('Separate with commas. Helps you find the template.')}>
          <Input value={e.tags.join(', ')} onChange={(ev) => set({ tags: ev.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
        </Field>
      </div>
    </Modal>
  );
}
