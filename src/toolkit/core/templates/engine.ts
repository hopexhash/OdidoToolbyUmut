export type TemplateCategory = 'Hardware' | 'Software' | 'Network' | 'Appointments' | 'Pending' | 'Escalation' | 'Resolution';
export const CATEGORIES: TemplateCategory[] = ['Hardware', 'Software', 'Network', 'Appointments', 'Pending', 'Escalation', 'Resolution'];

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  favorite: boolean;
  /** Internal work-notes text. */
  workNotes: string;
  /** Customer-facing comment, English. */
  commentEn: string;
  /** Customer-facing comment, Dutch. */
  commentNl: string;
  tags: string[];
  updatedAt: number;
}

export const VARIABLES: { name: string; description: string }[] = [
  { name: 'user_name', description: 'Affected user (full name)' },
  { name: 'first_name', description: 'Affected user first name' },
  { name: 'ticket_number', description: 'Ticket number' },
  { name: 'phone', description: 'Phone number' },
  { name: 'email', description: 'Email address' },
  { name: 'date', description: 'Today' },
  { name: 'time', description: 'Current time' },
  { name: 'engineer', description: 'Assigned engineer' },
  { name: 'technician', description: 'You (Settings → technician name)' },
  { name: 'department', description: 'Your department' },
  { name: 'contact_method', description: 'Teams / telephone / email' },
  { name: 'configuration_item', description: 'Configuration item' },
  { name: 'priority', description: 'Priority' },
  { name: 'incident_status', description: 'Status' },
  { name: 'assignment_group', description: 'Assignment group' },
  { name: 'short_description', description: 'Short description' },
  { name: 'followup_date', description: 'Follow-up date' },
  { name: 'followup_time', description: 'Follow-up time' },
  { name: 'pending_reason', description: 'Pending reason' },
];

const VAR_RE = /\{\{\s*([a-z_]+)\s*(?:\|\s*([^}]*?)\s*)?\}\}/gi;

/**
 * Renders {{variable}} and {{variable|fallback}} placeholders.
 * A line that only contains placeholders which all resolved empty is dropped,
 * so optional details don't leave dangling labels.
 */
export function renderTemplate(text: string, vars: Record<string, string | undefined>): string {
  const lines = text.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    let hadVar = false;
    let allEmpty = true;
    const rendered = line.replace(VAR_RE, (_, name: string, fb: string | undefined) => {
      hadVar = true;
      const v = vars[name.toLowerCase()];
      const val = v && v.trim() ? v : fb ?? '';
      if (val) allEmpty = false;
      return val;
    });
    const staticPart = line.replace(VAR_RE, '').replace(/[\s:·\-–—,()]/g, '');
    if (hadVar && allEmpty && staticPart.length < 25) continue;
    out.push(rendered);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function usedVariables(text: string): string[] {
  const s = new Set<string>();
  text.replace(VAR_RE, (_, n: string) => {
    s.add(n.toLowerCase());
    return '';
  });
  return [...s];
}

export function newId(): string {
  return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function validateImport(data: unknown): Template[] {
  const list = Array.isArray(data) ? data : (data as any)?.templates;
  if (!Array.isArray(list)) throw new Error('Expected an array of templates or { "templates": [...] }');
  return list.map((t: any, i: number) => {
    if (!t || typeof t.name !== 'string') throw new Error(`Template #${i + 1} has no name`);
    const cat = CATEGORIES.includes(t.category) ? t.category : 'Software';
    return {
      id: typeof t.id === 'string' ? t.id : newId(),
      name: t.name.slice(0, 120),
      category: cat,
      favorite: !!t.favorite,
      workNotes: String(t.workNotes ?? ''),
      commentEn: String(t.commentEn ?? ''),
      commentNl: String(t.commentNl ?? ''),
      tags: Array.isArray(t.tags) ? t.tags.map(String).slice(0, 10) : [],
      updatedAt: Date.now(),
    } as Template;
  });
}
