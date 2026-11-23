import { CalendarClock, Mail, MessagesSquare, Phone, ExternalLink } from 'lucide-react';
import { addDays, nextWorkday, toIsoDate, weekday } from '../../core/dates';
import { PENDING_REASONS, type ContactMethod, type ContactOutcome } from '../../core/draft';
import { fieldValue, OUTCOME_LABEL } from '../../core/generator';
import { useStore } from '../../state/store';
import { Card, Chip, cx, Field, Input, Select, TextArea } from '../components/ui';

const METHODS: { id: Exclude<ContactMethod, ''>; label: string; icon: JSX.Element; desc: string }[] = [
  { id: 'teams', label: 'Microsoft Teams', icon: <MessagesSquare size={18} />, desc: 'Chat or call' },
  { id: 'phone', label: 'Telephone', icon: <Phone size={18} />, desc: 'Voice call' },
  { id: 'email', label: 'Email', icon: <Mail size={18} />, desc: 'Written contact' },
];

const QUICK_TIMES = ['09:00', '10:30', '13:00', '14:30', '16:00'];

export function ContactTab() {
  const { draft, patchDraft, snapshot } = useStore();
  const c = draft.contact;
  const set = (patch: Partial<typeof c>) => patchDraft((d) => Object.assign(d.contact, patch));
  const email = fieldValue(snapshot, draft, 'email');
  const phone = fieldValue(snapshot, draft, 'phone');
  const today = new Date();
  const quickDates = [
    { label: 'Today', iso: toIsoDate(today) },
    { label: 'Tomorrow', iso: toIsoDate(addDays(today, 1)) },
    { label: 'Next workday', iso: toIsoDate(nextWorkday(today)) },
  ];

  return (
    <div className="space-y-4">
      <Card title="Contact method">
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => set({ method: c.method === m.id ? '' : m.id })}
              className={cx(
                'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition',
                c.method === m.id
                  ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/15 dark:bg-brand-500/10'
                  : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-850',
              )}
            >
              <span className={cx(c.method === m.id ? 'text-brand-600 dark:text-brand-300' : 'text-ink-400')}>{m.icon}</span>
              <span className="text-[13px] font-semibold">{m.label}</span>
              <span className="text-[11px] text-ink-500">{m.desc}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
          {email && (
            <a className="inline-flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400" href={`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`} target="_blank" rel="noreferrer">
              <ExternalLink size={12} /> Open Teams chat
            </a>
          )}
          {phone && (
            <a className="inline-flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
              <Phone size={12} /> Call {phone}
            </a>
          )}
          {email && (
            <a className="inline-flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400" href={`mailto:${email}?subject=${encodeURIComponent(fieldValue(snapshot, draft, 'number'))}`}>
              <Mail size={12} /> Email {email}
            </a>
          )}
        </div>
        <div className="mt-4">
          <span className="tk-label">Outcome</span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(OUTCOME_LABEL) as Exclude<ContactOutcome, ''>[]).map((o) => (
              <Chip key={o} on={c.outcome === o} onClick={() => set({ outcome: c.outcome === o ? '' : o })}>
                {OUTCOME_LABEL[o]}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Follow-up" icon={<CalendarClock size={15} />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Field label="Follow-up date">
              <Input type="date" value={c.followDate} onChange={(e) => set({ followDate: e.target.value })} />
            </Field>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickDates.map((q) => (
                <Chip key={q.label} on={c.followDate === q.iso} onClick={() => set({ followDate: c.followDate === q.iso ? '' : q.iso })}>
                  {q.label}
                </Chip>
              ))}
            </div>
            {c.followDate && <p className="mt-1.5 text-[11px] capitalize text-ink-500">{weekday(c.followDate, 'en')}</p>}
          </div>
          <div>
            <Field label="Follow-up time">
              <Input type="time" value={c.followTime} onChange={(e) => set({ followTime: e.target.value })} />
            </Field>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_TIMES.map((t) => (
                <Chip key={t} on={c.followTime === t} onClick={() => set({ followTime: c.followTime === t ? '' : t })}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <Field label="Pending reason" className="mt-4">
          <Select value={c.pendingReason} onChange={(e) => set({ pendingReason: e.target.value })}>
            <option value="">— None —</option>
            {PENDING_REASONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <Card title="Contact note (internal)">
        <TextArea value={c.note} onChange={(e) => set({ note: e.target.value })} placeholder="e.g. User prefers contact after 14:00, works from home on Fridays…" />
      </Card>
    </div>
  );
}
