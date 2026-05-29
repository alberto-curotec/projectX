// ============================================================
// ClickUp Time by Developer — Apps Script Web App
// Version: 1.1.0
// Change: API token and Team ID moved to Config sheet in Google Spreadsheet
// ============================================================

// ── Spreadsheet pointer (not a secret — just a pointer) ──────
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Paste your Google Spreadsheet ID here

// ── Config cache (per execution) ─────────────────────────────
let _config = null;

function getConfig() {
  if (_config) return _config;

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Config');
  if (!sheet) throw new Error('Config sheet not found. Create a sheet named "Config" in your spreadsheet.');

  const rows = sheet.getDataRange().getValues();
  const cfg  = {};
  rows.forEach(([key, value]) => {
    if (key) cfg[String(key).trim()] = String(value).trim();
  });

  const token  = cfg['CLICKUP_API_TOKEN'];
  const teamId = cfg['CLICKUP_TEAM_ID'];

  if (!token)  throw new Error('CLICKUP_API_TOKEN not found in Config sheet.');
  if (!teamId) throw new Error('CLICKUP_TEAM_ID not found in Config sheet.');

  _config = {
    API_TOKEN:         token,
    TEAM_ID:           teamId,
    HOURS_TARGET_DAY:  8,
    HOURS_TARGET_WEEK: 40,
  };

  return _config;
}

// ── Entry Points ─────────────────────────────────────────────

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('ClickUp — Time by Developer')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Favorites (PropertiesService — per Google account) ───────

function getFavorites() {
  const raw = PropertiesService.getUserProperties().getProperty('favorites');
  return raw ? JSON.parse(raw) : [];
}

function setFavorites(ids) {
  PropertiesService.getUserProperties().setProperty('favorites', JSON.stringify(ids));
  return ids;
}

function toggleFavorite(userId) {
  let favs = getFavorites();
  if (favs.includes(userId)) {
    favs = favs.filter(id => id !== userId);
  } else {
    favs.push(userId);
  }
  return setFavorites(favs);
}

// ── ClickUp API Helpers ───────────────────────────────────────

function clickupGet(path) {
  const cfg = getConfig();
  const url = 'https://api.clickup.com/api/v2' + path;
  const res = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: { Authorization: cfg.API_TOKEN },
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code !== 200) throw new Error('ClickUp API error ' + code + ': ' + res.getContentText());
  return JSON.parse(res.getContentText());
}

function clickupPut(path, payload) {
  const cfg = getConfig();
  const url = 'https://api.clickup.com/api/v2' + path;
  const res = UrlFetchApp.fetch(url, {
    method: 'PUT',
    headers: { Authorization: cfg.API_TOKEN, 'Content-Type': 'application/json' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code !== 200) throw new Error('ClickUp API error ' + code + ': ' + res.getContentText());
  return JSON.parse(res.getContentText());
}

function clickupPost(path, payload) {
  const cfg = getConfig();
  const url = 'https://api.clickup.com/api/v2' + path;
  const res = UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: { Authorization: cfg.API_TOKEN, 'Content-Type': 'application/json' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code !== 200 && code !== 201) throw new Error('ClickUp API error ' + code + ': ' + res.getContentText());
  return JSON.parse(res.getContentText());
}

function clickupDelete(path) {
  const cfg = getConfig();
  const url = 'https://api.clickup.com/api/v2' + path;
  const res = UrlFetchApp.fetch(url, {
    method: 'DELETE',
    headers: { Authorization: cfg.API_TOKEN },
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code !== 200 && code !== 204) throw new Error('ClickUp API error ' + code + ': ' + res.getContentText());
  return true;
}

// ── Team Members ──────────────────────────────────────────────

function getTeamMembers() {
  const cfg  = getConfig();
  const data = clickupGet('/team');
  const teams = data.teams || [];
  const team  = teams.find(t => t.id === cfg.TEAM_ID) || teams[0];
  if (!team) throw new Error('Team not found. Check CLICKUP_TEAM_ID in your Config sheet.');
  return (team.members || []).map(m => ({
    id:       String(m.user.id),
    name:     m.user.username || m.user.email,
    email:    m.user.email,
    avatar:   m.user.profilePicture || null,
    initials: initials(m.user.username || m.user.email),
  }));
}

function initials(name) {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name || '?').substring(0, 2).toUpperCase();
}

// ── Time Entries ──────────────────────────────────────────────

/**
 * Fetches all time entries for all team members for the given week.
 * Returns { members, byUser, targets, weekStartMs }
 *   byUser[userId] = { mon: ms, tue: ms, ... , total: ms, entries: [...] }
 */
function getWeekData(weekStartMs) {
  const cfg       = getConfig();
  const weekStart = new Date(weekStartMs);
  const weekEnd   = new Date(weekStartMs + 7 * 24 * 60 * 60 * 1000 - 1);

  const members = getTeamMembers();
  const favs    = getFavorites();

  const path    = `/team/${cfg.TEAM_ID}/time_entries?start_date=${weekStart.getTime()}&end_date=${weekEnd.getTime()}`;
  const data    = clickupGet(path);
  const entries = data.data || [];

  // Build per-user buckets
  const byUser = {};
  members.forEach(m => {
    byUser[m.id] = { mon:0, tue:0, wed:0, thu:0, fri:0, sat:0, sun:0, total:0, entries:[] };
  });

  entries.forEach(e => {
    const uid = String(e.user?.id);
    if (!byUser[uid]) return;

    const dayKey = msToDayKey(Number(e.start));
    const ms     = Number(e.duration);

    if (byUser[uid][dayKey] !== undefined) {
      byUser[uid][dayKey] += ms;
      byUser[uid].total   += ms;
    }

    byUser[uid].entries.push(formatEntry(e));
  });

  return {
    members:  members.map(m => ({ ...m, isFavorite: favs.includes(m.id) })),
    byUser,
    targets:  { day: cfg.HOURS_TARGET_DAY, week: cfg.HOURS_TARGET_WEEK },
    weekStartMs,
  };
}

/**
 * Fetches the full-week detail entries for one developer.
 */
function getDeveloperWeek(userId, weekStartMs) {
  const cfg       = getConfig();
  const weekStart = new Date(weekStartMs);
  const weekEnd   = new Date(weekStartMs + 7 * 24 * 60 * 60 * 1000 - 1);

  const path = `/team/${cfg.TEAM_ID}/time_entries?start_date=${weekStart.getTime()}&end_date=${weekEnd.getTime()}&assignee=${userId}`;
  const data  = clickupGet(path);
  return (data.data || []).map(formatEntry);
}

function formatEntry(e) {
  return {
    id:          e.id,
    taskId:      e.task?.id   || '',
    taskName:    e.task?.name || '(no task)',
    description: e.description || '',
    durationMs:  Number(e.duration),
    start:       Number(e.start),
    billable:    !!e.billable,
    tags:        (e.tags || []).map(t => t.name),
  };
}

function msToDayKey(ms) {
  const d = new Date(ms);
  return ['sun','mon','tue','wed','thu','fri','sat'][d.getDay()];
}

// ── Sync: Update a single time entry ─────────────────────────

/**
 * payload: { entryId, description?, billable?, tags? }
 * tags: full replacement array of tag name strings
 */
function saveEntryChanges(payload) {
  const cfg = getConfig();
  const { entryId, description, billable, tags } = payload;

  const body = {};
  if (description !== undefined) body.description = description;
  if (billable    !== undefined) body.billable    = billable;

  if (Object.keys(body).length > 0) {
    clickupPut(`/team/${cfg.TEAM_ID}/time_entries/${entryId}`, body);
  }

  if (tags !== undefined) {
    syncTags(entryId, tags);
  }

  return { ok: true };
}

function syncTags(entryId, newTags) {
  const cfg     = getConfig();
  const current = clickupGet(`/team/${cfg.TEAM_ID}/time_entries/${entryId}`);
  const currentTags = ((current.data && current.data.tags) || []).map(t => t.name);

  const toAdd    = newTags.filter(t => !currentTags.includes(t));
  const toRemove = currentTags.filter(t => !newTags.includes(t));

  toAdd.forEach(name => {
    try {
      clickupPost(`/team/${cfg.TEAM_ID}/time_entries/${entryId}/tags`, { tags: [{ name }] });
    } catch(e) {
      Logger.log('Tag add failed for "' + name + '": ' + e.message);
    }
  });

  toRemove.forEach(name => {
    try {
      clickupDelete(`/team/${cfg.TEAM_ID}/time_entries/${entryId}/tags?tags=${encodeURIComponent(name)}`);
    } catch(e) {
      Logger.log('Tag remove failed for "' + name + '": ' + e.message);
    }
  });
}
