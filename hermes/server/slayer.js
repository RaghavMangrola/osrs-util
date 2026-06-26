// Slayer History plugin data — "tasks since last Revenants" tracker for the
// funmaxxing account's Turael-skipping grind.
//
// The RuneLite "Slayer History" plugin writes one JSON object per line to
// ~/.runelite/slayer-history/<accountHash>/tasks.log. Folders are keyed by the
// opaque Jagex account hash (not the display name), so we can't map "funmaxxing"
// by name the way seeds.js does. Instead we pick the account whose log has the
// most recent task — the funmaxxing account is the only one that does slayer.

import fs from 'node:fs';
import path from 'node:path';

export const SLAYER_HISTORY_DIR = 'C:/Users/raghav/.runelite/slayer-history';
const TASKS_LOG = 'tasks.log';
const REVENANTS_TASK = 'Revenants';

// A stored (uncompleted) Revenants task isn't written to the plugin log until
// it's finished, so the user manually records "I just got a Revenants task" to
// reset the drought counter now. We persist both the open marker (a timestamp;
// once the real completion lands in the log at a later time it supersedes the
// marker) and a ledger of closed gaps for stats (avg / shortest / longest).
//
// Schema (~/Documents/Hermes/slayer-markers.json):
//   { revMarkerTime: number|null,
//     revGaps: [ { tasks: number, date: number, prevMarker: number|null } ] }
function getStatsPath() {
  const home = process.env.USERPROFILE || process.env.HOME;
  if (!home) throw new Error('Failed to get home directory');
  const dir = path.join(home, 'Documents', 'Hermes');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'slayer-markers.json');
}

export function loadStats() {
  const file = getStatsPath();
  if (!fs.existsSync(file)) return { revMarkerTime: null, revGaps: [] };
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      revMarkerTime: typeof data.revMarkerTime === 'number' ? data.revMarkerTime : null,
      revGaps: Array.isArray(data.revGaps) ? data.revGaps : [],
    };
  } catch {
    return { revMarkerTime: null, revGaps: [] };
  }
}

function saveStats(stats) {
  fs.writeFileSync(getStatsPath(), JSON.stringify(stats, null, 2));
}

/** Aggregate stats from the closed-gap ledger (pure, testable). */
export function computeRevStats(revGaps) {
  const tasks = revGaps.map((g) => g.tasks);
  if (tasks.length === 0) {
    return { count: 0, average: null, shortest: null, longest: null, recent: [] };
  }
  const sum = tasks.reduce((a, b) => a + b, 0);
  return {
    count: tasks.length,
    average: sum / tasks.length,
    shortest: Math.min(...tasks),
    longest: Math.max(...tasks),
    // Newest-first, last 10 gaps for display.
    recent: revGaps
      .slice(-10)
      .reverse()
      .map((g) => ({ tasks: g.tasks, date: g.date })),
  };
}

/**
 * Record that a Revenants task was just obtained: close the current gap (the
 * tasks-since-last-rev count) into the ledger and reset the counter to now.
 */
export function recordRevTask() {
  const { content } = readActiveAccount();
  const stats = loadStats();
  const summary = buildSlayerSummary(content, stats.revMarkerTime);
  const now = Date.now();
  stats.revGaps.push({
    tasks: summary.tasksSinceRevenant,
    date: now,
    prevMarker: stats.revMarkerTime,
  });
  stats.revMarkerTime = now;
  saveStats(stats);
  return { recorded: summary.tasksSinceRevenant };
}

/** Undo the most recent record: drop the last gap and restore the prior marker. */
export function undoRevTask() {
  const stats = loadStats();
  if (stats.revGaps.length > 0) {
    const last = stats.revGaps.pop();
    stats.revMarkerTime = last.prevMarker ?? null;
  } else {
    stats.revMarkerTime = null;
  }
  saveStats(stats);
  return null;
}

/**
 * Parse a tasks.log body (JSONL) into an array of task records, in file order
 * (oldest first). Blank and malformed lines are skipped.
 */
export function parseTasksLog(content) {
  const tasks = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      tasks.push(JSON.parse(trimmed));
    } catch {
      // Skip a partially-written or corrupt line rather than failing the whole read.
    }
  }
  return tasks;
}

/**
 * Build the "since last Revenants" summary from a tasks.log body (pure, testable).
 *
 * Skipped tasks are ignored entirely — they're done for unrelated reasons, so
 * they don't count toward the Revenants drought, and a *skipped* Revenants task
 * doesn't reset the counter (only a completed one does).
 *
 * `markerTime` (epoch ms, optional) is a manual "got a Revenants task" reset for
 * a task parked in storage that the plugin hasn't logged yet. The reset point is
 * the later of the last completed Revenants and the marker, so once the stored
 * task is actually completed (a newer log entry) it supersedes the marker.
 * Returns null `lastRevenant` when neither a completed Revenants nor a marker exists.
 */
export function buildSlayerSummary(content, markerTime = null) {
  const tasks = parseTasksLog(content);
  const last = tasks.length > 0 ? tasks[tasks.length - 1] : null;

  // Most recent *completed* Revenants assignment in the log.
  let loggedRevTime = null;
  let loggedRev = null;
  for (let i = tasks.length - 1; i >= 0; i--) {
    if (tasks[i].taskName === REVENANTS_TASK && !tasks[i].skipped) {
      loggedRevTime = tasks[i].taskCompletionTime;
      loggedRev = tasks[i];
      break;
    }
  }

  // The reset point is whichever is later: the logged completion or the marker.
  const marker = typeof markerTime === 'number' ? markerTime : null;
  const useMarker = marker !== null && (loggedRevTime === null || marker > loggedRevTime);
  const effectiveRevTime = useMarker ? marker : loggedRevTime;

  // Completed tasks after the reset point (by time, so the marker works too).
  const since = tasks.filter(
    (t) => !t.skipped && (effectiveRevTime === null || t.taskCompletionTime > effectiveRevTime)
  );

  let lastRevenant = null;
  if (useMarker) {
    lastRevenant = { completionTime: marker, quantity: null, streak: null, stored: true };
  } else if (loggedRev) {
    lastRevenant = {
      completionTime: loggedRev.taskCompletionTime,
      quantity: loggedRev.taskQuantity,
      streak: loggedRev.taskStreak,
      stored: false,
    };
  }

  return {
    totalTasks: tasks.filter((t) => !t.skipped).length,
    currentStreak: last ? last.taskStreak : 0,
    lastTaskTime: last ? last.taskCompletionTime : null,
    lastRevenant,
    markerTime: marker,
    tasksSinceRevenant: since.length,
    // Newest-first list of the completed tasks since the reset point.
    tasksSince: since
      .slice()
      .reverse()
      .map((t) => ({
        taskName: t.taskName,
        taskMaster: t.taskMaster,
        taskQuantity: t.taskQuantity,
        taskCompletionTime: t.taskCompletionTime,
      })),
  };
}

/**
 * Find the active funmaxxing account folder: the slayer-history subdirectory
 * whose tasks.log has the most recent task. Returns { account, content } or
 * throws if no account has any slayer data.
 */
export function readActiveAccount(dir = SLAYER_HISTORY_DIR) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    throw new Error(`Failed to read ${dir}: ${e.message}`);
  }

  let best = null; // { account, content, latest }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const logPath = path.join(dir, entry.name, TASKS_LOG);
    let content;
    try {
      content = fs.readFileSync(logPath, 'utf8');
    } catch {
      continue; // No log for this account.
    }
    const tasks = parseTasksLog(content);
    if (tasks.length === 0) continue;
    const latest = tasks[tasks.length - 1].taskCompletionTime || 0;
    if (best === null || latest > best.latest) {
      best = { account: entry.name, content, latest };
    }
  }

  if (best === null) {
    throw new Error(`No Slayer History data found in ${dir}`);
  }
  return { account: best.account, content: best.content };
}

export function getSlayerStatus() {
  const { account, content } = readActiveAccount();
  const stats = loadStats();
  return {
    account,
    ...buildSlayerSummary(content, stats.revMarkerTime),
    revStats: computeRevStats(stats.revGaps),
  };
}
