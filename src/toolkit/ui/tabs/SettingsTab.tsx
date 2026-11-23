import { useRef, useState } from 'react';
import { Bot, Database, Download, FileText, Globe, Info, LogOut, RefreshCw, RotateCcw, Trash2, Upload, User } from 'lucide-react';
import { getApiKey, setApiKey } from '../../core/advice/ai';
import { copyText } from '../../core/clipboard';
import { FIELD_DEFS, DEFAULT_INSERT_SELECTORS, type FieldKey } from '../../core/fields';
import { safeParse, safeStringify } from '../../core/safeJson';
import { DEFAULT_SETTINGS, type Settings } from '../../core/settings';
import { storage } from '../../core/storage';
import { getBoot, VERSION } from '../../boot';
import { useStore } from '../../state/store';
import { Badge, Button, Card, cx, Field, Input, Select, TextArea, Toggle } from '../components/ui';
import { TemplateManager } from './TemplateManager';

type Section = 'profile' | 'servicenow' | 'mapping' | 'templates' | 'ai' | 'data' | 'about';
const SECTIONS: { id: Section; label: string; icon: JSX.Element }[] = [
  { id: 'profile', label: 'Profile', icon: <User size={14} /> },
  { id: 'servicenow', label: 'ServiceNow', icon: <Globe size={14} /> },
  { id: 'mapping', label: 'Field mapping', icon: <Database size={14} /> },
  { id: 'templates', label: 'Templates', icon: <FileText size={14} /> },
  { id: 'ai', label: 'AI', icon: <Bot size={14} /> },
  { id: 'data', label: 'Data', icon: <Download size={14} /> },
  { id: 'about', label: 'About', icon: <Info size={14} /> },
];

const lines = (v: string) => v.split('\n').map((s) => s.trim()).filter(Boolean);
const csv = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);

export function SettingsTab() {
  const [section, setSection] = useState<Section>(() => storage.session.get<Section>('settingsSection', 'profile'));
  const pick = (s: Section) => {
    setSection(s);
    storage.session.set('settingsSection', s);
  };
  return (
    <div className="flex gap-4">
      <nav className="w-36 shrink-0 space-y-0.5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => pick(s.id)}
            className={cx(
              'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-medium transition',
              section === s.id ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-850',
            )}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1 space-y-4">
        {section === 'profile' && <Profile />}
        {section === 'servicenow' && <ServiceNowSettings />}
        {section === 'mapping' && <Mapping />}
        {section === 'templates' && <TemplateManager />}
        {section === 'ai' && <AiSettingsView />}
        {section === 'data' && <DataSettings />}
        {section === 'about' && <About />}
      </div>
    </div>
  );
}

function Profile() {
  const { settings: s, updateSettings: u, snapshot } = useStore();
  return (
    <Card title="Profile">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Technician name" hint={!s.technicianName && snapshot?.sessionUser ? `Using your ServiceNow name: ${snapshot.sessionUser}` : undefined}>
          <Input value={s.technicianName} onChange={(e) => u({ technicianName: e.target.value })} placeholder={snapshot?.sessionUser || ''} />
        </Field>
        <Field label="Department">
          <Input value={s.department} onChange={(e) => u({ department: e.target.value })} />
        </Field>
        <Field label="Default customer language">
          <Select value={s.language} onChange={(e) => u({ language: e.target.value as Settings['language'] })}>
            <option value="nl">Nederlands</option>
            <option value="en">English</option>
          </Select>
        </Field>
        <Field label="Theme">
          <Select value={s.theme} onChange={(e) => u({ theme: e.target.value as Settings['theme'] })}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
        </Field>
        <Field label="Date format">
          <Select value={s.dateFormat} onChange={(e) => u({ dateFormat: e.target.value as Settings['dateFormat'] })}>
            {['dd-MM-yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy'].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Work notes signature" className="mt-3" hint="Variables allowed, e.g. — {{technician}}, {{department}}. Leave empty for the default.">
        <TextArea rows={2} value={s.signature} onChange={(e) => u({ signature: e.target.value })} />
      </Field>
    </Card>
  );
}

function ServiceNowSettings() {
  const { settings: s, updateSettings: u } = useStore();
  const boot = getBoot();
  return (
    <>
      <Card title="Authorized instances">
        <Field label="Allowed domains (one per line)" hint={`Exact hostnames or *.suffix patterns. Current page: ${location.hostname}`}>
          <TextArea rows={3} value={s.allowedDomains.join('\n')} onChange={(e) => u({ allowedDomains: lines(e.target.value) })} />
        </Field>
        {boot.domains.length > 0 && (
          <p className="mt-2 text-[11.5px] text-ink-500">
            Embedded in your bookmarklet: {boot.domains.map((d) => <Badge key={d} className="mr-1">{d}</Badge>)}
          </p>
        )}
      </Card>
      <Card title="Detection & insertion">
        <div className="space-y-3">
          <Toggle checked={s.useRestApi} onChange={(v) => u({ useRestApi: v })} label="Use the ServiceNow REST API (same instance, your session)" description="Needed for Workspaces, journals, user details, SLAs, assets and knowledge. Read-only." />
          <Toggle checked={s.autoRescan} onChange={(v) => u({ autoRescan: v })} label="Automatically rescan when you open another ticket" />
          <Field label="Insert mode">
            <Select value={s.insertMode} onChange={(e) => u({ insertMode: e.target.value as Settings['insertMode'] })}>
              <option value="append">Append to existing text in the field</option>
              <option value="replace">Replace text in the field</option>
            </Select>
          </Field>
        </div>
      </Card>
      <Card title="Journal field selectors" actions={<Button size="sm" variant="ghost" icon={<RotateCcw size={12} />} onClick={() => u({ insertSelectors: { ...DEFAULT_INSERT_SELECTORS } })}>Defaults</Button>}>
        <p className="mb-2 text-[11.5px] text-ink-500">
          Used when GlideForm is not available (Workspaces). CSS selectors, one per line, searched through shadow DOM. <code>{'{table}'}</code> is replaced by the ticket table.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Work notes">
            <TextArea rows={6} className="font-mono !text-[11px]" value={s.insertSelectors.work_notes.join('\n')} onChange={(e) => u({ insertSelectors: { ...s.insertSelectors, work_notes: lines(e.target.value) } })} />
          </Field>
          <Field label="Additional comments">
            <TextArea rows={6} className="font-mono !text-[11px]" value={s.insertSelectors.comments.join('\n')} onChange={(e) => u({ insertSelectors: { ...s.insertSelectors, comments: lines(e.target.value) } })} />
          </Field>
        </div>
      </Card>
    </>
  );
}

function Mapping() {
  const { settings: s, updateSettings: u, snapshot, rescan } = useStore();
  const setEntry = (k: FieldKey, patch: { fields?: string[]; selectors?: string[] }) => {
    const cur = s.fieldMap[k] || { fields: [], selectors: [] };
    u({ fieldMap: { ...s.fieldMap, [k]: { ...cur, ...patch } } });
  };
  return (
    <Card
      title="Field mapping"
      actions={
        <>
          <Button size="sm" variant="ghost" icon={<RotateCcw size={12} />} onClick={() => confirm('Reset all field mappings?') && u({ fieldMap: {} })}>
            Reset
          </Button>
          <Button size="sm" icon={<RefreshCw size={12} />} onClick={() => rescan()}>
            Test (rescan)
          </Button>
        </>
      }
    >
      <p className="mb-3 text-[11.5px] text-ink-500">
        For each toolkit field, list the ServiceNow column names to try (comma separated, in order) and optional CSS selectors as DOM fallback. Leave empty to use defaults.
      </p>
      <div className="space-y-2">
        {FIELD_DEFS.map((d) => {
          const e = s.fieldMap[d.key];
          const found = snapshot?.fields[d.key];
          return (
            <div key={d.key} className="grid items-start gap-2 rounded-lg border border-ink-100 p-2.5 dark:border-ink-800 md:grid-cols-[150px_1fr_1fr]">
              <div>
                <div className="text-[12.5px] font-medium">{d.label}</div>
                <div className="mt-0.5 truncate text-[11px]" title={found?.display}>
                  {found ? (
                    <span className="text-emerald-600 dark:text-emerald-400">✓ {found.snField} ({found.source})</span>
                  ) : (
                    <span className="text-ink-400">not found</span>
                  )}
                </div>
              </div>
              <Input className="font-mono !text-[11px]" placeholder={d.fields.join(', ')} value={(e?.fields || []).join(', ')} onChange={(ev) => setEntry(d.key, { fields: csv(ev.target.value) })} />
              <Input className="font-mono !text-[11px]" placeholder="CSS selector(s), comma separated" value={(e?.selectors || []).join(', ')} onChange={(ev) => setEntry(d.key, { selectors: csv(ev.target.value) })} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function AiSettingsView() {
  const { settings: s, updateSettings: u, toast } = useStore();
  const ai = s.ai;
  const [key, setKey] = useState(() => getApiKey(ai));
  const setAi = (p: Partial<Settings['ai']>) => u({ ai: { ...ai, ...p } });
  return (
    <Card title="External AI advice" icon={<Bot size={15} />} actions={<Badge color={ai.enabled && ai.consent ? 'green' : 'gray'}>{ai.enabled && ai.consent ? 'enabled' : 'disabled'}</Badge>}>
      <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
        When enabled, the ticket's short description, description and CI are sent to the Anthropic API (or your approved gateway) only when you click “Ask AI”.
        Only enable this if your organisation has approved it.
      </div>
      <div className="space-y-3">
        <Toggle checked={ai.enabled} onChange={(v) => setAi({ enabled: v })} label="Enable external AI advice" />
        <Toggle
          checked={ai.consent}
          onChange={(v) => setAi({ consent: v })}
          label="I confirm that sending ticket text to this AI service is approved by my organisation"
        />
        <Toggle checked={ai.redact} onChange={(v) => setAi({ redact: v })} label="Redact names, emails, phone numbers, IPs and ticket numbers" description="Strongly recommended." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Model">
            <Input value={ai.model} onChange={(e) => setAi({ model: e.target.value })} placeholder="claude-opus-5-5" />
          </Field>
          <Field label="API base URL (optional gateway)">
            <Input value={ai.baseUrl} onChange={(e) => setAi({ baseUrl: e.target.value })} placeholder="https://api.anthropic.com" />
          </Field>
        </div>
        <Field label="Anthropic API key" hint={ai.rememberKey ? 'Stored in this browser for this ServiceNow site.' : 'Kept for this browser session only.'}>
          <div className="flex gap-2">
            <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-…" autoComplete="off" />
            <Button
              onClick={() => {
                setApiKey(key.trim(), ai.rememberKey);
                toast('success', 'API key saved.');
              }}
            >
              Save
            </Button>
          </div>
        </Field>
        <Toggle
          checked={ai.rememberKey}
          onChange={(v) => {
            setAi({ rememberKey: v });
            setApiKey(key.trim(), v);
          }}
          label="Remember API key in this browser"
        />
      </div>
    </Card>
  );
}

function DataSettings() {
  const { settings, templates, updateSettings, setTemplates, clearRecent, toast } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const exportAll = () => {
    const blob = new Blob([safeStringify({ app: 'itsm-toolkit', version: VERSION, settings, templates }, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'itsm-toolkit-config.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const importAll = async (f: File) => {
    const data = safeParse<any>(await f.text(), null);
    if (!data || data.app !== 'itsm-toolkit') return toast('error', 'Not an ITSM Toolkit configuration file.');
    if (data.settings) updateSettings({ ...DEFAULT_SETTINGS, ...data.settings, ai: { ...DEFAULT_SETTINGS.ai, ...(data.settings.ai || {}) } });
    if (Array.isArray(data.templates)) setTemplates(data.templates);
    toast('success', 'Configuration imported.');
  };
  return (
    <>
      <Card title="Backup & share configuration">
        <p className="mb-3 text-[12px] text-ink-500">Exports settings, field mappings and templates (no ticket data, no API keys).</p>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && importAll(e.target.files[0])} />
        <div className="flex gap-2">
          <Button icon={<Download size={13} />} onClick={exportAll}>
            Export configuration
          </Button>
          <Button icon={<Upload size={13} />} onClick={() => fileRef.current?.click()}>
            Import configuration
          </Button>
        </div>
      </Card>
      <Card title="Stored data">
        <ul className="mb-3 list-disc space-y-0.5 pl-5 text-[12px] text-ink-600 dark:text-ink-300">
          <li>Settings, templates and window position — this browser, this ServiceNow site only.</li>
          <li>Recent tickets — number + short description, max 15 (optional).</li>
          <li>Drafts — per ticket, session storage, deleted when the browser closes.</li>
        </ul>
        <Toggle checked={settings.keepHistory} onChange={(v) => updateSettings({ keepHistory: v })} label="Keep recent ticket history" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button icon={<Trash2 size={13} />} onClick={clearRecent}>
            Clear history
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 size={13} />}
            onClick={() => {
              if (confirm('Delete ALL toolkit data stored in this browser for this site (settings, templates, history, drafts, API key)?')) {
                storage.clearAll();
                window.__SNTK?.destroy();
              }
            }}
          >
            Delete all toolkit data
          </Button>
        </div>
      </Card>
    </>
  );
}

function About() {
  const { snapshot, toast } = useStore();
  const boot = getBoot();
  const [check, setCheck] = useState<string>('');
  const checkUpdate = () => {
    if (!boot.base) return setCheck('Unknown host — reinstall the bookmarklet from the installation page.');
    setCheck('Checking…');
    (window as any).__SNTK_CHECK = (latest: string) => {
      delete (window as any).__SNTK_CHECK;
      setCheck(latest === VERSION ? `You are on the latest version (${VERSION}).` : `Version ${latest} is available.`);
    };
    const s = document.createElement('script');
    s.src = `${boot.base}loader.js?check=1&t=${Date.now()}`;
    s.onerror = () => setCheck('Could not reach the toolkit host.');
    document.head.appendChild(s);
    setTimeout(() => s.remove(), 10000);
  };
  const reload = () => {
    const s = document.createElement('script');
    s.src = `${boot.base}loader.js?t=${Date.now()}`;
    (window as any).__SNTK_FORCE = true;
    document.head.appendChild(s);
  };
  const diagnostics = () => {
    const d = {
      version: VERSION,
      bookmarklet: boot.bv,
      ui: snapshot?.kind,
      table: snapshot?.table,
      hasRecord: !!snapshot?.sysId,
      hasGForm: snapshot?.hasGForm,
      hasToken: snapshot?.hasToken,
      sources: snapshot?.sources,
      fields: Object.fromEntries(Object.entries(snapshot?.fields || {}).map(([k, v]) => [k, `${v!.source}:${v!.snField || ''}`])),
      warnings: snapshot?.warnings,
      path: location.pathname,
      userAgent: navigator.userAgent,
    };
    copyText(safeStringify(d, 2)).then((ok) => toast(ok ? 'success' : 'error', ok ? 'Diagnostics copied (contains no ticket content).' : 'Copy failed'));
  };
  return (
    <Card title="About ITSM Toolkit">
      <div className="space-y-1 text-[12.5px]">
        <div>
          Version <b>{VERSION}</b> · bookmarklet protocol {boot.bv || 'n/a'}
          {boot.bookmarkletOutdated && <Badge color="amber" className="ml-2">reinstall bookmarklet</Badge>}
        </div>
        <div className="text-ink-500">Loaded from {boot.base || 'unknown'}</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button icon={<RefreshCw size={13} />} onClick={checkUpdate}>
          Check for updates
        </Button>
        <Button onClick={reload}>Reload latest version</Button>
        <Button onClick={diagnostics}>Copy diagnostics</Button>
        <Button variant="ghost" icon={<LogOut size={13} />} onClick={() => window.__SNTK?.destroy()}>
          Unload toolkit
        </Button>
      </div>
      {check && <p className="mt-2 text-[12px] text-ink-600 dark:text-ink-300">{check}</p>}
      <p className="mt-4 text-[11.5px] text-ink-500">
        The toolkit never saves or submits tickets, never reads passwords, and only talks to this ServiceNow instance using your own session — unless you explicitly enable external AI.
      </p>
    </Card>
  );
}
