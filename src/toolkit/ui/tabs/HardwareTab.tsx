import { PackageCheck, Truck } from 'lucide-react';
import { fieldValue } from '../../core/generator';
import { useStore } from '../../state/store';
import { Card, Chip, Field, Input, Select, TextArea, Toggle } from '../components/ui';

const REQUEST_TYPES = ['Replacement', 'Repair', 'New device', 'Return', 'Loan device'];
const DEVICE_TYPES = ['Laptop', 'Desktop', 'Monitor', 'Docking station', 'Mobile phone', 'Tablet', 'Headset', 'Keyboard / mouse', 'Other'];
const DELIVERY = ['Courier (POD)', 'Pick-up at service desk', 'On-site delivery by engineer', 'Internal mail'];
const SLOTS = ['08:00–12:00', '12:00–17:00', 'Whole day'];

export function HardwareTab() {
  const { draft, patchDraft, snapshot } = useStore();
  const h = draft.hardware;
  const set = (p: Partial<typeof h>) => patchDraft((d) => Object.assign(d.hardware, p));
  return (
    <div className="space-y-4">
      <Card title="Hardware request" icon={<PackageCheck size={15} />}>
        <Toggle checked={h.include} onChange={(v) => set({ include: v })} label="Include hardware details in generated notes" description="Work notes get full details; customer comments only get delivery date, method and reference." />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Request type">
            <Select value={h.requestType} onChange={(e) => set({ requestType: e.target.value })}>
              {REQUEST_TYPES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
          <Field label="Device type">
            <Select value={h.deviceType} onChange={(e) => set({ deviceType: e.target.value })}>
              {DEVICE_TYPES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
          <Field label="Model">
            <Input value={h.model} onChange={(e) => set({ model: e.target.value })} placeholder={fieldValue(snapshot, draft, 'configuration_item') || 'e.g. Latitude 7450'} />
          </Field>
          <Field label="Asset tag (new)">
            <Input value={h.assetTag} onChange={(e) => set({ assetTag: e.target.value })} />
          </Field>
          <Field label="Serial number (new)">
            <Input value={h.serial} onChange={(e) => set({ serial: e.target.value })} />
          </Field>
          <Field label="Serial number (old / return)">
            <Input value={h.oldSerial} onChange={(e) => set({ oldSerial: e.target.value })} />
          </Field>
        </div>
        <div className="mt-3">
          <Toggle checked={h.backupConfirmed} onChange={(v) => set({ backupConfirmed: v })} label="User data backup confirmed" />
        </div>
      </Card>

      <Card title="Delivery & proof of delivery (POD)" icon={<Truck size={15} />}>
        <span className="tk-label">Delivery method</span>
        <div className="flex flex-wrap gap-1.5">
          {DELIVERY.map((x) => (
            <Chip key={x} on={h.deliveryMethod === x} onClick={() => set({ deliveryMethod: x })}>
              {x}
            </Chip>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Carrier">
            <Input value={h.carrier} onChange={(e) => set({ carrier: e.target.value })} placeholder="e.g. PostNL, DHL" />
          </Field>
          <Field label="POD / tracking reference">
            <Input value={h.podReference} onChange={(e) => set({ podReference: e.target.value })} />
          </Field>
          <Field label="Delivery date">
            <Input type="date" value={h.deliveryDate} onChange={(e) => set({ deliveryDate: e.target.value })} />
          </Field>
          <Field label="Time slot">
            <Select value={h.timeSlot} onChange={(e) => set({ timeSlot: e.target.value })}>
              <option value="">—</option>
              {SLOTS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Delivery address (internal)" className="mt-3">
          <TextArea rows={2} value={h.address} onChange={(e) => set({ address: e.target.value })} />
        </Field>
        <Field label="Hardware notes (internal)" className="mt-3">
          <TextArea rows={2} value={h.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      </Card>
    </div>
  );
}
