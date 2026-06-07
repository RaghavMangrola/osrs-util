import { vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { LauncherConfig } from "../types";

export function makeLauncher(overrides: Partial<LauncherConfig> = {}): LauncherConfig {
  return {
    id: "test-id-1",
    name: "Test App",
    executable: "C:\\test\\app.exe",
    arguments: "--flag value",
    workingDirectory: "C:\\test",
    category: "General",
    icon: "🚀",
    envVars: {},
    ...overrides,
  };
}

export function mockInvokeWith(
  routes: Record<string, unknown>,
): void {
  vi.mocked(invoke).mockImplementation((cmd: string) => {
    if (cmd === "get_valid_herbs") return Promise.resolve([]) as never;
    if (cmd === "get_current_herb") return Promise.resolve("RANARR") as never;
    if (cmd in routes) return Promise.resolve(routes[cmd]) as never;
    return Promise.resolve(undefined) as never;
  });
}
