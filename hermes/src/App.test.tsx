import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import App from "./App";
import { makeLauncher, mockInvokeWith } from "./test/helpers";

const mockInvoke = vi.mocked(invoke);

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header and add button", async () => {
    mockInvokeWith({ get_launchers: [] });
    render(<App />);

    expect(screen.getByText("Hermes")).toBeInTheDocument();
    expect(screen.getByText("+ Add Launcher")).toBeInTheDocument();
  });

  it("shows empty state when no launchers exist", async () => {
    mockInvokeWith({ get_launchers: [] });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("No launchers yet. Add one to get started!")).toBeInTheDocument();
    });
  });

  it("loads and displays launchers on mount", async () => {
    const launchers = [
      makeLauncher({ id: "1", name: "App One", category: "Tools" }),
      makeLauncher({ id: "2", name: "App Two", category: "Games" }),
    ];
    mockInvokeWith({ get_launchers: launchers });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("App One")).toBeInTheDocument();
      expect(screen.getByText("App Two")).toBeInTheDocument();
    });
    expect(mockInvoke).toHaveBeenCalledWith("get_launchers");
  });

  it("filters launchers by search text (name)", async () => {
    const user = userEvent.setup();
    const launchers = [
      makeLauncher({ id: "1", name: "RuneLite" }),
      makeLauncher({ id: "2", name: "VS Code" }),
    ];
    mockInvokeWith({ get_launchers: launchers });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("RuneLite")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("Search launchers..."), "rune");

    expect(screen.getByText("RuneLite")).toBeInTheDocument();
    expect(screen.queryByText("VS Code")).not.toBeInTheDocument();
  });

  it("filters launchers by search text (executable path)", async () => {
    const user = userEvent.setup();
    const launchers = [
      makeLauncher({ id: "1", name: "App A", executable: "C:\\special\\tool.exe" }),
      makeLauncher({ id: "2", name: "App B", executable: "C:\\other\\thing.exe" }),
    ];
    mockInvokeWith({ get_launchers: launchers });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("App A")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("Search launchers..."), "special");

    expect(screen.getByText("App A")).toBeInTheDocument();
    expect(screen.queryByText("App B")).not.toBeInTheDocument();
  });

  it("filters launchers by search text (arguments)", async () => {
    const user = userEvent.setup();
    const launchers = [
      makeLauncher({ id: "1", name: "App A", arguments: "--profile=unique123" }),
      makeLauncher({ id: "2", name: "App B", arguments: "--flag" }),
    ];
    mockInvokeWith({ get_launchers: launchers });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("App A")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("Search launchers..."), "unique123");

    expect(screen.getByText("App A")).toBeInTheDocument();
    expect(screen.queryByText("App B")).not.toBeInTheDocument();
  });

  it("shows category tabs when multiple categories exist", async () => {
    const launchers = [
      makeLauncher({ id: "1", name: "App A", category: "Tools" }),
      makeLauncher({ id: "2", name: "App B", category: "Games" }),
      makeLauncher({ id: "3", name: "App C", category: "Dev" }),
    ];
    mockInvokeWith({ get_launchers: launchers });
    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector(".category-tabs")).toBeInTheDocument();
    });
    const tabs = container.querySelectorAll(".category-tab");
    const tabTexts = Array.from(tabs).map((t) => t.textContent);
    expect(tabTexts).toContain("All");
    expect(tabTexts).toContain("Tools");
    expect(tabTexts).toContain("Games");
    expect(tabTexts).toContain("Dev");
  });

  it("filters by category when tab is clicked", async () => {
    const user = userEvent.setup();
    const launchers = [
      makeLauncher({ id: "1", name: "Tool App", category: "Tools" }),
      makeLauncher({ id: "2", name: "Game App", category: "Games" }),
      makeLauncher({ id: "3", name: "Dev App", category: "Dev" }),
    ];
    mockInvokeWith({ get_launchers: launchers });
    const { container } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Tool App")).toBeInTheDocument();
    });

    const tabs = container.querySelectorAll(".category-tab");
    const gamesTab = Array.from(tabs).find((t) => t.textContent === "Games") as HTMLElement;
    await user.click(gamesTab);

    expect(screen.getByText("Game App")).toBeInTheDocument();
    expect(screen.queryByText("Tool App")).not.toBeInTheDocument();
    expect(screen.queryByText("Dev App")).not.toBeInTheDocument();
  });

  it("shows 'no match' message when search has no results", async () => {
    const user = userEvent.setup();
    const launchers = [makeLauncher({ id: "1", name: "SomeApp" })];
    mockInvokeWith({ get_launchers: launchers });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("SomeApp")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("Search launchers..."), "zzzznotfound");

    expect(screen.getByText("No launchers match your search.")).toBeInTheDocument();
  });

  it("opens modal when Add Launcher is clicked", async () => {
    const user = userEvent.setup();
    mockInvokeWith({ get_launchers: [] });
    render(<App />);

    await user.click(screen.getByText("+ Add Launcher"));

    expect(screen.getByText("New Launcher")).toBeInTheDocument();
  });

  it("opens edit modal when edit button is clicked on a card", async () => {
    const user = userEvent.setup();
    const launchers = [makeLauncher({ id: "1", name: "Editable App" })];
    mockInvokeWith({ get_launchers: launchers });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Editable App")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Edit"));

    expect(screen.getByText("Edit Launcher")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Editable App")).toBeInTheDocument();
  });

  it("calls launch_app when a card is clicked", async () => {
    const user = userEvent.setup();
    const launcher = makeLauncher({ id: "1", name: "Launch Me" });
    mockInvokeWith({ get_launchers: [launcher], launch_app: undefined });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Launch Me")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Launch Me"));

    expect(mockInvoke).toHaveBeenCalledWith("launch_app", { config: launcher });
  });

  it("calls delete_launcher and reloads when delete is clicked", async () => {
    const user = userEvent.setup();
    const launcher = makeLauncher({ id: "del-1", name: "Delete Me" });
    let callCount = 0;
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_valid_herbs") return Promise.resolve([]) as never;
      if (cmd === "get_current_herb") return Promise.resolve("RANARR") as never;
      if (cmd === "get_launchers") {
        callCount++;
        return Promise.resolve(callCount === 1 ? [launcher] : []) as never;
      }
      if (cmd === "delete_launcher") return Promise.resolve(undefined) as never;
      return Promise.resolve(undefined) as never;
    });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Delete Me")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Delete"));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("delete_launcher", { id: "del-1" });
    });
  });

  it("does not show category tabs with only one category", async () => {
    const launchers = [
      makeLauncher({ id: "1", name: "A", category: "Solo" }),
      makeLauncher({ id: "2", name: "B", category: "Solo" }),
    ];
    mockInvokeWith({ get_launchers: launchers });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    expect(screen.queryByText("All")).not.toBeInTheDocument();
  });

  it("groups launchers by category in All view", async () => {
    const launchers = [
      makeLauncher({ id: "1", name: "Z App", category: "Beta" }),
      makeLauncher({ id: "2", name: "A App", category: "Alpha" }),
    ];
    mockInvokeWith({ get_launchers: launchers });
    const { container } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Z App")).toBeInTheDocument();
    });

    const headers = container.querySelectorAll(".category-header");
    expect(headers[0].textContent).toBe("Alpha");
    expect(headers[1].textContent).toBe("Beta");
  });
});
