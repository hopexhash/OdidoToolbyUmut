import { useState } from 'react';
import { FileText, ListChecks, Plus, Settings2, Sparkles, X } from 'lucide-react';
import { COMMON_ACTIONS } from '../../core/draft';
import { buildVariables } from '../../core/generator';
import { renderTemplate } from '../../core/templates/engine';
import { useDerived, useStore } from '../../state/store';
import { Badge, Button, Card, Chip, Field, Input, TextArea } from '../components/ui';
import { TemplatePicker } from './TemplatePicker';
import { TemplateManager } from './TemplateManager';

export function UpdateTab() {
  const { draft, patchDraft, snapshot, settings } = useStore();
  const { template } = useDerived();
  const [manage, setManage] = useState(false);
  const [custom, setCustom] = useState('');
  const u = draft.update;
  const set = (patch: Partial<typeof u>) => patchDraft((d) => Object.assign(d.update, patch));
  const toggleAction = (a: string) => set({ actions: u.actions.includes(a) ? u.actions.filter((x) => x !== a) : [...u.actions, a] });
  const vars = buildVariables(snapshot, draft, settings);

  if (manage)
    return (
      <div className="space-y-3">
        <Button size="sm" onClick={() => setManage(false)}>
          ← Back to update details
        </Button>
        <TemplateManager />
      </div>
    );

  return (
    <div className="space-y-4">
      <Card
        title="Template"
        icon={<FileText size={15} />}
        actions={
          <Button size="sm" variant="ghost" icon={<Settings2 size={13} />} onClick={() => setManage(true)}>
            Manage
          </Button>
        }
      >
        <TemplatePicker />
        {template && (
          <div className="mt-3 rounded-lg border border-ink-200 bg-ink-50 p-2.5 text-[12px] dark:border-ink-700 dark:bg-ink-850">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-semibold">{template.name}</span>
              <Badge color="blue">selected</Badge>
            </div>
            <p className="whitespace-pre-wrap text-ink-600 dark:text-ink-300">{renderTemplate(template.workNotes, vars) || '—'}</p>
          </div>
        )}
      </Card>

      <Card title="Actions performed" icon={<ListChecks size={15} />}>
        <div className="flex flex-wrap gap-1.5">
          {[...COMMON_ACTIONS, ...u.actions.filter((a) => !COMMON_ACTIONS.includes(a))].map((a) => (
            <Chip key={a} on={u.actions.includes(a)} onClick={() => toggleAction(a)}>
              {a}
            </Chip>
          ))}
        </div>
        <form
          className="mt-2.5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (custom.trim()) {
              set({ actions: [...u.actions, custom.trim()] });
              setCustom('');
            }
          }}
        >
          <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add a custom action you performed…" />
          <Button type="submit" size="md" icon={<Plus size={14} />}>
            Add
          </Button>
        </form>
      </Card>

      <Card title="Technician update">
        <div className="space-y-3">
          <Field label="Findings / update (internal)">
            <TextArea value={u.updateText} onChange={(e) => set({ updateText: e.target.value })} placeholder="What did you find? What was changed?" rows={4} />
          </Field>
          <Field label="Message to customer (customer visible)" hint="Only this text, the template's customer text and contact/follow-up details are used in additional comments.">
            <TextArea value={u.customerUpdate} onChange={(e) => set({ customerUpdate: e.target.value })} placeholder="Optional — friendly explanation for the user" />
          </Field>
          <Field label="Next steps (internal)">
            <TextArea value={u.nextSteps} onChange={(e) => set({ nextSteps: e.target.value })} rows={2} />
          </Field>
        </div>
      </Card>

      {u.suggestions.length > 0 && (
        <Card title="Recorded suggestions — not performed" icon={<Sparkles size={15} />}>
          <ul className="space-y-1">
            {u.suggestions.map((s) => (
              <li key={s} className="flex items-center gap-2 text-[12.5px]">
                <span className="flex-1">{s}</span>
                <button type="button" className="text-ink-400 hover:text-rose-500" onClick={() => set({ suggestions: u.suggestions.filter((x) => x !== s) })}>
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
