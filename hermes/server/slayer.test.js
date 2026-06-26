import { test } from 'node:test';
import assert from 'node:assert';

import { parseTasksLog, buildSlayerSummary, computeRevStats } from './slayer.js';

const line = (o) => JSON.stringify(o);

test('parseTasksLog skips blank and malformed lines', () => {
  const content = [
    line({ taskName: 'Bats', taskCompletionTime: 1, taskStreak: 1 }),
    '',
    '{ not valid json',
    line({ taskName: 'Ghosts', taskCompletionTime: 2, taskStreak: 2 }),
    '',
  ].join('\n');

  const tasks = parseTasksLog(content);
  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].taskName, 'Bats');
  assert.equal(tasks[1].taskName, 'Ghosts');
});

test('buildSlayerSummary counts only completed tasks since the last Revenants', () => {
  const content = [
    { taskName: 'Bats', taskMaster: 'Turael/Aya', taskQuantity: 20, skipped: false, taskCompletionTime: 1, taskStreak: 10 },
    { taskName: 'Revenants', taskMaster: 'Krystilia', taskQuantity: 140, skipped: false, taskCompletionTime: 2, taskStreak: 11 },
    { taskName: 'Scorpions', taskMaster: 'Krystilia', taskQuantity: 80, skipped: true, taskCompletionTime: 3, taskStreak: 0 },
    { taskName: 'Skeletons', taskMaster: 'Turael/Aya', taskQuantity: 25, skipped: false, taskCompletionTime: 4, taskStreak: 12 },
    { taskName: 'Ghosts', taskMaster: 'Turael/Aya', taskQuantity: 15, skipped: false, taskCompletionTime: 5, taskStreak: 13 },
  ].map(line).join('\n');

  const s = buildSlayerSummary(content);
  assert.equal(s.totalTasks, 4, 'skipped task excluded from completed total');
  assert.equal(s.tasksSinceRevenant, 2, 'skipped Scorpions not counted');
  assert.equal(s.currentStreak, 13);
  assert.equal(s.lastTaskTime, 5);
  assert.deepEqual(s.lastRevenant, { completionTime: 2, quantity: 140, streak: 11, stored: false });
  // Newest-first, completed only — skipped Scorpions omitted.
  assert.deepEqual(s.tasksSince.map((t) => t.taskName), ['Ghosts', 'Skeletons']);
});

test('buildSlayerSummary ignores a skipped Revenants when finding the last one', () => {
  const content = [
    { taskName: 'Revenants', taskMaster: 'Krystilia', taskQuantity: 140, skipped: false, taskCompletionTime: 1, taskStreak: 1 },
    { taskName: 'Bats', taskMaster: 'Turael/Aya', taskQuantity: 20, skipped: false, taskCompletionTime: 2, taskStreak: 2 },
    { taskName: 'Revenants', taskMaster: 'Krystilia', taskQuantity: 140, skipped: true, taskCompletionTime: 3, taskStreak: 0 },
    { taskName: 'Ghosts', taskMaster: 'Turael/Aya', taskQuantity: 15, skipped: false, taskCompletionTime: 4, taskStreak: 3 },
  ].map(line).join('\n');

  const s = buildSlayerSummary(content);
  // The skipped rev at t=3 doesn't reset; last completed rev is t=1.
  assert.equal(s.lastRevenant.completionTime, 1);
  assert.deepEqual(s.tasksSince.map((t) => t.taskName), ['Ghosts', 'Bats']);
  assert.equal(s.tasksSinceRevenant, 2);
});

test('buildSlayerSummary uses the most recent Revenants when several exist', () => {
  const content = [
    { taskName: 'Revenants', taskQuantity: 140, skipped: false, taskCompletionTime: 1, taskStreak: 1 },
    { taskName: 'Bats', taskQuantity: 20, skipped: false, taskCompletionTime: 2, taskStreak: 2 },
    { taskName: 'Revenants', taskQuantity: 140, skipped: false, taskCompletionTime: 3, taskStreak: 3 },
    { taskName: 'Bats', taskQuantity: 20, skipped: false, taskCompletionTime: 4, taskStreak: 4 },
  ].map(line).join('\n');

  const s = buildSlayerSummary(content);
  assert.equal(s.tasksSinceRevenant, 1);
  assert.equal(s.lastRevenant.completionTime, 3);
});

test('buildSlayerSummary falls back to all tasks when no Revenants on record', () => {
  const content = [
    { taskName: 'Bats', taskQuantity: 20, skipped: false, taskCompletionTime: 1, taskStreak: 1 },
    { taskName: 'Ghosts', taskQuantity: 15, skipped: true, taskCompletionTime: 2, taskStreak: 1 },
  ].map(line).join('\n');

  const s = buildSlayerSummary(content);
  assert.equal(s.lastRevenant, null);
  // Only the completed Bats counts; skipped Ghosts excluded.
  assert.equal(s.tasksSinceRevenant, 1);
  assert.deepEqual(s.tasksSince.map((t) => t.taskName), ['Bats']);
});

test('buildSlayerSummary marker resets the count when newer than the logged Revenants', () => {
  const content = [
    { taskName: 'Revenants', taskQuantity: 140, skipped: false, taskCompletionTime: 100, taskStreak: 1 },
    { taskName: 'Bats', taskQuantity: 20, skipped: false, taskCompletionTime: 200, taskStreak: 2 },
    { taskName: 'Ghosts', taskQuantity: 15, skipped: false, taskCompletionTime: 300, taskStreak: 3 },
  ].map(line).join('\n');

  // Marker set at t=350, after the two post-Revenants tasks → counter resets to 0.
  const s = buildSlayerSummary(content, 350);
  assert.equal(s.tasksSinceRevenant, 0);
  assert.equal(s.markerTime, 350);
  assert.deepEqual(s.lastRevenant, {
    completionTime: 350,
    quantity: null,
    streak: null,
    stored: true,
  });
});

test('buildSlayerSummary counts tasks completed after the marker', () => {
  const content = [
    { taskName: 'Revenants', taskQuantity: 140, skipped: false, taskCompletionTime: 100, taskStreak: 1 },
    { taskName: 'Bats', taskQuantity: 20, skipped: false, taskCompletionTime: 200, taskStreak: 2 },
    { taskName: 'Ghosts', taskQuantity: 15, skipped: false, taskCompletionTime: 300, taskStreak: 3 },
  ].map(line).join('\n');

  // Marker at t=150 → only the two tasks after it count.
  const s = buildSlayerSummary(content, 150);
  assert.equal(s.tasksSinceRevenant, 2);
  assert.deepEqual(s.tasksSince.map((t) => t.taskName), ['Ghosts', 'Bats']);
  assert.equal(s.lastRevenant.stored, true);
});

test('buildSlayerSummary lets a newer logged Revenants supersede an older marker', () => {
  const content = [
    { taskName: 'Bats', taskQuantity: 20, skipped: false, taskCompletionTime: 200, taskStreak: 2 },
    { taskName: 'Revenants', taskQuantity: 140, skipped: false, taskCompletionTime: 300, taskStreak: 3 },
    { taskName: 'Ghosts', taskQuantity: 15, skipped: false, taskCompletionTime: 400, taskStreak: 4 },
  ].map(line).join('\n');

  // Marker at t=150 is older than the logged Revenants at t=300 → log wins.
  const s = buildSlayerSummary(content, 150);
  assert.equal(s.lastRevenant.stored, false);
  assert.equal(s.lastRevenant.completionTime, 300);
  assert.equal(s.tasksSinceRevenant, 1); // only Ghosts (t=400)
});

test('computeRevStats reports count, average, shortest, longest', () => {
  const gaps = [
    { tasks: 44, date: 1 },
    { tasks: 30, date: 2 },
    { tasks: 58, date: 3 },
  ];
  const s = computeRevStats(gaps);
  assert.equal(s.count, 3);
  assert.equal(s.average, (44 + 30 + 58) / 3);
  assert.equal(s.shortest, 30);
  assert.equal(s.longest, 58);
  // Newest-first for display.
  assert.deepEqual(s.recent.map((g) => g.tasks), [58, 30, 44]);
});

test('computeRevStats handles an empty ledger', () => {
  const s = computeRevStats([]);
  assert.deepEqual(s, { count: 0, average: null, shortest: null, longest: null, recent: [] });
});

test('buildSlayerSummary handles an empty log', () => {
  const s = buildSlayerSummary('');
  assert.equal(s.totalTasks, 0);
  assert.equal(s.tasksSinceRevenant, 0);
  assert.equal(s.currentStreak, 0);
  assert.equal(s.lastTaskTime, null);
  assert.equal(s.lastRevenant, null);
});
