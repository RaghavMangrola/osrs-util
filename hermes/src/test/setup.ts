import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock the HTTP transport (formerly @tauri-apps/api/core). App.tsx imports
// "./api" and HerbSelector imports "../api"; both resolve to src/api.ts, so
// mocking it here replaces `invoke` for every call site.
vi.mock("../api", () => ({
  invoke: vi.fn(),
}));
