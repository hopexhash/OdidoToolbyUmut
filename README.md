# ITSM Toolkit — ServiceNow bookmarklet

A professional productivity overlay for ServiceNow agents, delivered as a **bookmarklet** (no Chrome/Edge extension).
Open a ticket → click the bookmark → a floating, draggable toolkit appears, detects the ticket, generates work notes and
customer comments (EN/NL) and fills them into the ticket for you to review and save.

```
Bookmark click ─► bookmarklet (<1 KB): domain allow-list check
               ─► loader.js  (always fresh, knows the current version)
               ─► toolkit/toolkit.<version>.<hash>.js  (immutable, cached)
               ─► Shadow-DOM floating window on top of ServiceNow
```

## Features

| Area | What it does |
|---|---|
| **Ticket detection** | GlideForm (`g_form`) in classic UI and inside Next Experience's `gsft_main` iframe (found through shadow DOM), REST Table API with the page's own session token (Workspaces, journals, user record, SLAs), configurable DOM selectors as last resort. Auto-rescans when you navigate to another ticket. |
| **Fields** | Number, affected user, caller, phone, email, CI, status, priority, impact, urgency, assignment group, engineer, short/full description, work notes, additional comments, SLA. Field names are configurable per instance (`u_affected_user`, …). |
| **Contact & follow-up** | Teams / telephone / email, outcome, follow-up date (Today / Tomorrow / Next workday), time, pending reason. |
| **Templates** | Create / edit / delete / duplicate / search / categorise / favourite, import & export JSON, variables such as `{{user_name}}`, `{{ticket_number}}`, `{{followup_date}}`, `{{var|fallback}}`. |
| **Generators** | Internal work notes; customer-facing additional comments in Dutch or English that only use customer-safe inputs, with a confidentiality scanner (IPs, credentials, sys_ids, internal hosts, group names). |
| **Insert in ticket** | Fills work notes / additional comments via `g_form.setValue` (classic & Next Experience) or the visible compose textarea (Workspace, through shadow DOM, with framework-compatible input events), verifies the value, and falls back to the clipboard. **Never saves or submits.** |
| **Advice** | Offline rule-based troubleshooting, knowledge search in *your own* instance, optional Claude AI (off by default, consent + key required, PII redaction). Suggestions are kept separate from performed actions. |
| **Assets / Hardware & POD** | User's hardware (`alm_hardware`, `cmdb_ci_hardware`), CI details, device swap / delivery / proof-of-delivery block for notes. |
| **Window** | Draggable, resizable, minimise / maximise / close, remembers position, light & dark theme. |

## Quick start (development)

```bash
npm install
npm run build          # typecheck + install page + toolkit bundle + loader → dist/
npm test               # unit tests (vitest)
npm run test:e2e       # bookmarklet end-to-end tests against simulated ServiceNow pages (Playwright)
npm run preview        # serve dist/ on http://localhost:4173
```

Open `http://localhost:4173/`, enter your instance, drag the button to the bookmarks bar.
For a real instance the toolkit must be served over **HTTPS** (ServiceNow pages block mixed content) — see
[docs/INSTALL.md](docs/INSTALL.md) for hosting (GitHub Pages workflow included), CSP fallback and admin notes.

## Project layout

```
src/shared/bookmarklet.ts        bookmarklet generator (domain allow-list, loader injection)
scripts/postbuild.mjs            versioned bundle + loader.js + version.json
src/install/                     installation page (INSTALL BOOKMARKLET)
src/toolkit/main.tsx             Shadow-DOM mount, window.__SNTK API (toggle/destroy)
src/toolkit/core/sn/context.ts   ServiceNow UI detection (classic / Next Experience / Workspace)
src/toolkit/core/sn/extract.ts   extraction engine (g_form → REST → DOM selectors)
src/toolkit/core/sn/insert.ts    field insertion engine
src/toolkit/core/templates/      template engine + default templates
src/toolkit/core/generator.ts    work notes / additional comments (EN, NL)
src/toolkit/core/settings.ts     configuration system
src/toolkit/ui/                  React UI (floating window, tabs, output panel)
tests/e2e.mjs + tests/mock/      end-to-end tests
```

## Security model

* Runs only on domains embedded in the bookmarklet; wildcard matches require a one-time explicit authorisation per instance before anything is read.
* All ServiceNow access is same-origin, read-only (`GET`), using the logged-in user's session and ACLs. No passwords are read, no authentication is bypassed.
* Tickets are never saved or submitted; the technician reviews and saves.
* No ticket data leaves the instance unless the technician enables external AI (disabled by default).
* Persistent storage (this site's `localStorage`): settings, templates, window position, optional recent-ticket list (number + short description, max 15). Drafts live in `sessionStorage`.
