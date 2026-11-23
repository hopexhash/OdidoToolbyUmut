import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ChevronDown, ChevronUp, Copy, Eye, Lock, RotateCcw, ShieldAlert, Sparkles, X } from 'lucide-react';
import { copyText } from '../core/clipboard';
import { scanConfidential } from '../core/generator';
import { insertJournal, type InsertResult } from '../core/sn/insert';
import { useT } from '../i18n';
import { useDerived, useStore } from '../state/store';
import { AnimatedCheck, Button, cx, Notice, Tooltip } from './components/ui';

type Kind = 'work_notes' | 'comments';

export function OutputPanel({ side }: { side: boolean }) {
  const t = useT();
  const { draft, patchDraft, settings, snapshot, toast, outputPulse } = useStore();
  const { workNotes, comments, completion } = useDerived();
  const [view, setView] = useState<Kind>('work_notes');
  const [results, setResults] = useState<InsertResult[]>([]);
  const [targets, setTargets] = useState<{ work_notes: boolean; comments: boolean }>({ work_notes: true, comments: true });
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [justInserted, setJustInserted] = useState(false);
  const [copiedFallback, setCopiedFallback] = useState<Kind | null>(null);

  useEffect(() => {
    if (outputPulse) setCollapsed(false);
  }, [outputPulse]);
  useEffect(() => setResults([]), [snapshot?.sysId]);

  const warnings = useMemo(() => scanConfidential(comments, [snapshot?.fields.assignment_group?.display || '']), [comments, snapshot]);
  const text = view === 'work_notes' ? workNotes : comments;
  const manual = view === 'work_notes' ? draft.workNotesManual !== null : draft.commentsManual !== null;
  const markReviewed = () => !draft.reviewed && patchDraft((d) => void (d.reviewed = true));

  const setText = (v: string) =>
    patchDraft((d) => {
      d.reviewed = true;
      if (view === 'work_notes') d.workNotesManual = v;
      else d.commentsManual = v;
    });
  const regenerate = () =>
    patchDraft((d) => {
      if (view === 'work_notes') d.workNotesManual = null;
      else d.commentsManual = null;
    });

  const copy = async () => {
    markReviewed();
    if (!text.trim()) return toast('info', 'Nothing to copy yet', 'Fill in the steps first — your notes appear here automatically.');
    const ok = await copyText(text);
    if (ok) toast('success', view === 'work_notes' ? 'Work notes copied' : 'Customer reply copied', 'Paste it anywhere with Ctrl+V.');
    else toast('error', 'Copying was blocked by your browser', 'Select the text and press Ctrl+C instead.');
  };

  const insert = async () => {
    setBusy(true);
    const res: InsertResult[] = [];
    const opts = {
      mode: settings.insertMode,
      selectors: settings.insertSelectors,
      fieldNames: { work_notes: settings.fieldMap.work_notes?.fields, comments: settings.fieldMap.comments?.fields },
    };
    await new Promise((r) => setTimeout(r, 250)); // let the loading state render
    if (targets.work_notes && workNotes.trim()) res.push(insertJournal('work_notes', workNotes, opts));
    if (targets.comments && comments.trim()) res.push(insertJournal('comments', comments, opts));
    setBusy(false);
    if (!res.length) return toast('info', 'Nothing to insert yet', 'Fill in the steps first — your notes appear here automatically.');
    setResults(res);
    const failed = res.filter((r) => !r.ok);
    if (!failed.length) {
      patchDraft((d) => {
        d.insertedAt = Date.now();
        d.reviewed = true;
      });
      setJustInserted(true);
      setTimeout(() => setJustInserted(false), 2600);
      toast('success', 'Added to the ticket', 'Check the ticket in ServiceNow and click Save or Update.');
    } else {
      const f = failed[0];
      setCopiedFallback(await copyText(f.kind === 'work_notes' ? workNotes : comments) ? f.kind : null);
    }
  };

  const copyLabel = view === 'work_notes' ? t('Copy work notes') : t('Copy customer reply');
  const nothingSelected = !targets.work_notes && !targets.comments;

  return (
    <aside
      key={outputPulse}
      aria-label={t('Your notes')}
      className={cx(
        'flex shrink-0 flex-col bg-white dark:bg-ink-900',
        side ? 'w-[400px] border-l border-ink-200/70 dark:border-ink-800' : cx('border-t border-ink-200/70 dark:border-ink-800', collapsed ? 'h-[60px]' : 'h-[52%]'),
        outputPulse > 0 && 'animate-tk-pulse',
      )}
    >
      <div className="flex h-[60px] shrink-0 items-center gap-3 px-5">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-600 dark:text-brand-400">{t('Step 5 & 6')}</div>
          <div className="text-[15px] font-semibold leading-tight">{t('Review & insert your notes')}</div>
        </div>
        {!side && (
          <Button size="sm" variant="ghost" icon={collapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? t('Show') : t('Hide')}
          </Button>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="px-5">
            <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
              {(['work_notes', 'comments'] as Kind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={view === k}
                  onClick={() => {
                    setView(k);
                    markReviewed();
                  }}
                  className={cx(
                    'flex h-9 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition duration-150',
                    view === k ? 'bg-white text-ink-900 shadow-card dark:bg-ink-700 dark:text-white' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-white',
                  )}
                >
                  {k === 'work_notes' ? <Lock size={14} /> : <Eye size={14} />}
                  {k === 'work_notes' ? t('Work notes') : t('Customer reply')}
                  {k === 'comments' && warnings.length > 0 && <AlertTriangle size={13} className="text-amber-500" aria-label={t('Check this text')} />}
                </button>
              ))}
            </div>
            <div className="mt-3 flex min-h-[28px] items-center gap-2 text-[12.5px] text-ink-500 dark:text-ink-400">
              {view === 'work_notes' ? (
                <span className="flex items-center gap-1.5">
                  <Lock size={13} /> {t('Internal — only your colleagues see this')}
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-1.5">
                    <Eye size={13} /> {t('The user will see this')}
                  </span>
                  <span className="flex-1" />
                  <div role="radiogroup" aria-label={t('Language of the reply')} className="flex rounded-lg bg-ink-100 p-0.5 dark:bg-ink-800">
                    {(['nl', 'en'] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        role="radio"
                        aria-checked={draft.commentLang === l}
                        onClick={() => patchDraft((d) => void (d.commentLang = l))}
                        className={cx(
                          'rounded-md px-2.5 py-1 text-[12px] font-medium transition',
                          draft.commentLang === l ? 'bg-white text-ink-900 shadow-card dark:bg-ink-700 dark:text-white' : 'text-ink-500',
                        )}
                      >
                        {l === 'nl' ? 'Nederlands' : 'English'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="relative min-h-[150px] flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={markReviewed}
              aria-label={view === 'work_notes' ? t('Work notes') : t('Customer reply')}
              placeholder={view === 'work_notes' ? t('Your work notes will appear here as you complete the steps on the left.') : t('Your reply to the user will appear here once you choose a template or contact result.')}
              spellCheck
              className="tk-input absolute inset-x-5 inset-y-3 !h-auto !w-auto resize-none !rounded-xl bg-ink-25 !py-3 text-[13px] leading-relaxed dark:bg-ink-850"
            />
            {manual && (
              <Tooltip label={t('Throw away your edits and rebuild the text')} align="right" side="top">
                <button
                  type="button"
                  onClick={regenerate}
                  className="absolute bottom-6 right-8 flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[12px] font-medium text-ink-700 shadow-card hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200"
                >
                  <RotateCcw size={12} /> {t('Edited — rebuild')}
                </button>
              </Tooltip>
            )}
          </div>

          <div className="space-y-2 px-5">
            {completion.missing.length > 0 && completion.missing.length < 7 && (
              <Notice tone="gray" icon={<Sparkles size={15} className="text-brand-600" />}>
                <span className="font-medium">{t('To complete your notes')}:</span> {completion.missing.map((m) => t(m)).join(' · ')}
              </Notice>
            )}
            {view === 'comments' && warnings.length > 0 && (
              <Notice tone="amber" icon={<ShieldAlert size={16} />} title={t('Check before sending')}>
                {t('This reply may contain internal information')}: {warnings.map((w) => `${t(w.label)} (“${w.sample}”)`).join(', ')}
              </Notice>
            )}
            {results
              .filter((r) => !r.ok)
              .map((r) => (
                <Notice
                  key={r.kind}
                  tone="red"
                  icon={<AlertTriangle size={16} />}
                  title={r.kind === 'work_notes' ? t('Work notes not filled in') : t('Customer reply not filled in')}
                  action={
                    <button type="button" aria-label={t('Dismiss')} onClick={() => setResults(results.filter((x) => x !== r))} className="rounded p-0.5 opacity-60 hover:opacity-100">
                      <X size={14} />
                    </button>
                  }
                >
                  {t(r.message)}
                  {copiedFallback === r.kind && <div className="mt-1 font-medium">{t('The text is already on your clipboard.')}</div>}
                </Notice>
              ))}
          </div>

          <div className="shrink-0 space-y-3 border-t border-ink-100 px-5 pb-5 pt-4 dark:border-ink-800">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
              <span className="text-ink-500 dark:text-ink-400">{t('Insert')}:</span>
              {(['work_notes', 'comments'] as Kind[]).map((k) => (
                <label
                  key={k}
                  className={cx(
                    'flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium transition',
                    targets[k] ? 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-200' : 'border-ink-200 text-ink-500 dark:border-ink-700',
                  )}
                >
                  <input type="checkbox" checked={targets[k]} onChange={(e) => setTargets({ ...targets, [k]: e.target.checked })} className="h-3.5 w-3.5 accent-brand-600" />
                  {k === 'work_notes' ? t('Work notes') : t('Customer reply')}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Tooltip label={copyLabel} side="top" align="left">
                <Button variant="secondary" size="lg" icon={<Copy size={16} />} onClick={copy} className="shrink-0 !px-4" aria-label={copyLabel}>
                  {t('Copy')}
                </Button>
              </Tooltip>
              <Button
                variant={justInserted ? 'success' : 'primary'}
                size="lg"
                className="min-w-0 flex-1"
                loading={busy}
                disabled={nothingSelected}
                icon={justInserted ? <AnimatedCheck /> : <ArrowDownToLine size={18} />}
                onClick={insert}
              >
                <span className="truncate">{justInserted ? t('Added to ticket') : t('Insert into ServiceNow')}</span>
              </Button>
            </div>
            <p className="text-center text-[12px] leading-snug text-ink-500 dark:text-ink-400">{t('Nothing is saved automatically. Check the ticket, then click Save in ServiceNow.')}</p>
          </div>
        </>
      )}
    </aside>
  );
}
