import { useState } from 'react';
import { ClipboardCheck, Lightbulb, MessageSquareHeart, PackageCheck, Plus, Route, Search as SearchIcon, X } from 'lucide-react';
import { COMMON_ACTIONS } from '../../core/draft';
import { useT } from '../../i18n';
import { useStore } from '../../state/store';
import { Badge, Button, Card, Disclosure, Dropdown, Field, Input, Pill, SectionHeader, Switch, TextArea } from '../components/ui';
import { NextStep } from '../components/NextStep';

const REQUEST_TYPES = ['Replacement', 'Repair', 'New device', 'Return', 'Loan device'];
const DEVICE_TYPES = ['Laptop', 'Desktop', 'Monitor', 'Docking station', 'Mobile phone', 'Tablet', 'Headset', 'Keyboard / mouse', 'Other'];
const DELIVERY = ['Courier (POD)', 'Pick-up at service desk', 'On-site delivery by engineer', 'Internal mail'];
const SLOTS = ['08:00–12:00', '12:00–17:00', 'Whole day'];

export function UpdateTab() {
  const t = useT();
  const { draft, patchDraft } = useStore();
  const [custom, setCustom] = useState('');
  const u = draft.update;
  const set = (patch: Partial<typeof u>) => patchDraft((d) => Object.assign(d.update, patch));
  const common = COMMON_ACTIONS.map((a) => t(a));
  const toggle = (a: string) => set({ actions: u.actions.includes(a) ? u.actions.filter((x) => x !== a) : [...u.actions, a] });

  return (
    <div className="space-y-5">
      <SectionHeader step={t('Step 3')} title={t('What did you do?')} description={t('Tick what you did and describe what you found. This becomes your internal work notes.')} />

      <Card title={t('Actions you performed')} icon={<ClipboardCheck size={18} />} description={t('Tap everything that applies.')}>
        <div className="flex flex-wrap gap-2">
          {[...common, ...u.actions.filter((a) => !common.includes(a))].map((a) => (
            <Pill key={a} on={u.actions.includes(a)} onClick={() => toggle(a)}>
              {a}
            </Pill>
          ))}
        </div>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (custom.trim()) {
              set({ actions: [...u.actions, custom.trim()] });
              setCustom('');
            }
          }}
        >
          <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={t('Something else? Type it here…')} aria-label={t('Add another action')} />
          <Button type="submit" icon={<Plus size={16} />} disabled={!custom.trim()}>
            {t('Add')}
          </Button>
        </form>
      </Card>

      <Card title={t('What did you find?')} icon={<SearchIcon size={18} />}>
        <Field label={t('Findings')} help={t('Internal — only colleagues see this.')}>
          <TextArea value={u.updateText} onChange={(e) => set({ updateText: e.target.value })} placeholder={t('e.g. VPN certificate had expired. Renewed it and the connection is stable again.')} rows={4} />
        </Field>
      </Card>

      <Card title={t('Message for the user')} icon={<MessageSquareHeart size={18} />} description={t('Optional. Added to the customer reply in friendly language.')}>
        <TextArea value={u.customerUpdate} onChange={(e) => set({ customerUpdate: e.target.value })} placeholder={t('e.g. Your laptop works again. Please restart it once more this evening.')} />
      </Card>

      <Disclosure title={t('Next steps')} description={t('Optional — what still needs to happen?')} icon={<Route size={18} />} defaultOpen={!!u.nextSteps}>
        <TextArea value={u.nextSteps} onChange={(e) => set({ nextSteps: e.target.value })} rows={3} />
      </Disclosure>

      <HardwareSection />

      {u.suggestions.length > 0 && (
        <Card title={t('Suggestions you noted')} icon={<Lightbulb size={18} />} description={t('These appear in the notes as "not yet performed".')}>
          <ul className="space-y-2">
            {u.suggestions.map((s) => (
              <li key={s} className="flex items-center gap-3 rounded-xl bg-ink-50 px-3 py-2 text-[13px] dark:bg-ink-850">
                <Badge tone="amber">{t('Not done yet')}</Badge>
                <span className="flex-1">{s}</span>
                <button type="button" aria-label={t('Remove')} className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-rose-600" onClick={() => set({ suggestions: u.suggestions.filter((x) => x !== s) })}>
                  <X size={15} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <NextStep to="templates" label="Next: choose a template" />
    </div>
  );
}

function HardwareSection() {
  const t = useT();
  const { draft, patchDraft } = useStore();
  const h = draft.hardware;
  const set = (p: Partial<typeof h>) => patchDraft((d) => Object.assign(d.hardware, p));
  const opts = (list: string[]) => list.map((x) => ({ value: t(x), label: t(x) }));
  return (
    <Disclosure
      title={t('Hardware & delivery')}
      description={t('Only needed when a device is replaced, repaired or delivered.')}
      icon={<PackageCheck size={18} />}
      defaultOpen={h.include}
      badge={h.include ? <Badge tone="green">{t('Included')}</Badge> : undefined}
    >
      <Switch checked={h.include} onChange={(v) => set({ include: v })} label={t('Add hardware details to my notes')} description={t('The user only sees the delivery date, method and tracking number.')} />
      {h.include && (
        <div className="mt-5 animate-tk-rise space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('What is happening?')}>
              <Dropdown value={h.requestType} onChange={(v) => set({ requestType: v })} placeholder={t('Choose…')} options={opts(REQUEST_TYPES)} />
            </Field>
            <Field label={t('Device type')}>
              <Dropdown value={h.deviceType} onChange={(v) => set({ deviceType: v })} placeholder={t('Choose…')} options={opts(DEVICE_TYPES)} />
            </Field>
            <Field label={t('Model')}>
              <Input value={h.model} onChange={(e) => set({ model: e.target.value })} placeholder="Latitude 7450" />
            </Field>
            <Field label={t('Asset tag (new device)')}>
              <Input value={h.assetTag} onChange={(e) => set({ assetTag: e.target.value })} />
            </Field>
            <Field label={t('Serial number (new device)')}>
              <Input value={h.serial} onChange={(e) => set({ serial: e.target.value })} />
            </Field>
            <Field label={t('Serial number (old device)')}>
              <Input value={h.oldSerial} onChange={(e) => set({ oldSerial: e.target.value })} />
            </Field>
          </div>
          <div>
            <div className="tk-label">{t('How will it be delivered?')}</div>
            <div className="flex flex-wrap gap-2">
              {DELIVERY.map((x) => (
                <Pill key={x} on={h.deliveryMethod === t(x)} onClick={() => set({ deliveryMethod: t(x) })}>
                  {t(x)}
                </Pill>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('Delivery date')}>
              <Input type="date" value={h.deliveryDate} onChange={(e) => set({ deliveryDate: e.target.value })} />
            </Field>
            <Field label={t('Time slot')}>
              <Dropdown value={h.timeSlot} onChange={(v) => set({ timeSlot: v })} placeholder={t('Any time')} options={[{ value: '', label: t('Any time') }, ...opts(SLOTS)]} />
            </Field>
            <Field label={t('Carrier')}>
              <Input value={h.carrier} onChange={(e) => set({ carrier: e.target.value })} placeholder="PostNL, DHL…" />
            </Field>
            <Field label={t('Tracking / proof of delivery number')}>
              <Input value={h.podReference} onChange={(e) => set({ podReference: e.target.value })} />
            </Field>
          </div>
          <Field label={t('Delivery address')} help={t('Internal — not shown to the user.')}>
            <TextArea rows={2} value={h.address} onChange={(e) => set({ address: e.target.value })} />
          </Field>
          <Switch checked={h.backupConfirmed} onChange={(v) => set({ backupConfirmed: v })} label={t("The user's data is backed up")} />
        </div>
      )}
    </Disclosure>
  );
}
