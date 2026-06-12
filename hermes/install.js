import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const setup = path.join(
  import.meta.dirname,
  "src-tauri/target/release/bundle/nsis/hermes_0.2.0_x64-setup.exe"
);

if (!existsSync(setup)) {
  console.error(`Installer not found at ${setup} — run 'npm run tauri build' first.`);
  process.exit(1);
}

console.log("Installing Hermes...");
execFileSync(setup, ["/S"]);
console.log("Done.");
