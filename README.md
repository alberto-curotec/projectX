# ClickUp Time by Developer

A Google Apps Script web app that shows your team's weekly time entries from ClickUp — grouped by developer, color-coded against targets, with a slide-in detail panel for reviewing and editing individual entries.

Built as a companion tool to [clickup-time-entries-sheet](https://github.com/your-username/clickup-time-entries-sheet).

---

## What it does

**Weekly overview table**
- One row per developer, columns Mon–Sun + Total
- Color-coded cells: green (on target), yellow (light/slightly over), red (anomaly), gray (no hours on a workday)
- Targets: 8h/day, 40h/week
- Week navigation (Prev / Next / This Week)
- Toggle between **All developers** and **⭐ Favorites**
- Star any developer to add them to your personal shortlist (stored per Google account via PropertiesService — each user's favorites are independent)

**Developer detail panel**
- Click any developer row to open a slide-in panel showing their full week of entries
- Entries grouped by day with daily totals
- Columns per entry: Custom Task ID | Task Name | Description | Time | Labels | Billable
- Custom task IDs displayed (e.g. `CTK-1234`) instead of internal ClickUp IDs
- Inline editing: Description (textarea), Tags (comma-separated), Billable (toggle)
- Save button per row, active only when something changed
- Syncs directly to ClickUp on Save

**Split time entry**
- Entries ≥ 30 minutes show a ✂ Split button
- Expanding an inline panel below the entry with:
  - Duration dropdown (15-min intervals, from 15 min up to original − 15 min)
  - Task lookup by custom ID (type e.g. `CTK-456`, click Resolve, see task name)
  - Description, tags, and billable flag pre-populated from original, fully editable
- On save: original entry is shortened, new entry created on the target task
- Times are adjusted: new entry occupies the tail end of the original block
- Panel auto-refreshes after split to show updated durations

---

## Setup

### 1. Create the Apps Script project

1. Open a new Google Apps Script project at [script.google.com](https://script.google.com)
2. Create two files:
   - `Code.gs` — paste the contents of `Code.gs`
   - `Index.html` — paste the contents of `Index.html`

### 2. Configure your credentials

In `Code.gs`, set the two constants at the top:

```javascript
const CONFIG = {
  API_TOKEN: 'YOUR_CLICKUP_API_TOKEN',  // ClickUp → Profile → Apps → API Token
  TEAM_ID:   'YOUR_TEAM_ID',            // ClickUp → Settings → Workspace ID
  ...
};
```

**Finding your Team ID:** In ClickUp, go to Settings → Workspace. The ID appears in the URL or under Workspace settings.

### 3. Deploy as a Web App

1. Click **Deploy → New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone within your organization** (or Anyone, if you want external PMs to use it)
5. Click **Deploy**
6. Copy the web app URL and share with your team

### 4. Permissions

On first run, Google will ask you to authorize:
- External URL requests (to call the ClickUp API)
- User properties (to store favorites per user)

---

## Permissions & access

| Setting | Recommended value |
|---|---|
| Execute as | Me (the script owner) |
| Who has access | Anyone in your org |
| ClickUp API token | Read + Write time entries |

---

## Color coding reference

### Day cells (vs 8h target)

| Hours | Color | Meaning |
|---|---|---|
| 7h – 9h | 🟢 Green | On target |
| 4h – 7h or 9h – 10h | 🟡 Yellow | Light or slightly over |
| < 4h or > 10h | 🔴 Red | Anomaly |
| 0h (weekday) | ⬜ Gray | No entries |
| 0h (weekend) | — | Expected |

### Weekly total (vs 40h target)

| Hours | Color |
|---|---|
| 36h – 44h | 🟢 Green |
| 24h – 36h or 44h – 50h | 🟡 Yellow |
| < 24h or > 50h | 🔴 Red |

---

## Editing entries

Fields you can edit from the detail panel:

| Field | How |
|---|---|
| Description | Inline textarea |
| Tags | Comma-separated text input |
| Billable | Toggle switch |

Changes are not sent to ClickUp until you click **Save** on that row. The Save button is disabled until you make a change, and clears after a successful sync.

## Splitting entries

Any entry ≥ 30 minutes shows a **✂ Split** button. Clicking it expands an inline form:

1. **Choose duration** — dropdown in 15-minute increments (minimum 15 min, maximum = original − 15 min)
2. **Enter target task** — type the custom ID (e.g. `CTK-456`) and click **Resolve** to confirm the task name
3. **Edit fields** — description, tags, and billable are pre-populated from the original but fully editable
4. **Split & Save** — reduces the original entry's duration and creates a new time entry on the target task

The new entry's start time is calculated so it occupies the tail end of the original time block. For example, if the original runs 1:00–2:00 PM and you split 30 min, the original becomes 1:00–1:30 PM and the new entry is 1:30–2:00 PM.

---

## File structure

```
clickup-time-by-developer/
├── Code.gs        # Apps Script backend (ClickUp API, favorites, sync)
├── Index.html     # Web app frontend (table, panel, interactions)
├── README.md
└── CHANGELOG.md
```

---

## Related

- [clickup-time-entries-sheet](https://github.com/your-username/clickup-time-entries-sheet) — flat audit log of all time entries in a Google Sheet

---

## License

MIT
