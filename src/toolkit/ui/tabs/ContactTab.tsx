import { CalendarDays, Clock, ExternalLink, Mail, MessageCircleMore, MessagesSquare, Phone, PhoneMissed, PhoneOff, Send, UserCheck, Voicemail } from 'lucide-react';
import { addDays, formatIso, nextWorkday, toIsoDate, weekday } from '../../core/dates';
import { PENDING_REASONS, type ContactMethod, type ContactOutcome } from '../../core/draft';
import { fieldValue } from '../../core/generator';
import { useLang, useT } from '../../i18n';
import { useStore } from '../../state/store';
import { Card, cx, Disclosure, Dropdown, Input, Pill, SectionHeader, TextArea } from '../components/ui';
import { NextStep } from '../components/NextStep';

const METHODS: { id: Exclude<ContactMethod, ''>; label: string; desc: string; icon: JSX.Element }[] = [
  { id: 'teams', label: 'Microsoft Teams', desc: 'Chat or Teams call', icon: <MessagesSquare size={22} /> },
  { id: 'phone', label: 'Telephone', desc: 'Regular phone call', icon: <Phone size={22} /> },
  { id: 'email', label: 'Email', desc: 'Written message', icon: <Mail size={22} /> },
];

const OUTCOMES: { id: Exclude<ContactOutcome, ''>; label: string; icon: JSX.Element }[] = [
  { id: 'reached', label: 'Reached the user', icon: <UserCheck size={15} /> },
  { id: 'no_answer', label: 'No answer', icon: <PhoneMissed size={15} /> },
  { id: 'voicemail', label: 'Left a voicemail', icon: <Voicemail size={15} /> },
  { id: 'message_sent', label: 'Sent a message', icon: <Send size={15} /> },
];

const QUICK_TIMES = ['09:00', '10:30', '13:00', '14:30', '16:00'];

export function ContactTab() {
  const t = useT();
  const lang = useLang();
  const { draft, patchDraft, snapshot, settings } = useStore();
  const c = draft.contact;
  const set = (patch: Partial<typeof c>) => patchDraft((d) => Object.assign(d.contact, patch));
  const email = fieldValue(snapshot, draft, 'email');
  const phone = fieldValue(snapshot, draft, 'phone');
  const name = fieldValue(snapshot, draft, 'affected_user') || t('the user');
  const today = new Date();
  const quickDates = [
    { label: 'Today', iso: toIsoDate(today) },
    { label: 'Tomorrow', iso: toIsoDate(addDays(today, 1)) },
    { label: 'Next workday', iso: toIsoDate(nextWorkday(today)) },
  ];
  const quickLink = (m: Exclude<ContactMethod, ''>) => {
    if (m === 'teams' && email) return { href: `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`, label: t('Open Teams chat'), icon: <ExternalLink size={13} /> };
    if (m === 'phone' && phone) return { href: `tel:${phone.replace(/[^\d+]/g, '')}`, label: t('Call {phone}', { phone }), icon: <Phone size={13} /> };
    if (m === 'email' && email) return { href: `mailto:${email}?subject=${encodeURIComponent(fieldValue(snapshot, draft, 'number'))}`, label: t('Write an email'), icon: <Mail size={13} /> };
    return null;
  };

  return (
    <div className="space-y-5">
      <SectionHeader step={t('Step 2')} title={t('Contact the user')} description={t('How did you reach {name}, and what happened?', { name })} />

      <Card title={t('How did you contact the user?')} icon={<MessageCircleMore size={18} />}>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t('Contact method')}>
          {METHODS.map((m) => {
            const on = c.method === m.id;
            const link = quickLink(m.id);
            return (
              <div
                key={m.id}
                role="radio"
                aria-checked={on}
                tabIndex={0}
                onClick={() => set({ method: on ? '' : m.id })}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), set({ method: on ? '' : m.id }))}
                className={cx(
                  'group relative flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 text-left transition duration-150 hover:-translate-y-0.5',
                  on ? 'border-brand-500 bg-brand-50/60 shadow-focus dark:bg-brand-500/10' : 'border-ink-200 bg-white hover:border-ink-300 hover:shadow-lift dark:border-ink-700 dark:bg-ink-850',
                )}
              >
                <span className={cx('flex h-11 w-11 items-center justify-center rounded-xl transition', on ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300')}>{m.icon}</span>
                <span>
                  <span className="block text-[14px] font-semibold">{t(m.label)}</span>
                  <span className="block text-[12.5px] text-ink-500">{t(m.desc)}</span>
                </span>
                {link && (
                  <a
                    href={link.href}
                    target={m.id === 'teams' ? '_blank' : undefined}
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {link.icon} {link.label}
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="tk-label">{t('What happened?')}</div>
          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map((o) => (
              <Pill key={o.id} on={c.outcome === o.id} icon={o.icon} onClick={() => set({ outcome: c.outcome === o.id ? '' : o.id })}>
                {t(o.label)}
              </Pill>
            ))}
          </div>
        </div>
      </Card>

      <Card title={t('When will you follow up?')} icon={<CalendarDays size={18} />} description={t('Optional. Leave empty if the ticket is solved.')}>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="tk-label">{t('Date')}</div>
            <div className="flex flex-wrap gap-2">
              {quickDates.map((q) => (
                <Pill key={q.label} on={c.followDate === q.iso} onClick={() => set({ followDate: c.followDate === q.iso ? '' : q.iso })}>
                  {t(q.label)}
                </Pill>
              ))}
            </div>
            <Input type="date" aria-label={t('Pick a date')} value={c.followDate} onChange={(e) => set({ followDate: e.target.value })} className="mt-3" />
            {c.followDate && (
              <p className="tk-help capitalize">
                {weekday(c.followDate, lang)} {formatIso(c.followDate, settings.dateFormat)}
              </p>
            )}
          </div>
          <div>
            <div className="tk-label">{t('Time')}</div>
            <div className="flex flex-wrap gap-2">
              {QUICK_TIMES.map((x) => (
                <Pill key={x} on={c.followTime === x} onClick={() => set({ followTime: c.followTime === x ? '' : x })}>
                  {x}
                </Pill>
              ))}
            </div>
            <div className="relative mt-3">
              <Clock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <Input type="time" aria-label={t('Pick a time')} value={c.followTime} onChange={(e) => set({ followTime: e.target.value })} className="!pl-9" />
            </div>
          </div>
        </div>
        <div className="mt-6">
          <div className="tk-label">{t('Why is the ticket waiting?')}</div>
          <Dropdown
            ariaLabel={t('Why is the ticket waiting?')}
            value={c.pendingReason}
            onChange={(v) => set({ pendingReason: v })}
            placeholder={t('Not waiting — no reason needed')}
            options={[{ value: '', label: t('Not waiting — no reason needed') }, ...PENDING_REASONS.map((p) => ({ value: p.id, label: t(p.label) }))]}
          />
        </div>
      </Card>

      <Disclosure title={t('Add a note about the contact')} description={t('Optional — for example the best time to call.')} icon={<PhoneOff size={18} />} defaultOpen={!!c.note}>
        <TextArea value={c.note} onChange={(e) => set({ note: e.target.value })} placeholder={t('e.g. User prefers to be called after 14:00.')} />
      </Disclosure>

      <NextStep to="update" label="Next: what did you do?" />
    </div>
  );
}
