/**
 * Logical ticket fields used by the toolkit and the ServiceNow field names that
 * are tried (in order) to populate them. Every instance can override the list
 * and add CSS selectors in Settings → ServiceNow → Field mapping.
 */
export type FieldKey =
  | 'number'
  | 'affected_user'
  | 'caller'
  | 'phone'
  | 'email'
  | 'configuration_item'
  | 'state'
  | 'priority'
  | 'impact'
  | 'urgency'
  | 'assignment_group'
  | 'assigned_to'
  | 'short_description'
  | 'description'
  | 'work_notes'
  | 'comments';

export interface FieldDef {
  key: FieldKey;
  label: string;
  /** Candidate ServiceNow column names, tried in order. */
  fields: string[];
  /** Field is a reference (sys_id value + display value). */
  reference?: boolean;
  /** Read-only journal (history) field. */
  journal?: boolean;
}

export const FIELD_DEFS: FieldDef[] = [
  { key: 'number', label: 'Ticket number', fields: ['number'] },
  {
    key: 'affected_user',
    label: 'Affected user',
    fields: ['u_affected_user', 'u_affected_end_user', 'u_end_user', 'caller_id', 'requested_for', 'u_requested_for'],
    reference: true,
  },
  { key: 'caller', label: 'Caller', fields: ['caller_id', 'requested_for', 'opened_by'], reference: true },
  { key: 'phone', label: 'Phone', fields: ['u_phone_number', 'u_contact_number', 'u_callback_number', 'u_phone', 'u_telephone'] },
  { key: 'email', label: 'Email', fields: ['u_email', 'u_contact_email', 'u_email_address'] },
  { key: 'configuration_item', label: 'Configuration item', fields: ['cmdb_ci', 'u_configuration_item', 'u_ci'], reference: true },
  { key: 'state', label: 'Status', fields: ['state', 'incident_state'] },
  { key: 'priority', label: 'Priority', fields: ['priority'] },
  { key: 'impact', label: 'Impact', fields: ['impact'] },
  { key: 'urgency', label: 'Urgency', fields: ['urgency'] },
  { key: 'assignment_group', label: 'Assignment group', fields: ['assignment_group'], reference: true },
  { key: 'assigned_to', label: 'Assigned engineer', fields: ['assigned_to'], reference: true },
  { key: 'short_description', label: 'Short description', fields: ['short_description'] },
  { key: 'description', label: 'Description', fields: ['description'] },
  { key: 'work_notes', label: 'Work notes (history)', fields: ['work_notes'], journal: true },
  { key: 'comments', label: 'Additional comments (history)', fields: ['comments'], journal: true },
];

export interface FieldMapEntry {
  /** Overrides FieldDef.fields when non-empty. */
  fields: string[];
  /** Extra CSS selectors (searched through shadow roots) used as DOM fallback. */
  selectors: string[];
}
export type FieldMap = Partial<Record<FieldKey, FieldMapEntry>>;

/**
 * Generic DOM patterns for classic forms. {table} and {field} are substituted.
 * Classic forms render `<input id="incident.short_description">` and
 * `<input id="sys_display.incident.caller_id">` for references.
 */
export const GENERIC_DOM_PATTERNS = [
  '[id="sys_display.{table}.{field}"]',
  '[id="{table}.{field}"]',
  '[id="sys_readonly.{table}.{field}"]',
  '[name="{table}.{field}"]',
];

export const DEFAULT_INSERT_SELECTORS = {
  work_notes: [
    '#activity-stream-work_notes-textarea',
    'textarea[id="{table}.work_notes"]',
    'textarea[name="work_notes"]',
    'textarea[aria-label*="Work notes" i]',
    'textarea[placeholder*="Work notes" i]',
    'textarea[aria-label*="Werknotities" i]',
    'textarea[placeholder*="Werknotities" i]',
  ],
  comments: [
    '#activity-stream-comments-textarea',
    'textarea[id="{table}.comments"]',
    'textarea[name="comments"]',
    'textarea[aria-label*="Additional comments" i]',
    'textarea[placeholder*="Additional comments" i]',
    'textarea[aria-label*="Aanvullende opmerkingen" i]',
    'textarea[placeholder*="Aanvullende opmerkingen" i]',
  ],
};
