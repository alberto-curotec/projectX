# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.6.2] — 2026-06-11

### Added
- Favorite star on the developer summary bar (time screen) — reflects current favorite status and toggles add/remove on click without leaving the screen

---

## [1.6.1] — 2026-06-11

### Changed
- Description field auto-resizes to fit content on render and grows as you type, so multi-line entries are fully visible without scrolling

---

## [1.6.0] — 2026-06-11

### Changed
- **Team list**: Guest users (ClickUp role 4) are now excluded from the developer list
- **Team list**: Members are sorted alphabetically by name (favorites still pinned at top, now alphabetical within their group)
- **Day panel**: Entries are sorted by start time, oldest first
- **Day panel**: Each entry now shows its start time (12-hour format) above the duration on the right

---

## [1.5.1] — 2026-06-10

### Fixed
- Task ID links now include the team ID in the URL path (`/t/{teamId}/{customId}`), matching the ClickUp URL format — previously the link was missing the team ID and returned "page unavailable"

### Added
- New `getTeamId()` backend function; frontend fetches it once at boot and stores in state for building task URLs

---

## [1.5.0] — 2026-06-10

### Changed
- **Clickable task IDs**: Task ID badges in the detail panel are now links that open the ClickUp task in a new tab, with a hover effect for discoverability

---

## [1.4.1] — 2026-06-01

### Fixed
- Fixed custom task ID lookup using the correct ClickUp API endpoint (`/task/{custom_id}?custom_task_ids=true&team_id=...`) — previous version used a non-existent endpoint format

---

## [1.4.0] — 2026-06-01

### Added
- **Custom task IDs**: Entry rows now show the ClickUp custom ID (e.g. `CTK-1234`) instead of the internal numeric ID
- **Split time entry**: Entries ≥ 30 minutes show a ✂ Split button that expands an inline panel
  - Duration dropdown in 15-minute intervals (from 15 min up to duration − 15 min)
  - Task lookup by custom ID with live resolution showing task name for confirmation
  - Description, tags, and billable flag pre-populated from the original entry, fully editable
  - On save: reduces the original entry by the split amount and creates a new entry on the target task
  - Start/end times are adjusted so the new entry occupies the tail end of the original time block
  - Tags synced to the new entry via the ClickUp tags endpoint
  - Panel auto-refreshes after a successful split to show updated durations

### Changed
- `formatEntry` now includes `customId` (from `task.custom_id`) and `end` timestamp
- Entry meta badge displays custom ID when available, falls back to internal task ID

### Backend (Code.gs)
- New function `lookupTaskByCustomId(customId)` — resolves a custom task ID to `{ taskId, taskName, customId }` via the ClickUp task endpoint with `custom_task_ids=true`
- New function `splitTimeEntry(payload)` — orchestrates the split: fetches original entry, PUTs reduced duration, POSTs new entry on target task, syncs tags

---

## [1.1.0] — 2026-05-29

### Changed
- Removed hardcoded `API_TOKEN` and `TEAM_ID` constants from `Code.gs`
- Credentials now read at runtime from a `Config` sheet in a separate Google Spreadsheet
- `SPREADSHEET_ID` remains in `Code.gs` as the only hardcoded value (not a secret — just a pointer)
- Config is cached per execution via `_config` so the spreadsheet is only read once per request, regardless of how many API calls are made
- Error messages now explicitly name which key is missing from the Config sheet (`CLICKUP_API_TOKEN` or `CLICKUP_TEAM_ID`) to make misconfiguration easier to diagnose

### Config sheet format
| Key | Value |
|---|---|
| CLICKUP_API_TOKEN | pk_xxxxxxx |
| CLICKUP_TEAM_ID | xxxxxxx |

---

## [1.1.0] — 2026-05-29

### Changed
- `CLICKUP_API_TOKEN` and `CLICKUP_TEAM_ID` moved out of `Code.gs` and into a `Config` sheet in a separate Google Spreadsheet
- `Code.gs` now only contains `SPREADSHEET_ID` — a non-secret pointer to where config lives
- `getConfig()` reads the Config sheet at runtime and caches the result for the duration of the execution, so the sheet is only hit once per request
- Error messages now tell you exactly which key is missing from the Config sheet if misconfigured
- Updated README setup instructions to reflect the Config sheet approach

---

## [1.0.0] — 2026-05-29

### Added

**Weekly overview table**
- One row per developer, columns Mon–Sun + Total
- Week navigation: Prev / Next / This Week button
- Week range label in header (e.g. "May 26 – Jun 1, 2026")
- Color-coded day cells: green (7–9h), yellow (4–7h or 9–10h), red (<4h or >10h), gray (0h on workday)
- Color-coded weekly total column against 40h target (green 90–110%, yellow 60–90% or 110–125%, red otherwise)
- Weekend cells display hours without color judgment

**Developer detail panel**
- Slide-in right panel on developer row click
- Shows developer avatar (or initials fallback), name, and week range in panel header
- Entries grouped by day with day-total chip (color-coded)
- Per-entry columns: Task ID badge, Task Name, Description (textarea), Tags (comma input), Billable (toggle), Duration
- Save button per row — disabled until a change is made, enabled on any edit
- On save: syncs Description and Billable via PUT, Tags via separate POST/DELETE endpoints
- Inline success (✓ Saved) and error feedback per row
- Panel closes with × button or remains open during week navigation (re-fetches entries for new week)

**Favorites**
- Star button (☆/⭐) on every developer row
- Favorites stored via PropertiesService — per Google account, independent across PMs
- Toggle between **All** view (developers with time OR favorited) and **⭐ Favorites** view (always shows favorited devs, even with 0h)
- Favorites sorted to top of table; remaining developers sorted alphabetically

**Data**
- Fetches all time entries for the team from ClickUp `/team/{id}/time_entries` endpoint
- Developer detail fetches entries filtered by `assignee` for the selected user
- All projects included — no list/project filter

**UI**
- Dark theme with DM Sans + DM Mono typography
- Loading overlay with spinner during week fetch
- Per-panel loading state while developer entries load
- Toast notifications for errors
- Responsive scrollbars, sticky table header, sticky day-group headers in panel
