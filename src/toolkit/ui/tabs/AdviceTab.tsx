import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Bot, CheckCircle2, ExternalLink, Lightbulb, Loader2, Plus, Search, ShieldCheck } from 'lucide-react';
import { aiReady, askAi, redact, type AiAdvice } from '../../core/advice/ai';
import { analyse, keywordsFor } from '../../core/advice/rules';
import { fieldValue } from '../../core/generator';
import { searchKnowledge, type KbArticle } from '../../core/sn/related';
import { useStore } from '../../state/store';
import { Badge, Button, Card, Empty, Input } from '../components/ui';

function SuggestionList({ title, items, kind }: { title: string; items: string[]; kind: 'cause' | 'step' | 'action' }) {
  const { draft, patchDraft } = useStore();
  if (!items.length) return null;
  return (
    <div>
      <div className="tk-label">{title}</div>
      <ul className="space-y-1">
        {items.map((s) => {
          const recorded = draft.update.suggestions.includes(s);
          const done = draft.update.actions.includes(s);
          return (
            <li key={s} className="group flex items-start gap-2 rounded-md px-1.5 py-1 text-[12.5px] hover:bg-ink-50 dark:hover:bg-ink-850">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" />
              <span className="flex-1">{s}</span>
              {kind !== 'cause' && (
                <span className="flex shrink-0 gap-1 opacity-70 group-hover:opacity-100">
                  <button
                    type="button"
                    title="Record in work notes as a suggestion (not performed)"
                    disabled={recorded}
                    onClick={() => patchDraft((d) => void d.update.suggestions.push(s))}
                    className="rounded border border-ink-200 px-1.5 text-[10.5px] text-ink-600 hover:border-brand-400 hover:text-brand-700 disabled:opacity-40 dark:border-ink-700 dark:text-ink-300"
                  >
                    <Plus size={10} className="inline" /> suggest
                  </button>
                  <button
                    type="button"
                    title="I actually performed this — add to Actions performed"
                    disabled={done}
                    onClick={() =>
                      patchDraft((d) => {
                        d.update.actions.push(s);
                        d.update.suggestions = d.update.suggestions.filter((x) => x !== s);
                      })
                    }
                    className="rounded border border-emerald-200 px-1.5 text-[10.5px] text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 dark:border-emerald-500/30 dark:text-emerald-300"
                  >
                    <CheckCircle2 size={10} className="inline" /> performed
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AdviceTab() {
  const { snapshot, draft, settings, setTab } = useStore();
  const short = fieldValue(snapshot, draft, 'short_description');
  const desc = fieldValue(snapshot, draft, 'description');
  const ci = fieldValue(snapshot, draft, 'configuration_item');
  const text = `${short}\n${desc}\n${ci}`;
  const matches = useMemo(() => analyse(text), [text]);

  const [terms, setTerms] = useState('');
  const [kb, setKb] = useState<KbArticle[] | null>(null);
  const [kbErr, setKbErr] = useState('');
  const [kbLoading, setKbLoading] = useState(false);
  useEffect(() => setTerms(keywordsFor(short)), [short]);

  const runKb = async (t = terms) => {
    setKbLoading(true);
    setKbErr('');
    try {
      setKb(await searchKnowledge(snapshot?.gck || null, t));
    } catch (e) {
      setKbErr((e as Error).message);
      setKb([]);
    } finally {
      setKbLoading(false);
    }
  };
  useEffect(() => {
    if (terms && snapshot?.sysId && kb === null) runKb(terms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terms, snapshot?.sysId]);

  const ready = aiReady(settings.ai);
  const [ai, setAi] = useState<AiAdvice | null>(null);
  const [aiErr, setAiErr] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiPayload = useMemo(() => {
    const raw = `Short description: ${short}\nDescription: ${desc}\nConfiguration item: ${ci}\nCategory/priority: ${fieldValue(snapshot, draft, 'priority')}\nActions already performed: ${draft.update.actions.join('; ') || 'none'}`;
    if (!settings.ai.redact) return raw;
    const secrets = [
      fieldValue(snapshot, draft, 'affected_user'), fieldValue(snapshot, draft, 'caller'), fieldValue(snapshot, draft, 'assigned_to'),
      fieldValue(snapshot, draft, 'email'), fieldValue(snapshot, draft, 'phone'), fieldValue(snapshot, draft, 'number'),
      snapshot?.user?.firstName || '', snapshot?.user?.userName || '', settings.technicianName,
    ];
    return redact({ text: raw, secrets });
  }, [short, desc, ci, snapshot, draft, settings]);

  const runAi = async () => {
    setAiLoading(true);
    setAiErr('');
    try {
      setAi(await askAi(settings.ai, aiPayload));
    } catch (e) {
      setAiErr((e as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-[12px] text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
        <Lightbulb size={14} className="mt-0.5 shrink-0" />
        <span>
          Everything below is a <b>suggestion</b>. Use “suggest” to record it as a not-yet-performed check, or “performed” only after you actually did it.
        </span>
      </div>

      <Card title="Local analysis" icon={<ShieldCheck size={15} />} actions={<Badge color="green">offline · no data leaves the browser</Badge>}>
        {matches.length ? (
          <div className="space-y-4">
            {matches.map(({ rule }) => (
              <div key={rule.id} className="space-y-2.5 rounded-lg border border-ink-100 p-3 dark:border-ink-800">
                <div className="text-[13px] font-semibold">{rule.title}</div>
                <SuggestionList title="Potential causes" items={rule.causes} kind="cause" />
                <SuggestionList title="Troubleshooting steps" items={rule.steps} kind="step" />
                <SuggestionList title="Recommended next actions" items={rule.actions} kind="action" />
              </div>
            ))}
          </div>
        ) : (
          <Empty title="No known pattern recognised">Add more detail to the short description or description on the Ticket tab.</Empty>
        )}
      </Card>

      <Card title="Knowledge articles" icon={<BookOpen size={15} />} actions={<Badge>this ServiceNow instance</Badge>}>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            runKb();
          }}
        >
          <Input value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Search terms" />
          <Button type="submit" icon={kbLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}>
            Search
          </Button>
        </form>
        {kbErr && <p className="mt-2 text-xs text-rose-600">Knowledge search failed: {kbErr}</p>}
        {kb && (
          <div className="mt-2 divide-y divide-ink-100 dark:divide-ink-800">
            {kb.map((a) => (
              <a key={a.sysId} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-1.5 text-[12.5px] hover:text-brand-600">
                <Badge color="blue">{a.number}</Badge>
                <span className="flex-1 truncate">{a.title}</span>
                <ExternalLink size={12} />
              </a>
            ))}
            {!kb.length && !kbErr && <p className="py-2 text-xs text-ink-500">No published articles found.</p>}
          </div>
        )}
      </Card>

      <Card title="AI advice (external)" icon={<Bot size={15} />} actions={<Badge color={ready.ok ? 'green' : 'gray'}>{ready.ok ? 'enabled' : 'disabled'}</Badge>}>
        {!ready.ok ? (
          <div className="text-[12.5px] text-ink-600 dark:text-ink-300">
            <p>{ready.reason}</p>
            <p className="mt-1 text-xs text-ink-500">External AI is off by default. An administrator-approved API key and explicit consent are required before any ticket text is sent.</p>
            <Button size="sm" className="mt-2" onClick={() => setTab('settings')}>
              Open settings
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <details className="rounded-lg bg-ink-50 p-2 text-[11.5px] dark:bg-ink-850">
              <summary className="cursor-pointer font-medium">Data that will be sent {settings.ai.redact && '(redacted)'}</summary>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-ink-600 dark:text-ink-300">{aiPayload}</pre>
            </details>
            <Button variant="primary" onClick={runAi} disabled={aiLoading} icon={aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}>
              {aiLoading ? 'Analysing…' : 'Ask AI for suggestions'}
            </Button>
            {aiErr && <p className="text-xs text-rose-600">{aiErr}</p>}
            {ai && (
              <div className="space-y-3 rounded-lg border border-violet-200 p-3 dark:border-violet-500/30">
                <Badge color="violet">AI suggestions — verify before acting</Badge>
                {ai.summary && <p className="text-[12.5px]">{ai.summary}</p>}
                <SuggestionList title="Potential causes" items={ai.potential_causes} kind="cause" />
                <SuggestionList title="Troubleshooting steps" items={ai.troubleshooting_steps} kind="step" />
                <SuggestionList title="Recommended next actions" items={ai.recommended_next_actions} kind="action" />
                {ai.knowledge_search_terms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {ai.knowledge_search_terms.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="tk-chip tk-chip-off"
                        onClick={() => {
                          setTerms(t);
                          runKb(t);
                        }}
                      >
                        <Search size={10} /> {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
