import { useEffect, useState } from 'react';
import {
  AlertTriangle, Building2, Clock, Copy, Cpu, History, Laptop, Mail, MessageSquareText, Phone, RefreshCw, RotateCcw, ScanSearch, Timer, User, UserCog,
} from 'lucide-react';
import type { FieldKey } from '../../core/fields';
import { copyText } from '../../core/clipboard';
import { fieldValue } from '../../core/generator';
import { loadUserAssets, type AssetRow } from '../../core/sn/related';
import { useT } from '../../i18n';
import { useStore } from '../../state/store';
import { Badge, Button, Card, cx, Disclosure, Empty, Field, Input, Notice, SectionHeader, TextArea, Tooltip } from '../components/ui';
import { NextStep } from '../components/NextStep';

const SOURCE = { g_form: 'Read from the ticket form', rest: 'Read from ServiceNow', dom: 'Read from the page', title: 'Read from the page title', user: 'Read from the user profile' } as const;

/** A ticket value the technician can correct. Edits only change the generated notes. */
export function EditableField({ k, label, multiline, icon, placeholder }: { k: FieldKey; label: string; multiline?: boolean; icon?: JSX.Element; placeholder?: string }) {
  const t = useT();
  const { snapshot, draft, patchDraft } = useStore();
  const value = fieldValue(snapshot, draft, k);
  const overridden = draft.overrides[k] !== undefined;
  const src = snapshot?.fields[k];
  const set = (v: string) => patchDraft((d) => void (d.overrides[k] = v));
  const reset = () => patchDraft((d) => void delete d.overrides[k]);
  return (
    <Field
      label={t(label)}
      right={
        overridden ? (
          <button type="button" onClick={reset} className="mb-1.5 flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:underline dark:text-brand-400">
            <RotateCcw size={12} /> {t('Undo change')}
          </button>
        ) : null
      }
    >
      {multiline ? (
        <TextArea value={value} onChange={(e) => set(e.target.value)} rows={4} title={src ? t(SOURCE[src.source]) : undefined} placeholder={placeholder ? t(placeholder) : undefined} />
      ) : (
        <div className="relative">
          {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span>}
          <Input value={value} onChange={(e) => set(e.target.value)} title={src ? t(SOURCE[src.source]) : undefined} data-source={src?.source} placeholder={placeholder ? t(placeholder) : t('Not filled in')} className={cx(icon && '!pl-9', overridden && '!border-brand-300 dark:!border-brand-500/60')} />
        </div>
      )}
    </Field>
  );
}

function stateTone(state: string): 'green' | 'amber' | 'red' | 'blue' | 'gray' {
  const s = state.toLowerCase();
  if (/resolv|closed|opgelost|gesloten/.test(s)) return 'green';
  if (/hold|pending|wacht|afwacht/.test(s)) return 'amber';
  if (/cancel|annul/.test(s)) return 'gray';
  return 'blue';
}
function priorityTone(p: string): 'red' | 'amber' | 'gray' {
  if (/^1|critical|kritiek/i.test(p)) return 'red';
  if (/^2|high|hoog/i.test(p)) return 'amber';
  return 'gray';
}

export function TicketTab() {
  const t = useT();
  const { snapshot, scanning, rescan, draft } = useStore();
  if (!snapshot)
    return (
      <Empty icon={scanning ? <RefreshCw size={26} className="animate-spin" /> : <ScanSearch size={26} />} title={scanning ? t('Reading the ticket…') : t('No ticket loaded yet')}>
        {!scanning && (
          <Button variant="primary" className="mt-4" icon={<RefreshCw size={15} />} onClick={() => rescan()}>
            {t('Read the ticket')}
          </Button>
        )}
      </Empty>
    );

  const num = fieldValue(snapshot, draft, 'number');
  const state = fieldValue(snapshot, draft, 'state');
  const prio = fieldValue(snapshot, draft, 'priority');
  const u = snapshot.user;

  return (
    <div className="space-y-5">
      <SectionHeader step={t('Step 1')} title={t('Review the ticket')} description={t('Everything below was read from ServiceNow automatically. Correct anything that is wrong — changes only affect your notes, not the ticket.')} />

      {snapshot.warnings.map((w) => (
        <Notice key={w} tone="amber" icon={<AlertTriangle size={16} />}>
          {t(w)}
        </Notice>
      ))}

      {/* Summary */}
      <section className="tk-card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-ink-500">{num || t('Unknown ticket')}</span>
          {state && <Badge tone={stateTone(state)}>{state}</Badge>}
          {prio && (
            <Badge tone={priorityTone(prio)} icon={priorityTone(prio) !== 'gray' ? <AlertTriangle size={12} /> : undefined}>
              {t('Priority')} {prio}
            </Badge>
          )}
          {u?.vip && <Badge tone="red">VIP</Badge>}
          <span className="flex-1" />
          <span className="flex items-center gap-1 text-[12px] text-ink-400">
            <Clock size={12} /> {t(SOURCE[snapshot.hasGForm ? 'g_form' : snapshot.sources.includes('rest') ? 'rest' : 'dom'])} · {new Date(snapshot.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <h3 className="mt-3 text-[18px] font-semibold leading-snug text-ink-900 dark:text-white">{fieldValue(snapshot, draft, 'short_description') || t('No short description')}</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-ink-100 pt-4 text-[13px] dark:border-ink-800">
          <Meta icon={<UserCog size={15} />} label={t('Engineer')} value={fieldValue(snapshot, draft, 'assigned_to')} />
          <Meta icon={<Building2 size={15} />} label={t('Team')} value={fieldValue(snapshot, draft, 'assignment_group')} />
        </div>
      </section>

      <Card title={t('Who is affected?')} icon={<User size={18} />} description={t('Used to address the user and in your notes.')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <EditableField k="affected_user" label="Affected user" icon={<User size={15} />} />
          <EditableField k="phone" label="Phone" icon={<Phone size={15} />} />
          <EditableField k="email" label="Email" icon={<Mail size={15} />} />
          <EditableField k="configuration_item" label="Device / configuration item" icon={<Laptop size={15} />} />
        </div>
      </Card>

      <Disclosure title={t('More ticket details')} description={t('Status, priority, caller and description')} icon={<MessageSquareText size={18} />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <EditableField k="state" label="Status" />
          <EditableField k="priority" label="Priority" />
          <EditableField k="impact" label="Impact" />
          <EditableField k="urgency" label="Urgency" />
          <EditableField k="caller" label="Caller" />
          <EditableField k="assigned_to" label="Engineer" />
          <EditableField k="assignment_group" label="Team" />
          <EditableField k="number" label="Ticket number" />
        </div>
        <div className="mt-4 space-y-4">
          <EditableField k="short_description" label="Short description" />
          <EditableField k="description" label="Description" multiline />
        </div>
      </Disclosure>

      <SlaCard />
      <DevicesCard />
      <HistoryCard />

      <NextStep to="contact" label="Next: contact the user" hint="Looks right? Continue to step 2." />
    </div>
  );
}

function Meta({ icon, label, value }: { icon: JSX.Element; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="text-ink-400">{icon}</span>
      <div className="min-w-0">
        <div className="text-[12px] text-ink-500">{label}</div>
        <div className="truncate font-medium text-ink-800 dark:text-ink-100">{value || '—'}</div>
      </div>
    </div>
  );
}

function SlaCard() {
  const t = useT();
  const snapshot = useStore((s) => s.snapshot)!;
  if (!snapshot.sla.length) return null;
  return (
    <Card title={t('Deadlines (SLA)')} icon={<Timer size={18} />} description={t('How much time is left to solve this ticket.')}>
      <div className="space-y-4">
        {snapshot.sla.map((s, i) => {
          const over = s.breached || s.percentage >= 100;
          const warn = !over && s.percentage >= 75;
          return (
            <div key={i}>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]">
                <span className="font-medium">{s.name}</span>
                {over ? (
                  <Badge tone="red" icon={<AlertTriangle size={12} />}>{t('Deadline passed')}</Badge>
                ) : warn ? (
                  <Badge tone="amber" icon={<Clock size={12} />}>{t('Almost due')}</Badge>
                ) : (
                  <Badge tone="green">{t('On track')}</Badge>
                )}
                <span className="flex-1" />
                {s.timeLeft && <span className="text-ink-500">{t('{time} left', { time: s.timeLeft })}</span>}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800" role="progressbar" aria-valuenow={Math.round(s.percentage)} aria-valuemin={0} aria-valuemax={100}>
                <div className={cx('h-full rounded-full transition-all duration-700', over ? 'bg-rose-500' : warn ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(100, s.percentage)}%` }} />
              </div>
              {s.due && <div className="mt-1.5 text-[12px] text-ink-500">{t('Due')} {s.due}</div>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DevicesCard() {
  const t = useT();
  const { snapshot, patchDraft, setTab, toast } = useStore();
  const [assets, setAssets] = useState<AssetRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const userId = snapshot?.user?.sysId;
  useEffect(() => {
    setAssets(null);
    if (!userId || !snapshot) return;
    setLoading(true);
    loadUserAssets(snapshot.gck, userId)
      .then(setAssets)
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  if (!userId) return null;
  return (
    <Disclosure
      title={t("User's devices")}
      description={loading ? t('Loading…') : assets ? t('{n} device(s) registered to this user', { n: assets.length }) : ''}
      icon={<Cpu size={18} />}
    >
      {!assets?.length ? (
        <p className="text-[13px] text-ink-500">{loading ? t('Loading…') : t('No devices are registered to this user.')}</p>
      ) : (
        <ul className="divide-y divide-ink-100 dark:divide-ink-800">
          {assets.map((a) => (
            <li key={a.sysId} className="flex items-center gap-3 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-500 dark:bg-ink-800">
                <Laptop size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium">{a.name || a.model}</div>
                <div className="flex flex-wrap gap-x-3 text-[12px] text-ink-500">
                  {a.serial && (
                    <Tooltip label={t('Copy serial number')}>
                      <button type="button" className="inline-flex items-center gap-1 hover:text-brand-600" onClick={async () => toast((await copyText(a.serial)) ? 'success' : 'error', 'Serial number copied')}>
                        {t('Serial')} {a.serial} <Copy size={11} />
                      </button>
                    </Tooltip>
                  )}
                  {a.assetTag && <span>{t('Asset tag')} {a.assetTag}</span>}
                  {a.status && <span>{a.status}</span>}
                </div>
              </div>
              <Button
                size="sm"
                variant="subtle"
                onClick={() => {
                  patchDraft((d) => void (d.overrides.configuration_item = a.name || a.model));
                  toast('success', 'Device selected', a.name || a.model);
                }}
              >
                {t('Use this device')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  patchDraft((d) => {
                    d.hardware.include = true;
                    d.hardware.oldSerial = a.serial || '';
                    d.hardware.model = d.hardware.model || a.model || '';
                  });
                  setTab('update');
                }}
              >
                {t('Replace')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Disclosure>
  );
}

function HistoryCard() {
  const t = useT();
  const snapshot = useStore((s) => s.snapshot)!;
  const wn = snapshot.fields.work_notes?.display;
  const cm = snapshot.fields.comments?.display;
  if (!wn && !cm) return null;
  return (
    <Disclosure title={t('Earlier notes on this ticket')} description={t('Read what colleagues already did.')} icon={<History size={18} />}>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          [t('Work notes'), wn],
          [t('Customer replies'), cm],
        ].map(([label, v]) => (
          <div key={label}>
            <div className="tk-label">{label}</div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-ink-50 p-3.5 font-sans text-[12.5px] leading-relaxed text-ink-700 dark:bg-ink-850 dark:text-ink-300">{v || '—'}</pre>
          </div>
        ))}
      </div>
    </Disclosure>
  );
}
