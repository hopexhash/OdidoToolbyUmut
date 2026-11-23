import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, Check, Copy, Lock, MessageSquareText, RotateCcw, ShieldAlert, X } from 'lucide-react';
import { copyText } from '../core/clipboard';
import { scanConfidential } from '../core/generator';
import { insertJournal, type InsertResult } from '../core/sn/insert';
import { useDerived, useStore } from '../state/store';
import { Badge, Button, cx } from './components/ui';

type Kind = 'work_notes' | 'comments';

export function OutputPanel({ wide }: { wide: boolean }) {
  const { draft, patchDraft, settings, snapshot, toast } = useStore();
  const { workNotes, comments } = useDerived();
  const [view, setView] = useState<Kind>('work_notes');
  const [results, setResults] = useState<InsertResult[]>([]);
  const [targets, setTargets] = useState<{ work_notes: boolean; comments: boolean }>({ work_notes: true, comments: true });
  const [collapsed, setCollapsed] = useState(false);

  const warnings = useMemo(
    () => scanConfidential(comments, [snapshot?.fields.assignment_group?.display || '']),
    [comments, snapshot],
  );
  const text = view === 'work_notes' ? workNotes : comments;
  const manual = view === 'work_notes' ? draft.workNotesManual !== null : draft.commentsManual !== null;

  const setText = (v: string) =>
    patchDraft((d) => {
      if (view === 'work_notes') d.workNotesManual = v;
      else d.commentsManual = v;
    });
  const regenerate = () =>
    patchDraft((d) => {
      if (view === 'work_notes') d.workNotesManual = null;
      else d.commentsManual = null;
    });

  const copy = async (k: Kind) => {
    const t = k === 'work_notes' ? workNotes : comments;
    if (!t.trim()) return toast('info', 'Nothing to copy yet.');
    const ok = await copyText(t);
    toast(ok ? 'success' : 'error', ok ? `${k === 'work_notes' ? 'Work notes' : 'Additional comments'} copied to clipboard.` : 'Clipboard access was blocked by the browser.');
  };

  const insert = async () => {
    const res: InsertResult[] = [];
    const opts = {
      mode: settings.insertMode,
      selectors: settings.insertSelectors,
      fieldNames: { work_notes: settings.fieldMap.work_notes?.fields, comments: settings.fieldMap.comments?.fields },
    };
    if (targets.work_notes && workNotes.trim()) res.push(insertJournal('work_notes', workNotes, opts));
    if (targets.comments && comments.trim()) res.push(insertJournal('comments', comments, opts));
    if (!res.length) return toast('info', 'Nothing to insert — generate notes first.');
    setResults(res);
    const failed = res.filter((r) => !r.ok);
    if (!failed.length) toast('success', 'Inserted. Review the ticket and save it manually.');
    else {
      // Clipboard fallback for the first failed field
      const f = failed[0];
      const ok = await copyText(f.kind === 'work_notes' ? workNotes : comments);
      toast('error', `${f.kind === 'work_notes' ? 'Work notes' : 'Additional comments'}: ${f.message}${ok ? ' The text was copied to your clipboard — paste it with Ctrl+V.' : ''}`);
    }
  };

  return (
    <aside
      className={cx(
        'flex shrink-0 flex-col border-ink-200/80 bg-white dark:border-ink-800 dark:bg-ink-900',
        wide ? 'w-[380px] border-l' : cx('border-t', collapsed ? 'h-11' : 'h-[46%]'),
      )}
    >
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-ink-100 px-3 dark:border-ink-800">
        <MessageSquareText size={15} className="text-brand-600 dark:text-brand-400" />
        <span className="mr-2 text-[13px] font-semibold">Generated output</span>
        <div className="flex rounded-lg bg-ink-100 p-0.5 dark:bg-ink-800">
          {(['work_notes', 'comments'] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setView(k)}
              className={cx(
                'flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium transition',
                view === k ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-700 dark:text-white' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400',
              )}
            >
              {k === 'work_notes' ? <Lock size={11} /> : null}
              {k === 'work_notes' ? 'Work notes' : 'Comments'}
              {k === 'comments' && warnings.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {!wide && (
          <button type="button" className="text-[11px] text-ink-500 hover:text-ink-800" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? 'Show' : 'Hide'}
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="flex shrink-0 items-center gap-2 px-3 pt-2.5">
            {view === 'work_notes' ? (
              <Badge color="gray">
                <Lock size={10} /> Internal — not visible to customer
              </Badge>
            ) : (
              <>
                <Badge color="violet">Customer visible</Badge>
                <div className="flex rounded-md border border-ink-200 text-[11px] dark:border-ink-700">
                  {(['nl', 'en'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => patchDraft((d) => void (d.commentLang = l))}
                      className={cx('px-2 py-0.5 font-semibold uppercase', draft.commentLang === l ? 'bg-brand-600 text-white' : 'text-ink-500')}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex-1" />
            {manual && (
              <button type="button" onClick={regenerate} className="flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-400">
                <RotateCcw size={11} /> Edited — regenerate
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 px-3 py-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                view === 'work_notes'
                  ? 'Work notes appear here as you fill in Contact, Update Details and pick a template…'
                  : 'Customer-facing comments appear here (choose a template or contact outcome)…'
              }
              spellCheck
              className="tk-input h-full min-h-[120px] resize-none font-sans text-[12.5px] leading-relaxed"
            />
          </div>
          {view === 'comments' && warnings.length > 0 && (
            <div className="mx-3 mb-2 flex items-start gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11.5px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              <ShieldAlert size={14} className="mt-0.5 shrink-0" />
              <span>
                Possible internal information in a customer-visible comment: {warnings.map((w) => `${w.label} (“${w.sample}”)`).join(', ')}.
              </span>
            </div>
          )}
          {results.length > 0 && (
            <div className="mx-3 mb-2 space-y-1">
              {results.map((r) => (
                <div
                  key={r.kind}
                  className={cx(
                    'flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-[11.5px]',
                    r.ok ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300',
                  )}
                >
                  {r.ok ? <Check size={13} className="mt-0.5 shrink-0" /> : <AlertTriangle size={13} className="mt-0.5 shrink-0" />}
                  <span className="flex-1">
                    <b>{r.kind === 'work_notes' ? 'Work notes' : 'Comments'}:</b> {r.message}
                  </span>
                  <button type="button" onClick={() => setResults(results.filter((x) => x !== r))}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="shrink-0 space-y-2 border-t border-ink-100 p-3 dark:border-ink-800">
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" icon={<Copy size={13} />} onClick={() => copy('work_notes')}>
                Copy work notes
              </Button>
              <Button size="sm" icon={<Copy size={13} />} onClick={() => copy('comments')}>
                Copy add. comments
              </Button>
            </div>
            <div className="flex items-center gap-3 text-[11.5px] text-ink-500 dark:text-ink-400">
              <span>Insert:</span>
              {(['work_notes', 'comments'] as Kind[]).map((k) => (
                <label key={k} className="flex cursor-pointer items-center gap-1">
                  <input type="checkbox" checked={targets[k]} onChange={(e) => setTargets({ ...targets, [k]: e.target.checked })} className="accent-brand-600" />
                  {k === 'work_notes' ? 'Work notes' : 'Additional comments'}
                </label>
              ))}
            </div>
            <Button variant="primary" className="w-full !h-9" icon={<ArrowDownToLine size={15} />} onClick={insert}>
              INSERT IN TICKET
            </Button>
            <p className="text-center text-[10.5px] text-ink-400">Fields are filled, never saved. Review and save the ticket yourself.</p>
          </div>
        </>
      )}
    </aside>
  );
}
