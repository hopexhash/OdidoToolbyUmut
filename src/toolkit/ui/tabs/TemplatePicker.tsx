import { useMemo, useState } from 'react';
import { Search, Star } from 'lucide-react';
import { buildVariables } from '../../core/generator';
import { CATEGORIES, renderTemplate, type Template } from '../../core/templates/engine';
import { useStore } from '../../state/store';
import { Badge, Chip, cx, Input } from '../components/ui';

export function filterTemplates(list: Template[], q: string, cat: string, favOnly: boolean) {
  const s = q.trim().toLowerCase();
  return list
    .filter((t) => (cat ? t.category === cat : true))
    .filter((t) => (favOnly ? t.favorite : true))
    .filter((t) => !s || [t.name, t.category, t.workNotes, t.commentEn, t.commentNl, ...t.tags].join(' ').toLowerCase().includes(s))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
}

export function TemplatePicker() {
  const { templates, draft, selectTemplate, upsertTemplate, snapshot, settings } = useStore();
  const vars = useMemo(() => buildVariables(snapshot, draft, settings), [snapshot, draft, settings]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [fav, setFav] = useState(false);
  const list = useMemo(() => filterTemplates(templates, q, cat, fav), [templates, q, cat, fav]);
  const sel = draft.update.templateId;
  return (
    <div>
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" className="!pl-8" />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip on={fav} onClick={() => setFav(!fav)}>
          <Star size={11} /> Favorites
        </Chip>
        <Chip on={!cat} onClick={() => setCat('')}>
          All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} on={cat === c} onClick={() => setCat(cat === c ? '' : c)}>
            {c}
          </Chip>
        ))}
      </div>
      <div className="mt-3 max-h-[260px] space-y-1 overflow-y-auto pr-1">
        {list.map((t) => (
          <div
            key={t.id}
            role="button"
            tabIndex={0}
            onClick={() => selectTemplate(sel === t.id ? null : t.id)}
            onKeyDown={(e) => e.key === 'Enter' && selectTemplate(sel === t.id ? null : t.id)}
            className={cx(
              'group flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 transition',
              sel === t.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-transparent hover:border-ink-200 hover:bg-ink-50 dark:hover:border-ink-700 dark:hover:bg-ink-850',
            )}
          >
            <button
              type="button"
              title={t.favorite ? 'Remove from favorites' : 'Add to favorites'}
              onClick={(e) => {
                e.stopPropagation();
                upsertTemplate({ ...t, favorite: !t.favorite });
              }}
              className={cx('shrink-0', t.favorite ? 'text-amber-500' : 'text-ink-300 hover:text-amber-500 dark:text-ink-600')}
            >
              <Star size={14} fill={t.favorite ? 'currentColor' : 'none'} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{t.name}</div>
              <div className="truncate text-[11.5px] text-ink-500">{renderTemplate(t.workNotes, vars)}</div>
            </div>
            <Badge>{t.category}</Badge>
          </div>
        ))}
        {!list.length && <p className="py-4 text-center text-xs text-ink-500">No templates match.</p>}
      </div>
    </div>
  );
}
