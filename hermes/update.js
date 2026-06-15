import { execSync, spawn } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import path from "node:path";

// Updates an already-installed Hermes in place by rebuilding the release exe and
// copying it over the installed one — no NSIS installer run required. Faster than
// `tauri build` because it skips installer packaging. The Start-menu shortcut and
// uninstaller entry already point at this path, so they keep working.
//
// Note: the version shown in Windows "Installed apps" stays at whatever the last
// real installer wrote until you run `npm run tauri build` + `npm run install:app`
// again — purely cosmetic.

const root = import.meta.dirname;
const builtExe = path.join(root, "src-tauri/target/release/hermes.exe");
const installDir = path.join(process.env.LOCALAPPDATA, "hermes");
const installedExe = path.join(installDir, "hermes.exe");

const sleep = (ms) =>
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function run(cmd, cwd = root) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd });
}

if (!existsSync(installDir)) {
  console.error(
    `Hermes is not installed at ${installDir}.\n` +
      `Run 'npm run tauri build' then 'npm run install:app' once before using update.`
  );
  process.exit(1);
}

// 1. Build the frontend (dist/) and the release binary. `cargo build --release`
//    embeds the freshly built dist, so this produces a complete standalone exe.
run("npm run build");
run("cargo build --release", path.join(root, "src-tauri"));

if (!existsSync(builtExe)) {
  console.error(`Build did not produce ${builtExe}`);
  process.exit(1);
}

// 2. Close the running app so the installed exe isn't locked.
try {
  execSync("taskkill /IM hermes.exe /F", { stdio: "ignore" });
  console.log("Closed running Hermes.");
} catch {
  // Not running — nothing to close.
}

// 3. Swap the exe, retrying briefly in case the old process is still releasing it.
let swapped = false;
for (let i = 0; i < 10 && !swapped; i++) {
  try {
    copyFileSync(builtExe, installedExe);
    swapped = true;
  } catch (e) {
    if (i === 9) {
      console.error(`Failed to replace ${installedExe}: ${e.message}`);
      process.exit(1);
    }
    sleep(200);
  }
}
console.log(`Updated ${installedExe}`);

// 4. Relaunch the updated app, detached.
spawn(installedExe, { detached: true, stdio: "ignore" }).unref();
console.log("Relaunched Hermes.");
