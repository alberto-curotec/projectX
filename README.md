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
- Columns per entry: Task ID | Task Name | Description | Time | Labels | Billable
- Inline editing: Description (textarea), Tags (comma-separated), Billable (toggle)
- Save button per row, active only when something changed
- Syncs directly to ClickUp on Save

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
