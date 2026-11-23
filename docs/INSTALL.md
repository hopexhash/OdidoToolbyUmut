# Installation & operations guide

## 1. Host the toolkit (HTTPS)

The bookmarklet loads `loader.js` and the versioned bundle from a hosted URL. Any static HTTPS host works.

### GitHub Pages (included)
1. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Merge to `main` (or run the *Build, test & deploy* workflow manually).
3. The install page is published at `https://<owner>.github.io/<repo>/`.

### Any other host (intranet, Azure Static Web Apps, S3, IIS …)
```bash
npm ci && npm run build
# upload the contents of dist/ — keep the folder structure
```
Recommended cache headers: `loader.js`, `version.json`, `index.html` → `no-cache`; `toolkit/toolkit.*.*.js` → immutable (hashed file names).

## 2. Install the bookmarklet (technicians)

1. Open the install page.
2. **Step 1:** enter your instance host, e.g. `yourcompany.service-now.com` (exact host = no prompt; `*.service-now.com` = one-time authorisation prompt).
3. **Step 2:** drag **ITSM Toolkit** to the bookmarks bar (`Ctrl+Shift+B` shows the bar).

Manual install (Edge): `Ctrl+Shift+O` → *Favorites bar* → *⋯ → Add favorite* → name *ITSM Toolkit*, URL = copied code.
Manual install (Chrome): `Ctrl+Shift+O` → *Bookmarks bar* → *⋮ → Add new bookmark* → name *ITSM Toolkit*, URL = copied code.

Updates are automatic: `loader.js` is fetched fresh on every click and loads the newest bundle.
Settings → About has *Check for updates* and *Reload latest version*. If the bookmarklet protocol changes,
the header shows “Bookmarklet update available” — reinstall it from the install page.

## 3. First run on a real instance

1. Open an existing incident (classic `incident.do`, Next Experience, or Service Operations Workspace).
2. Click the bookmark. Authorise the instance if asked.
3. Check the **Ticket** tab. Each field shows where it came from (GlideForm / REST / DOM / User record).
4. If a field is missing: **Settings → Field mapping**, add your column name (e.g. `u_affected_user`) and press *Test (rescan)*.
5. **Settings → About → Copy diagnostics** produces a report without ticket content for support.

### Testing without a company instance
Request a free **Personal Developer Instance** at developer.servicenow.com, add `devXXXXX.service-now.com` as domain and open any demo incident.

## 4. ServiceNow admin notes

| Topic | Details |
|---|---|
| REST API | Read-only `GET /api/now/table/...` on `incident` (or the ticket table), `sys_user`, `task_sla`, `kb_knowledge`, `alm_hardware`, `cmdb_ci*`, authenticated with the user's session (`X-UserToken: g_ck`). If your instance restricts REST to the `snc_platform_rest_api_access` role, the toolkit falls back to on-page data (GlideForm + DOM selectors). |
| Content-Security-Policy | If the instance blocks scripts from the toolkit host, create a **UI Script** (System UI → UI Scripts; Global) with the contents of `toolkit/toolkit.latest.js` and enter its name in the install page's *Advanced (CSP)* field. The bookmarklet then loads `/<name>.jsdbx` from the instance itself. |
| Writes | The toolkit never calls a write API. Insertion sets journal fields on the open form only; the agent saves. |
| External AI | Off by default. When enabled by the user (with consent and their API key), requests go from the browser to `api.anthropic.com` (or a configured gateway). The instance CSP `connect-src` may need to allow it. |

## 5. Field mapping reference

| Toolkit field | Default ServiceNow columns tried (in order) |
|---|---|
| Affected user | `u_affected_user`, `u_affected_end_user`, `u_end_user`, `caller_id`, `requested_for` |
| Caller | `caller_id`, `requested_for`, `opened_by` |
| Phone | `u_phone_number`, `u_contact_number`, `u_callback_number`, `u_phone`, `u_telephone`, then user `mobile_phone` / `phone` |
| Email | `u_email`, `u_contact_email`, then user `email` |
| Configuration item | `cmdb_ci`, `u_configuration_item` |
| Status | `state`, `incident_state` |
| Others | `priority`, `impact`, `urgency`, `assignment_group`, `assigned_to`, `short_description`, `description`, `work_notes`, `comments` |

DOM fallback selectors support `{table}` placeholders and search through open shadow roots.
Journal insertion selectors (Workspace) are under *Settings → ServiceNow → Journal field selectors*.

## 6. Template JSON format

The toolkit starts with **no templates**. Import your own file via *Templates → Import templates*. A complete example with 16 templates is in [`docs/example-templates.json`](example-templates.json).

```json
{
  "templates": [
    {
      "name": "VPN connectivity",
      "category": "Network",
      "favorite": true,
      "workNotes": "Troubleshot VPN with {{user_name}} via {{contact_method}}.",
      "commentNl": "We hebben samen met u uw VPN-verbinding gecontroleerd.",
      "commentEn": "We have checked your VPN connection together with you.",
      "tags": ["vpn"]
    }
  ]
}
```
Categories: Hardware, Software, Network, Appointments, Pending, Escalation, Resolution.
