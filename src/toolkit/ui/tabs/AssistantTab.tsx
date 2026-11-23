import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Bot, Check, ExternalLink, Lightbulb, Lock, Plus, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { aiReady, askAi, redact, type AiAdvice } from '../../core/advice/ai';
import { analyse, keywordsFor } from '../../core/advice/rules';
import { fieldValue } from '../../core/generator';
import { searchKnowledge, type KbArticle } from '../../core/sn/related';
import { useT } from '../../i18n';
import { useStore } from '../../state/store';
import { Badge, Button, Card, Empty, Input, Notice, SectionHeader } from '../components/ui';

function SuggestionList({ title, items, actionable }: { title: string; items: string[]; actionable: boolean }) {
  const t = useT();
  const { draft, patchDraft, toast } = useStore();
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-2 text-[12.5px] font-semibold text-ink-700 dark:text-ink-300">{title}</div>
      <ul className="space-y-1.5">
        {items.map((s) => {
          const noted = draft.update.suggestions.includes(s);
          const done = draft.update.actions.includes(s);
          return (
            <li key={s} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-ink-100 bg-ink-25 px-3.5 py-2.5 text-[13px] dark:border-ink-800 dark:bg-ink-850">
              <span className="min-w-[180px] flex-1">{s}</span>
              {actionable &&
                (done ? (
                  <Badge tone="green" icon={<Check size={12} />}>{t('Done')}</Badge>
                ) : (
                  <span className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={noted ? <Check size={13} /> : <Plus size={13} />}
                      disabled={noted}
                      title={t('Add to the notes as a suggestion that was not performed yet')}
                      onClick={() => {
                        patchDraft((d) => void d.update.suggestions.push(s));
                        toast('info', 'Added as a suggestion', 'It is marked "not yet performed" in your notes.');
                      }}
                    >
                      {noted ? t('Noted') : t('Note for later')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Check size={13} />}
                      title={t('Only click if you actually did this')}
                      onClick={() =>
                        patchDraft((d) => {
                          d.update.actions.push(s);
                          d.update.suggestions = d.update.suggestions.filter((x) => x !== s);
                        })
                      }
                    >
                      {t('I did this')}
                    </Button>
                  </span>
                ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AssistantTab() {
  const t = useT();
  const { snapshot, draft, settings, setTab } = useStore();
  const short = fieldValue(snapshot, draft, 'short_description');
  const desc = fieldValue(snapshot, draft, 'description');
  const ci = fieldValue(snapshot, draft, 'configuration_item');
  const matches = useMemo(() => analyse(`${short}\n${desc}\n${ci}`), [short, desc, ci]);

  const [terms, setTerms] = useState('');
  const [kb, setKb] = useState<KbArticle[] | null>(null);
  const [kbErr, setKbErr] = useState(false);
  const [kbLoading, setKbLoading] = useState(false);
  useEffect(() => setTerms(keywordsFor(short)), [short]);
  const runKb = async (q = terms) => {
    setKbLoading(true);
    setKbErr(false);
    try {
      setKb(await searchKnowledge(snapshot?.gck || null, q));
    } catch {
      setKbErr(true);
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
    const raw = `Short description: ${short}\nDescription: ${desc}\nConfiguration item: ${ci}\nPriority: ${fieldValue(snapshot, draft, 'priority')}\nActions already performed: ${draft.update.actions.join('; ') || 'none'}`;
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
    <div className="space-y-5">
      <SectionHeader title={t('AI Assistant')} description={t('Ideas for causes and solutions based on this ticket. These are suggestions — always check them before acting.')} />

      <Card title={t('Suggested solutions')} icon={<Lightbulb size={18} />} actions={<Badge tone="green" icon={<ShieldCheck size={12} />}>{t('Private — works offline')}</Badge>}>
        {matches.length ? (
          <div className="space-y-6">
            {matches.map(({ rule }) => (
              <div key={rule.id} className="space-y-4">
                <div className="flex items-center gap-2 text-[14px] font-semibold">
                  <Sparkles size={15} className="text-brand-600" /> {t(rule.title)}
                </div>
                <SuggestionList title={t('Possible causes')} items={rule.causes} actionable={false} />
                <SuggestionList title={t('Things to check')} items={rule.steps} actionable />
                <SuggestionList title={t('Recommended next actions')} items={rule.actions} actionable />
              </div>
            ))}
          </div>
        ) : (
          <Empty icon={<Lightbulb size={24} />} title={t('No suggestions yet')}>
            {t('Add more detail to the short description or description on the Ticket page.')}
          </Empty>
        )}
      </Card>

      <Card title={t('Knowledge articles')} icon={<BookOpen size={18} />} description={t('Articles from your own ServiceNow knowledge base.')}>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            runKb();
          }}
        >
          <Input value={terms} onChange={(e) => setTerms(e.target.value)} placeholder={t('What are you looking for?')} aria-label={t('Search knowledge articles')} />
          <Button type="submit" variant="secondary" loading={kbLoading} icon={<Search size={15} />}>
            {t('Search')}
          </Button>
        </form>
        {kbErr && <p className="tk-help">{t('The knowledge base could not be searched right now.')}</p>}
        {kb && (
          <ul className="mt-3 space-y-1.5">
            {kb.map((a) => (
              <li key={a.sysId}>
                <a href={a.url} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition hover:bg-ink-50 dark:hover:bg-ink-850">
                  <BookOpen size={16} className="shrink-0 text-ink-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium group-hover:text-brand-700 dark:group-hover:text-brand-300">{a.title}</span>
                    <span className="text-[12px] text-ink-500">{a.number}</span>
                  </span>
                  <ExternalLink size={14} className="text-ink-300 group-hover:text-brand-600" />
                </a>
              </li>
            ))}
            {!kb.length && !kbErr && <p className="tk-help">{t('No articles found. Try other words.')}</p>}
          </ul>
        )}
      </Card>

      <Card title={t('Ask AI')} icon={<Bot size={18} />} actions={<Badge tone={ready.ok ? 'green' : 'gray'} icon={ready.ok ? <Check size={12} /> : <Lock size={12} />}>{ready.ok ? t('On') : t('Off')}</Badge>}>
        {!ready.ok ? (
          <Notice
            tone="gray"
            icon={<Lock size={16} />}
            title={t('AI is turned off')}
            action={
              <Button size="sm" variant="secondary" onClick={() => setTab('settings')}>
                {t('Set up')}
              </Button>
            }
          >
            {t('For privacy, no ticket text is sent to an AI service unless your organisation approved it and it is set up in Settings.')}
          </Notice>
        ) : (
          <div className="space-y-4">
            <details className="rounded-xl border border-ink-100 p-3 text-[12.5px] dark:border-ink-800">
              <summary className="cursor-pointer font-medium">{settings.ai.redact ? t('See what will be sent (personal details removed)') : t('See what will be sent')}</summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-ink-600 dark:text-ink-300">{aiPayload}</pre>
            </details>
            <Button variant="primary" onClick={runAi} loading={aiLoading} icon={<Sparkles size={16} />}>
              {aiLoading ? t('Thinking…') : t('Get AI suggestions')}
            </Button>
            {aiErr && (
              <Notice tone="red" icon={<Bot size={16} />} title={t('The AI could not answer')}>
                {aiErr}
              </Notice>
            )}
            {ai && (
              <div className="animate-tk-rise space-y-4 rounded-2xl border border-brand-100 bg-brand-50/40 p-4 dark:border-brand-500/20 dark:bg-brand-500/5">
                <Badge tone="blue" icon={<Sparkles size={12} />}>{t('AI suggestions — check before acting')}</Badge>
                {ai.summary && <p className="text-[13.5px] leading-relaxed">{ai.summary}</p>}
                <SuggestionList title={t('Possible causes')} items={ai.potential_causes} actionable={false} />
                <SuggestionList title={t('Things to check')} items={ai.troubleshooting_steps} actionable />
                <SuggestionList title={t('Recommended next actions')} items={ai.recommended_next_actions} actionable />
                {ai.knowledge_search_terms.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {ai.knowledge_search_terms.map((q) => (
                      <Button
                        key={q}
                        size="sm"
                        variant="secondary"
                        icon={<Search size={13} />}
                        onClick={() => {
                          setTerms(q);
                          runKb(q);
                        }}
                      >
                        {q}
                      </Button>
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
