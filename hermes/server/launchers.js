// Launcher CRUD + process spawning. Ported from src-tauri/src/lib.rs
// (get_launchers, add_launcher, update_launcher, delete_launcher, launch_app).

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

export function getDataPath() {
  const home = process.env.USERPROFILE || process.env.HOME;
  if (!home) throw new Error('Failed to get home directory');
  const dir = path.join(home, 'Documents', 'Hermes');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'launchers.json');
}

/** Strip a UTF-8 BOM and surrounding whitespace before JSON parsing. */
function cleanJson(raw) {
  return raw.replace(/^﻿/, '').trim();
}

export function parseLaunchers(raw) {
  const cleaned = cleanJson(raw);
  if (cleaned === '') return [];
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Failed to parse launchers.json: ${e.message}`);
  }
}

function loadLaunchers() {
  const file = getDataPath();
  if (!fs.existsSync(file)) return [];
  return parseLaunchers(fs.readFileSync(file, 'utf8'));
}

function saveLaunchers(launchers) {
  fs.writeFileSync(getDataPath(), JSON.stringify(launchers, null, 2));
}

export function getLaunchers() {
  return loadLaunchers();
}

function fromFormData(data) {
  return {
    name: data.name,
    executable: data.executable,
    arguments: data.arguments,
    workingDirectory: data.workingDirectory,
    category: data.category,
    icon: data.icon,
    envVars: data.envVars || {},
  };
}

export function addLauncher({ data }) {
  const launchers = loadLaunchers();
  const config = { id: crypto.randomUUID(), ...fromFormData(data) };
  launchers.push(config);
  saveLaunchers(launchers);
  return config;
}

export function updateLauncher({ id, data }) {
  const launchers = loadLaunchers();
  const launcher = launchers.find((l) => l.id === id);
  if (!launcher) throw new Error('Launcher not found');
  Object.assign(launcher, fromFormData(data));
  saveLaunchers(launchers);
  return launcher;
}

export function deleteLauncher({ id }) {
  const launchers = loadLaunchers().filter((l) => l.id !== id);
  saveLaunchers(launchers);
  return null;
}

/**
 * Split a command-argument string into argv, matching the Rust `shell_words`
 * crate: whitespace separates words; single quotes are literal; double quotes
 * allow backslash escaping of " \ $ `; an unquoted backslash escapes the next
 * char. No glob/operator/variable expansion. Throws on an unterminated quote or
 * a dangling backslash.
 */
export function splitArgs(line) {
  const args = [];
  let cur = null; // null = no current token; '' = empty token started by a quote
  let i = 0;
  const n = line.length;
  while (i < n) {
    const c = line[i];
    if (c === "'") {
      cur = cur ?? '';
      i++;
      while (i < n && line[i] !== "'") cur += line[i++];
      if (i >= n) throw new Error('Missing closing quote');
      i++;
    } else if (c === '"') {
      cur = cur ?? '';
      i++;
      while (i < n && line[i] !== '"') {
        if (line[i] === '\\' && i + 1 < n && ['"', '\\', '$', '`'].includes(line[i + 1])) {
          cur += line[i + 1];
          i += 2;
        } else {
          cur += line[i++];
        }
      }
      if (i >= n) throw new Error('Missing closing quote');
      i++;
    } else if (c === '\\') {
      if (i + 1 >= n) throw new Error('Dangling backslash');
      cur = (cur ?? '') + line[i + 1];
      i += 2;
    } else if (/\s/.test(c)) {
      if (cur !== null) {
        args.push(cur);
        cur = null;
      }
      i++;
    } else {
      cur = (cur ?? '') + c;
      i++;
    }
  }
  if (cur !== null) args.push(cur);
  return args;
}

export function launchApp({ config }) {
  const args = config.arguments ? splitArgs(config.arguments) : [];
  const options = {
    env: { ...process.env, ...(config.envVars || {}) },
    detached: true,
    stdio: 'ignore',
  };
  if (config.workingDirectory) options.cwd = config.workingDirectory;

  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(config.executable, args, options);
    } catch (e) {
      reject(new Error(`Failed to launch: ${e.message}`));
      return;
    }
    child.once('error', (e) => reject(new Error(`Failed to launch: ${e.message}`)));
    child.once('spawn', () => {
      child.unref();
      resolve(null);
    });
  });
}
