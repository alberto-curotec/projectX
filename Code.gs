// ============================================================
// ClickUp Time by Developer — Apps Script Web App
// Version: 1.6.2
// ============================================================

// ── Spreadsheet pointer (not a secret — just a pointer) ──────
const SPREADSHEET_ID = '1xFMDMGj5g7RCEKKvkMCh7npQub00ZyIC87Zg0ojEE4Y'; // Paste your Google Spreadsheet ID here

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

// ── Entry Point ───────────────────────────────────────────────

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

function getTeamId() {
  return getConfig().TEAM_ID;
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

// ── Screen 1: Developer List ──────────────────────────────────

function getMembers() {
  const cfg   = getConfig();
  const favs  = getFavorites();
  const data  = clickupGet('/team');
  const teams = data.teams || [];
  const team  = teams.find(t => t.id === cfg.TEAM_ID) || teams[0];
  if (!team) throw new Error('Team not found. Check CLICKUP_TEAM_ID in your Config sheet.');

  return (team.members || [])
    .filter(m => Number(m.user.role) !== 4)  // exclude guest role
    .map(m => ({
      id:         String(m.user.id),
      name:       m.user.username || m.user.email,
      email:      m.user.email,
      avatar:     m.user.profilePicture || null,
      initials:   initials(m.user.username || m.user.email),
      isFavorite: favs.includes(String(m.user.id)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function initials(name) {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name || '?').substring(0, 2).toUpperCase();
}

// ── Screen 2: Developer Time View ────────────────────────────

function getDeveloperWeekData(userId, weekStartMs) {
  const cfg       = getConfig();
  const weekStart = new Date(weekStartMs);
  const weekEnd   = new Date(weekStartMs + 7 * 24 * 60 * 60 * 1000 - 1);

  const path    = `/team/${cfg.TEAM_ID}/time_entries?start_date=${weekStart.getTime()}&end_date=${weekEnd.getTime()}&assignee=${userId}`;
  const data    = clickupGet(path);
  const entries = (data.data || []).map(formatEntry);

  const byDay = { mon:0, tue:0, wed:0, thu:0, fri:0, sat:0, sun:0, total:0 };
  entries.forEach(e => {
    const key = msToDayKey(e.start);
    if (byDay[key] !== undefined) {
      byDay[key]  += e.durationMs;
      byDay.total += e.durationMs;
    }
  });

  return { byDay, entries, targets: { day: cfg.HOURS_TARGET_DAY, week: cfg.HOURS_TARGET_WEEK }, weekStartMs };
}

function formatEntry(e) {
  return {
    id:          e.id,
    taskId:      e.task?.id   || '',
    customId:    e.task?.custom_id || '',
    taskName:    e.task?.name || '(no task)',
    description: e.description || '',
    durationMs:  Number(e.duration),
    start:       Number(e.start),
    end:         Number(e.start) + Number(e.duration),
    billable:    !!e.billable,
    tags:        (e.tags || []).map(t => t.name),
  };
}

function msToDayKey(ms) {
  return ['sun','mon','tue','wed','thu','fri','sat'][new Date(ms).getDay()];
}

// ── Sync: Update a single time entry ─────────────────────────

function saveEntryChanges(payload) {
  const cfg = getConfig();
  const { entryId, description, billable, tags } = payload;

  const body = {};
  if (description !== undefined) body.description = description;
  if (billable    !== undefined) body.billable    = billable;

  if (Object.keys(body).length > 0) {
    clickupPut(`/team/${cfg.TEAM_ID}/time_entries/${entryId}`, body);
  }

  if (tags !== undefined) syncTags(entryId, tags);

  return { ok: true };
}

// ── Tag sync helper ───────────────────────────────────────────

function syncTags(entryId, newTags) {
  const cfg         = getConfig();
  const current     = clickupGet(`/team/${cfg.TEAM_ID}/time_entries/${entryId}`);
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

// ── Lookup task by custom ID (e.g. CTK-123) ─────────────────

function lookupTaskByCustomId(customId) {
  const cfg = getConfig();
  const url = `/task/${encodeURIComponent(customId)}?custom_task_ids=true&team_id=${cfg.TEAM_ID}`;
  try {
    const data = clickupGet(url);
    if (!data || !data.id) throw new Error('Task not found');
    return {
      taskId:   data.id,
      taskName: data.name || '(unnamed)',
      customId: data.custom_id || customId,
    };
  } catch (e) {
    throw new Error('Could not resolve "' + customId + '": ' + e.message);
  }
}

// ── Split time entry ─────────────────────────────────────────
//
// Takes: { entryId, splitMs, newTaskId, newDescription, newBillable, newTags, userId }
//
// 1. Fetches the original entry to get its start & duration
// 2. Reduces the original duration by splitMs
// 3. Creates a new entry on newTaskId with:
//      start = original.start + (original.duration - splitMs)
//      duration = splitMs
// 4. Syncs tags on the new entry

function splitTimeEntry(payload) {
  const cfg = getConfig();
  const { entryId, splitMs, newTaskId, newDescription, newBillable, newTags, userId } = payload;

  // 1. Fetch original entry
  const current = clickupGet(`/team/${cfg.TEAM_ID}/time_entries/${entryId}`);
  const entry   = current.data || current;
  const origStart    = Number(entry.start);
  const origDuration = Number(entry.duration);

  if (splitMs <= 0 || splitMs >= origDuration) {
    throw new Error('Split amount must be between 0 and the full duration (' + origDuration + 'ms).');
  }

  const remainMs  = origDuration - splitMs;
  const newStart  = origStart + remainMs;    // new entry starts where original now ends

  // 2. Reduce original entry duration
  clickupPut(`/team/${cfg.TEAM_ID}/time_entries/${entryId}`, {
    duration: String(remainMs),
  });

  // 3. Create new entry on the target task
  const newEntry = clickupPost(`/team/${cfg.TEAM_ID}/time_entries`, {
    tid:         newTaskId,
    start:       String(newStart),
    duration:    String(splitMs),
    description: newDescription || '',
    billable:    !!newBillable,
    assignee:    userId ? Number(userId) : undefined,
  });

  // 4. Sync tags on the new entry if any
  const newEntryId = newEntry.data?.id || newEntry.id;
  if (newTags && newTags.length > 0 && newEntryId) {
    try {
      clickupPost(`/team/${cfg.TEAM_ID}/time_entries/${newEntryId}/tags`, {
        tags: newTags.map(name => ({ name })),
      });
    } catch (e) {
      Logger.log('Tag add on split entry failed: ' + e.message);
    }
  }

  return { ok: true, newEntryId: newEntryId };
}