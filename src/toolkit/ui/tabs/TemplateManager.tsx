import { useMemo, useRef, useState } from 'react';
import { Copy, Download, FilePlus2, Pencil, RotateCcw, Search, Star, Trash2, Upload } from 'lucide-react';
import { safeStringify } from '../../core/safeJson';
import { DEFAULT_TEMPLATES } from '../../core/templates/defaults';
import { CATEGORIES, newId, validateImport, VARIABLES, type Template } from '../../core/templates/engine';
import { useStore } from '../../state/store';
import { Badge, Button, Card, Field, Input, Select, TextArea, cx } from '../components/ui';
import { filterTemplates } from './TemplatePicker';

const blank = (): Template => ({
  id: newId(), name: '', category: 'Software', favorite: false, workNotes: '', commentEn: '', commentNl: '', tags: [], updatedAt: Date.now(),
});

function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

export function TemplateManager() {
  const { templates, upsertTemplate, deleteTemplate, setTemplates, toast } = useStore();
  const [editing, setEditing] = useState<Template | null>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const lastField = useRef<'workNotes' | 'commentEn' | 'commentNl'>('workNotes');
  const list = useMemo(() => filterTemplates(templates, q, cat, false), [templates, q, cat]);

  const doImport = async (file: File) => {
    try {
      const imported = validateImport(JSON.parse(await file.text()));
      const map = new Map(templates.map((t) => [t.id, t]));
      imported.forEach((t) => map.set(t.id, t));
      setTemplates([...map.values()]);
      toast('success', `Imported ${imported.length} template(s).`);
    } catch (e) {
      toast('error', `Import failed: ${(e as Error).message}`);
    }
  };

  if (editing) {
    const e = editing;
    const set = (p: Partial<Template>) => setEditing({ ...e, ...p });
    const insertVar = (v: string) => set({ [lastField.current]: `${e[lastField.current]}{{${v}}}` } as Partial<Template>);
    return (
      <Card title={templates.some((t) => t.id === e.id) ? 'Edit template' : 'New template'} icon={<Pencil size={15} />}>
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <Field label="Name">
            <Input value={e.name} onChange={(ev) => set({ name: ev.target.value })} autoFocus />
          </Field>
          <Field label="Category">
            <Select value={e.category} onChange={(ev) => set({ category: ev.target.value as Template['category'] })}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-3 space-y-3">
          <Field label="Work notes (internal)">
            <TextArea rows={4} value={e.workNotes} onFocus={() => (lastField.current = 'workNotes')} onChange={(ev) => set({ workNotes: ev.target.value })} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Customer comment — Dutch">
              <TextArea rows={4} value={e.commentNl} onFocus={() => (lastField.current = 'commentNl')} onChange={(ev) => set({ commentNl: ev.target.value })} />
            </Field>
            <Field label="Customer comment — English">
              <TextArea rows={4} value={e.commentEn} onFocus={() => (lastField.current = 'commentEn')} onChange={(ev) => set({ commentEn: ev.target.value })} />
            </Field>
          </div>
          <Field label="Tags (comma separated)">
            <Input value={e.tags.join(', ')} onChange={(ev) => set({ tags: ev.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </Field>
          <div>
            <span className="tk-label">Insert variable (into the last focused text)</span>
            <div className="flex flex-wrap gap-1">
              {VARIABLES.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  title={v.description}
                  onClick={() => insertVar(v.name)}
                  className="rounded-md bg-ink-100 px-1.5 py-0.5 font-mono text-[11px] text-ink-700 hover:bg-brand-100 hover:text-brand-700 dark:bg-ink-800 dark:text-ink-300"
                >
                  {`{{${v.name}}}`}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ink-400">Use {'{{variable|fallback}}'} for a default. Lines whose variables are all empty are dropped automatically.</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!e.name.trim()}
            onClick={() => {
              upsertTemplate(e);
              setEditing(null);
              toast('success', 'Template saved.');
            }}
          >
            Save template
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={`Templates (${templates.length})`}
      actions={
        <>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
          <Button size="sm" icon={<Upload size={13} />} onClick={() => fileRef.current?.click()}>
            Import
          </Button>
          <Button size="sm" icon={<Download size={13} />} onClick={() => download('itsm-toolkit-templates.json', safeStringify({ templates }, 2))}>
            Export
          </Button>
          <Button size="sm" variant="primary" icon={<FilePlus2 size={13} />} onClick={() => setEditing(blank())}>
            New
          </Button>
        </>
      }
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="!pl-8" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="!w-44">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </div>
      <div className="mt-3 divide-y divide-ink-100 dark:divide-ink-800">
        {list.map((t) => (
          <div key={t.id} className="flex items-center gap-2 py-2">
            <Star size={13} className={cx(t.favorite ? 'text-amber-500' : 'text-transparent')} fill={t.favorite ? 'currentColor' : 'none'} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{t.name}</div>
              <div className="truncate text-[11px] text-ink-500">{t.tags.join(' · ') || t.workNotes}</div>
            </div>
            <Badge>{t.category}</Badge>
            <button type="button" title="Edit" className="p-1 text-ink-400 hover:text-brand-600" onClick={() => setEditing({ ...t })}>
              <Pencil size={14} />
            </button>
            <button type="button" title="Duplicate" className="p-1 text-ink-400 hover:text-brand-600" onClick={() => setEditing({ ...t, id: newId(), name: `${t.name} (copy)` })}>
              <Copy size={14} />
            </button>
            <button
              type="button"
              title="Delete"
              className="p-1 text-ink-400 hover:text-rose-600"
              onClick={() => {
                if (confirm(`Delete template "${t.name}"?`)) deleteTemplate(t.id);
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          icon={<RotateCcw size={12} />}
          onClick={() => {
            if (confirm('Restore the built-in templates? Your own templates are kept; built-in ones are reset.')) {
              const own = templates.filter((t) => !t.id.startsWith('d-'));
              setTemplates([...DEFAULT_TEMPLATES, ...own]);
            }
          }}
        >
          Restore built-in templates
        </Button>
      </div>
    </Card>
  );
}
