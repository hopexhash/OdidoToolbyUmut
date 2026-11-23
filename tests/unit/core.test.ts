import { describe, expect, it } from 'vitest';
import { renderTemplate, validateImport } from '../../src/toolkit/core/templates/engine';
import { nextWorkday, toIsoDate } from '../../src/toolkit/core/dates';
import { buildBookmarklet, normalizeDomains } from '../../src/shared/bookmarklet';
import { parseRecordUrl } from '../../src/toolkit/core/sn/context';
import { hostAllowed } from '../../src/toolkit/core/settings';
import { scanConfidential } from '../../src/toolkit/core/generator';
import { redact } from '../../src/toolkit/core/advice/ai';
import { safeStringify } from '../../src/toolkit/core/safeJson';

describe('template engine', () => {
  it('substitutes variables and fallbacks', () => {
    expect(renderTemplate('Hi {{user_name}}, CI {{configuration_item|unknown}}', { user_name: 'Abel' })).toBe('Hi Abel, CI unknown');
  });
  it('drops lines whose variables are all empty', () => {
    expect(renderTemplate('A\nPhone: {{phone}}\nB', {})).toBe('A\nB');
  });
  it('keeps long static lines even if a variable is empty', () => {
    expect(renderTemplate('Please contact the service desk if needed {{phone}}', {})).toContain('Please contact');
  });
  it('validates imports', () => {
    const t = validateImport({ templates: [{ name: 'X', category: 'Nope' }] });
    expect(t[0].category).toBe('Software');
    expect(() => validateImport({ foo: 1 })).toThrow();
  });
});

describe('dates', () => {
  it('next workday skips weekends', () => {
    expect(toIsoDate(nextWorkday(new Date(2026, 10, 20)))).toBe('2026-11-23'); // Fri → Mon
    expect(toIsoDate(nextWorkday(new Date(2026, 10, 23)))).toBe('2026-11-24');
  });
});

describe('bookmarklet', () => {
  it('normalizes domains', () => {
    expect(normalizeDomains(['https://Acme.service-now.com/nav_to.do', '*.service-now.com', 'bad domain!'])).toEqual(['acme.service-now.com', '*.service-now.com']);
  });
  it('is small and embeds the allow-list', () => {
    const b = buildBookmarklet('https://host.example/itsm', ['acme.service-now.com']);
    expect(b.startsWith('javascript:')).toBe(true);
    expect(b.length).toBeLessThan(1500);
    expect(b).toContain('"acme.service-now.com"');
    expect(b).toContain('https://host.example/itsm/');
  });
  it('allow-list logic', () => {
    expect(hostAllowed('acme.service-now.com', ['*.service-now.com'])).toBe(true);
    expect(hostAllowed('service-now.com.evil.com', ['*.service-now.com'])).toBe(false);
    expect(hostAllowed('acme.service-now.com', ['other.service-now.com'])).toBe(false);
  });
});

describe('ServiceNow URL parsing', () => {
  const id = 'e8caedcbc0a80164017df472f39eaed1';
  it('classic', () => expect(parseRecordUrl(`https://x.service-now.com/incident.do?sys_id=${id}&sysparm_view=`)).toEqual({ table: 'incident', sysId: id }));
  it('next experience', () =>
    expect(parseRecordUrl(`https://x.service-now.com/now/nav/ui/classic/params/target/incident.do%3Fsys_id%3D${id}`)).toEqual({ table: 'incident', sysId: id }));
  it('workspace', () => expect(parseRecordUrl(`https://x.service-now.com/now/sow/record/incident/${id}/params/selected-tab-index/0`)).toEqual({ table: 'incident', sysId: id }));
  it('new record ignored', () => expect(parseRecordUrl('https://x.service-now.com/incident.do?sys_id=-1')).toBeNull());
});

describe('privacy helpers', () => {
  it('flags internal info in comments', () => {
    expect(scanConfidential('Your IP 10.1.2.3 and password: x').map((w) => w.label)).toEqual(expect.arrayContaining(['IP address', 'Password / credential']));
  });
  it('redacts personal data', () => {
    const r = redact({ text: 'Abel Tuter (abel@x.com, +31 6 1234 5678) INC0012345', secrets: ['Abel Tuter', 'INC0012345'] });
    expect(r).not.toMatch(/Abel|abel@|1234 5678|INC0012345/);
  });
  it('safeStringify survives Prototype.js Array#toJSON', () => {
    (Array.prototype as any).toJSON = function () {
      return 'broken';
    };
    try {
      expect(safeStringify({ a: [1, 2] })).toBe('{"a":[1,2]}');
    } finally {
      delete (Array.prototype as any).toJSON;
    }
  });
});
