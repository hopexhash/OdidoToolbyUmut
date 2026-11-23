import { useState } from 'react';
import { AlertTriangle, ChevronDown, Clock, Database, RotateCcw, ScanSearch, Timer, User } from 'lucide-react';
import type { FieldKey } from '../../core/fields';
import { fieldValue } from '../../core/generator';
import { useStore } from '../../state/store';
import { Badge, Button, Card, cx, Empty, Field, Input, TextArea } from '../components/ui';

const SOURCE_LABEL: Record<string, string> = { g_form: 'GlideForm', rest: 'REST', dom: 'DOM', title: 'Title', user: 'User record' };

export function EditableField({ k, label, multiline }: { k: FieldKey; label: string; multiline?: boolean }) {
  const { snapshot, draft, patchDraft } = useStore();
  const value = fieldValue(snapshot, draft, k);
  const overridden = draft.overrides[k] !== undefined;
  const src = snapshot?.fields[k];
  const set = (v: string) => patchDraft((d) => void (d.overrides[k] = v));
  const reset = () => patchDraft((d) => void delete d.overrides[k]);
  return (
    <Field
      label={label}
      right={
        overridden ? (
          <button type="button" onClick={reset} className="flex items-center gap-0.5 text-[10.5px] font-medium text-brand-600 hover:underline dark:text-brand-400" title="Reset to the value from ServiceNow">
            <RotateCcw size={10} /> edited
          </button>
        ) : src ? (
          <span className="text-[10px] text-ink-400" title={src.snField}>
            {SOURCE_LABEL[src.source]}
          </span>
        ) : null
      }
    >
      {multiline ? (
        <TextArea value={value} onChange={(e) => set(e.target.value)} rows={3} />
      ) : (
        <Input value={value} onChange={(e) => set(e.target.value)} placeholder="—" className={cx(overridden && '!border-brand-300 dark:!border-brand-500/60')} />
      )}
    </Field>
  );
}

export function TicketTab() {
  const { snapshot, scanning, rescan } = useStore();
  const [showHistory, setShowHistory] = useState(false);
  if (!snapshot)
    return (
      <Empty icon={<ScanSearch size={34} />} title={scanning ? 'Scanning ServiceNow…' : 'No scan yet'}>
        <Button size="sm" className="mt-3" onClick={() => rescan()}>
          Scan now
        </Button>
      </Empty>
    );
  const u = snapshot.user;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
        <Database size={12} />
        <span>
          {snapshot.table || 'unknown table'}
          {snapshot.sysId ? ` · ${snapshot.sysId.slice(0, 8)}…` : ''}
        </span>
        {snapshot.sources.map((s) => (
          <Badge key={s} color="green">
            {SOURCE_LABEL[s]}
          </Badge>
        ))}
        {!snapshot.hasToken && <Badge color="amber">no session token</Badge>}
        <span className="ml-auto flex items-center gap-1">
          <Clock size={11} /> scanned {new Date(snapshot.scannedAt).toLocaleTimeString()}
        </span>
      </div>

      {snapshot.warnings.map((w) => (
        <div key={w} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {w}
        </div>
      ))}

      <Card title="Ticket" actions={<span className="text-[11px] text-ink-400">Edits only affect generated notes</span>}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <EditableField k="number" label="Ticket number" />
          <EditableField k="affected_user" label="Affected user" />
          <EditableField k="phone" label="Phone" />
          <EditableField k="email" label="Email" />
          <EditableField k="configuration_item" label="Configuration item" />
          <EditableField k="state" label="Incident status" />
          <EditableField k="assigned_to" label="Engineer" />
          <EditableField k="priority" label="Priority" />
          <EditableField k="caller" label="Caller" />
          <EditableField k="assignment_group" label="Assignment group" />
          <EditableField k="impact" label="Impact" />
          <EditableField k="urgency" label="Urgency" />
        </div>
        <div className="mt-3 space-y-3">
          <EditableField k="short_description" label="Short description" />
          <EditableField k="description" label="Description" multiline />
        </div>
      </Card>

      {u && (
        <Card title="Affected user" icon={<User size={15} />}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px] sm:grid-cols-3">
            <Info k="Name" v={u.name} extra={u.vip ? <Badge color="red">VIP</Badge> : null} />
            <Info k="User ID" v={u.userName} />
            <Info k="Email" v={u.email} />
            <Info k="Mobile" v={u.mobile} />
            <Info k="Phone" v={u.phone} />
            <Info k="Department" v={u.department} />
            <Info k="Location" v={u.location} />
            <Info k="Title" v={u.title} />
          </div>
        </Card>
      )}

      <Card title="SLA" icon={<Timer size={15} />}>
        {snapshot.sla.length ? (
          <div className="space-y-2.5">
            {snapshot.sla.map((s, i) => (
              <div key={i}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="font-medium">{s.name}</span>
                  <span className="flex items-center gap-1.5 text-ink-500">
                    {s.stage && <Badge>{s.stage}</Badge>}
                    {s.breached && <Badge color="red">Breached</Badge>}
                    {s.due && <span>due {s.due}</span>}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                  <div
                    className={cx('h-full rounded-full', s.breached || s.percentage >= 100 ? 'bg-rose-500' : s.percentage >= 75 ? 'bg-amber-500' : 'bg-emerald-500')}
                    style={{ width: `${Math.min(100, s.percentage)}%` }}
                  />
                </div>
                {s.timeLeft && <div className="mt-0.5 text-[11px] text-ink-400">Time left: {s.timeLeft}</div>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-500">{snapshot.sysId ? 'No SLA records found (or no access to task_sla).' : 'Available once a saved ticket is detected.'}</p>
        )}
      </Card>

      <Card
        title="Existing work notes & comments"
        actions={
          <button type="button" onClick={() => setShowHistory(!showHistory)} className="text-ink-500">
            <ChevronDown size={16} className={cx('transition', showHistory && 'rotate-180')} />
          </button>
        }
      >
        {showHistory ? (
          <div className="grid gap-3 md:grid-cols-2">
            {(['work_notes', 'comments'] as const).map((k) => (
              <div key={k}>
                <div className="tk-label">{k === 'work_notes' ? 'Work notes' : 'Additional comments'}</div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-50 p-2.5 font-sans text-[12px] text-ink-700 dark:bg-ink-850 dark:text-ink-300">
                  {snapshot.fields[k]?.display || '—'}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-500">Expand to read the journal history of this ticket.</p>
        )}
      </Card>
    </div>
  );
}

function Info({ k, v, extra }: { k: string; v: string; extra?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] uppercase tracking-wide text-ink-400">{k}</div>
      <div className="flex items-center gap-1 truncate">
        {v || '—'} {extra}
      </div>
    </div>
  );
}
