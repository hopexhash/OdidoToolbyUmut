// End-to-end test of the bookmarklet → loader → toolkit chain against simulated
// ServiceNow pages (classic form, Next Experience shell, Workspace) served on a
// *.service-now.com hostname via Playwright request interception.
// Run `npm run build` first.
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');
const shots = join(here, 'screenshots');
mkdirSync(shots, { recursive: true });

const SN = 'https://dev-test.service-now.com';
const HOST = 'https://toolkit.test/itsm/';
const SYS_ID = 'e8caedcbc0a80164017df472f39eaed1';

// Compile the real bookmarklet generator so the test uses production code.
const out = await build({
  configFile: false,
  logLevel: 'silent',
  build: { write: false, lib: { entry: join(root, 'src/shared/bookmarklet.ts'), formats: ['es'], fileName: 'b' } },
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(out[0].output[0].code).toString('base64'));
const bookmarklet = (domains) => mod.buildBookmarklet(HOST, domains).replace(/^javascript:/, '');

const da = (v, d = v) => ({ value: v, display_value: d });
const INCIDENT = {
  sys_id: da(SYS_ID), number: da('INC0012345'),
  caller_id: da('681ccaf9c0a8016400b98a06818d57c7', 'Abel Tuter'), u_affected_user: da('', ''),
  cmdb_ci: da('b0c25d1bc0a800090168be1bfcdcd759', 'LT-AMS-04521'), state: da('2', 'In Progress'),
  priority: da('2', '2 - High'), impact: da('2', '2 - Medium'), urgency: da('1', '1 - High'),
  assignment_group: da('8a4dde73c6112278017a6a4baf547aa7', 'Service Desk NL'), assigned_to: da('46d44a23a9fe19810012d100cca80666', 'Beth Anglin'),
  short_description: da('VPN keeps disconnecting when working from home'),
  description: da('Since this morning the GlobalProtect VPN drops every 10 minutes.'),
  work_notes: da('', '2026-11-20 09:12:01 - Beth Anglin (Work notes)\nUser called, VPN client 6.1 installed.'),
  comments: da('', ''),
};
const USER = { name: 'Abel Tuter', first_name: 'Abel', email: 'abel.tuter@example.com', phone: '+31 20 555 0101', mobile_phone: '+31 6 1234 5678', user_name: 'abel.tuter', department: 'Finance', location: 'Amsterdam', title: 'Controller', vip: 'false' };

const results = [];
const check = (name, ok, info = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✓' : '✗'} ${name}${info ? ` — ${info}` : ''}`);
};

const browser = await chromium.launch();

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const restCalls = [];
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  await ctx.route('https://toolkit.test/**', async (route) => {
    const p = new URL(route.request().url()).pathname.replace('/itsm/', '');
    try {
      const body = readFileSync(join(dist, p));
      await route.fulfill({ body, contentType: p.endsWith('.json') ? 'application/json' : 'text/javascript' });
    } catch {
      await route.fulfill({ status: 404, body: 'nf' });
    }
  });
  await ctx.route(`${SN}/**`, async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    if (p.startsWith('/api/now/table/')) {
      restCalls.push({ path: p, token: route.request().headers()['x-usertoken'] });
      const json = (result) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ result }) });
      if (p === `/api/now/table/incident/${SYS_ID}`) return json(INCIDENT);
      if (p.startsWith('/api/now/table/sys_user/')) return json(Object.fromEntries(Object.entries(USER).map(([k, v]) => [k, da(v)])));
      if (p === '/api/now/table/task_sla')
        return json([{ sla: 'Resolution P2 (8h)', stage: 'In progress', has_breached: 'false', planned_end_time: '2026-11-23 17:00:00', business_percentage: '62.5', business_time_left: '3 Hours' }]);
      if (p === '/api/now/table/kb_knowledge') return json([{ sys_id: 'a'.repeat(32), number: 'KB0010042', short_description: 'Troubleshooting GlobalProtect VPN disconnects' }]);
      if (p === '/api/now/table/alm_hardware') return json([{ sys_id: 'b'.repeat(32), display_name: 'Dell Latitude 7440', asset_tag: 'P000451', serial_number: 'DL7440-XYZ', model: 'Latitude 7440', install_status: 'In use', model_category: 'Computer' }]);
      if (p === '/api/now/table/cmdb_ci_hardware') return json([]);
      if (p.startsWith('/api/now/table/cmdb_ci/')) return json({ name: 'LT-AMS-04521', sys_class_name: 'Computer', serial_number: 'DL7440-XYZ', model_id: 'Latitude 7440' });
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":{"message":"not mocked"}}' });
    }
    const file = p.startsWith('/incident.do') ? 'classic-form.html' : p.startsWith('/now/nav/ui') ? 'polaris.html' : p.startsWith('/now/sow') ? 'workspace.html' : null;
    if (!file) return route.fulfill({ status: 404, body: 'nf' });
    return route.fulfill({ contentType: 'text/html', body: readFileSync(join(here, 'mock', file)) });
  });
  return { ctx, page, restCalls };
}

const shadowText = (page) => page.evaluate(() => document.getElementById('itsm-toolkit-host')?.shadowRoot?.textContent || '');
const tk = (page) => page.locator('#itsm-toolkit-host');

// ───────────── 1. Classic UI ─────────────
{
  const { page, restCalls, ctx } = await newPage();
  await page.goto(`${SN}/incident.do?sys_id=${SYS_ID}`);
  await page.evaluate(bookmarklet(['dev-test.service-now.com']));
  await tk(page).locator('text=ITSM Toolkit').first().waitFor({ timeout: 10000 });
  check('classic: floating window appears after clicking bookmarklet', true);
  await tk(page).locator('text=INC0012345').first().waitFor({ timeout: 10000 });
  check('classic: ticket number detected in header', true);
  await page.waitForFunction(() => document.getElementById('itsm-toolkit-host')?.shadowRoot?.textContent?.includes('Resolution P2'), null, { timeout: 10000 });
  const t = await shadowText(page);
  check('classic: SLA loaded via REST', t.includes('Resolution P2'));
  check('classic: REST used session token', restCalls.length > 0 && restCalls.every((c) => c.token === 'mock-session-token-1234567890'));
  const vals = await tk(page).locator('input').evaluateAll((els) => els.map((e) => e.value));
  check('classic: affected user falls back to caller (Abel Tuter)', vals.includes('Abel Tuter'));
  check('classic: phone resolved from user record', vals.includes('+31 6 1234 5678'), vals.slice(0, 14).join(' | '));
  check('classic: CI / state / priority read via g_form', vals.includes('LT-AMS-04521') && vals.includes('In Progress') && vals.includes('2 - High'));
  check('classic: isolation — host page CSS did not leak (font)', !(await tk(page).locator('text=ITSM Toolkit').first().evaluate((e) => getComputedStyle(e).fontFamily)).includes('Comic'));
  await page.screenshot({ path: join(shots, '1-classic-ticket.png') });

  // Contact & follow-up
  await tk(page).getByRole('button', { name: 'Contact & Follow-up' }).click();
  await tk(page).getByRole('button', { name: /Microsoft Teams/ }).first().click();
  await tk(page).getByRole('button', { name: 'Reached', exact: true }).click();
  await tk(page).getByRole('button', { name: 'Next workday' }).click();
  await tk(page).getByRole('button', { name: '10:30' }).click();
  await tk(page).locator('select').first().selectOption('monitoring');
  // Update details
  await tk(page).getByRole('button', { name: 'Update Details' }).click();
  await tk(page).getByText('VPN connectivity', { exact: true }).click();
  await tk(page).getByRole('button', { name: 'Certificate renewed' }).click();
  const wn = await tk(page).locator('aside textarea').inputValue();
  check('generator: work notes include template + contact + actions + follow-up',
    wn.includes('Troubleshot VPN connectivity with Abel Tuter') && wn.includes('Contact via Teams') && wn.includes('Certificate renewed') && wn.includes('Follow-up:'), '\n' + wn.split('\n').map((l) => '    ' + l).join('\n'));
  await tk(page).getByRole('button', { name: 'Comments', exact: true }).click();
  const cm = await tk(page).locator('aside textarea').inputValue();
  check('generator: Dutch customer comment generated', cm.startsWith('Beste Abel,') && cm.includes('Met vriendelijke groet'), '\n' + cm.split('\n').map((l) => '    ' + l).join('\n'));
  check('generator: comment excludes internal actions', !cm.includes('Certificate renewed'));
  await page.screenshot({ path: join(shots, '2-classic-generated.png') });

  // Insert
  await tk(page).getByRole('button', { name: 'INSERT IN TICKET' }).click();
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ wn: g_form.getValue('work_notes'), cm: g_form.getValue('comments'), vis: document.getElementById('activity-stream-work_notes-textarea').value, submits: window.__submits }));
  check('insert: work notes populated via g_form', after.wn.includes('Troubleshot VPN connectivity'));
  check('insert: additional comments populated via g_form', after.cm.startsWith('Beste Abel,'));
  check('insert: visible activity-stream textarea in sync', after.vis === after.wn);
  check('insert: ticket NOT submitted/saved', after.submits === 0);
  await page.screenshot({ path: join(shots, '3-classic-inserted.png') });

  // Bookmarklet click again toggles (hide) without reloading
  await page.evaluate(bookmarklet(['dev-test.service-now.com']));
  await page.waitForTimeout(800);
  check('bookmarklet: second click toggles the window', !(await shadowText(page)).includes('Generated output'));
  await page.evaluate(bookmarklet(['dev-test.service-now.com']));
  await tk(page).locator('text=Generated output').waitFor({ timeout: 5000 });
  check('bookmarklet: third click shows it again with state kept', (await tk(page).locator('aside textarea').inputValue()).length > 0);

  // Minimize / drag persistence
  await tk(page).getByRole('button', { name: 'Minimize' }).click();
  check('window: minimize', await tk(page).getByRole('button', { name: 'Restore' }).isVisible());
  await tk(page).getByRole('button', { name: 'Restore' }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('itsmtk.v1.window')));
  check('window: geometry persisted', !!saved?.geom?.w);
  await ctx.close();
}

// ───────────── 2. Next Experience (gsft_main iframe in shadow DOM) ─────────────
{
  const { page, ctx } = await newPage();
  await page.goto(`${SN}/now/nav/ui/classic/params/target/incident.do%3Fsys_id%3D${SYS_ID}`);
  await page.waitForFunction(() => {
    const f = document.querySelector('sn-polaris-layout')?.shadowRoot?.querySelector('macroponent-f51912f4c700201072b211d4d8c26010')?.shadowRoot?.querySelector('iframe');
    return f?.contentWindow?.g_form;
  });
  await page.evaluate(bookmarklet(['dev-test.service-now.com']));
  await tk(page).locator('text=INC0012345').first().waitFor({ timeout: 10000 });
  const t = await shadowText(page);
  check('next experience: ticket detected through shadow DOM + iframe', t.includes('INC0012345') && t.includes('GlideForm'));
  check('next experience: UI kind recognised', t.includes('Next Experience'));
  await page.screenshot({ path: join(shots, '4-polaris.png') });
  await ctx.close();
}

// ───────────── 3. Workspace (REST only, compose box in shadow DOM) ─────────────
{
  const { page, ctx } = await newPage();
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(`${SN}/now/sow/record/incident/${SYS_ID}`);
  await page.evaluate(bookmarklet(['dev-test.service-now.com']));
  await tk(page).locator('text=INC0012345').first().waitFor({ timeout: 10000 });
  const t = await shadowText(page);
  check('workspace: ticket detected via URL + REST', t.includes('Workspace') && t.includes('REST'));
  await tk(page).getByRole('button', { name: 'Contact & Follow-up' }).click();
  await tk(page).getByRole('button', { name: /Telephone/ }).first().click();
  await tk(page).getByRole('button', { name: 'No answer', exact: true }).click();
  await tk(page).getByRole('button', { name: 'INSERT IN TICKET' }).click();
  await page.waitForTimeout(300);
  const model = await page.evaluate(() => window.__wsModel || {});
  check('workspace: work notes inserted into shadow-DOM textarea (framework saw input event)', (model['Work notes'] || '').includes('Contact via Telephone'));
  const msg = await shadowText(page);
  check('workspace: comments fallback explains how to switch compose box', msg.includes('Switch the compose box'));
  await tk(page).getByRole('button', { name: 'Advice' }).click();
  await tk(page).locator('text=KB0010042').waitFor({ timeout: 5000 });
  check('advice: local rules matched VPN + same-instance KB search', (await shadowText(page)).includes('VPN / remote access'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(shots, '5-workspace-dark-advice.png') });
  await tk(page).getByRole('button', { name: 'Assets' }).click();
  await tk(page).locator('text=Dell Latitude 7440').waitFor({ timeout: 5000 });
  check('assets: user hardware listed', true);
  await ctx.close();
}

// ───────────── 4. Security: domain allow-list ─────────────
{
  const { page, ctx } = await newPage();
  let loaderRequested = false;
  page.on('request', (r) => r.url().startsWith('https://toolkit.test') && (loaderRequested = true));
  await ctx.route('https://unrelated.example.com/**', (r) => r.fulfill({ contentType: 'text/html', body: '<h1>Unrelated</h1>' }));
  await page.goto('https://unrelated.example.com/');
  let alerted = '';
  page.once('dialog', (d) => {
    alerted = d.message();
    d.dismiss();
  });
  await page.evaluate(bookmarklet(['dev-test.service-now.com']));
  await page.waitForTimeout(500);
  check('security: refuses to run on an unrelated site', alerted.includes('not an authorized') && !loaderRequested);

  // Wildcard-only bookmarklet → explicit authorization screen first, no scan
  const { page: p2, ctx: c2, restCalls } = await newPage();
  await p2.goto(`${SN}/incident.do?sys_id=${SYS_ID}`);
  await p2.evaluate(bookmarklet(['*.service-now.com']));
  await tk(p2).locator('text=Authorize this ServiceNow instance?').waitFor({ timeout: 10000 });
  check('security: wildcard install asks for one-time authorization before reading', restCalls.length === 0);
  await p2.screenshot({ path: join(shots, '6-authorize.png') });
  await tk(p2).getByRole('button', { name: /Authorize dev-test/ }).click();
  await tk(p2).locator('text=INC0012345').first().waitFor({ timeout: 10000 });
  check('security: after authorization the ticket is scanned', true);
  await ctx.close();
  await c2.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots: tests/screenshots/`);
process.exit(failed.length ? 1 : 0);
