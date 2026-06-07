import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LauncherModal from "./LauncherModal";
import { makeLauncher } from "../test/helpers";

describe("LauncherModal", () => {
  it("renders 'New Launcher' title when no initial value", () => {
    render(
      <LauncherModal initial={null} onSave={vi.fn()} onClose={vi.fn()} />,
    );

    expect(screen.getByText("New Launcher")).toBeInTheDocument();
    expect(screen.getByText("Add Launcher")).toBeInTheDocument();
  });

  it("renders 'Edit Launcher' title when editing", () => {
    const launcher = makeLauncher({ name: "Existing App" });
    render(
      <LauncherModal initial={launcher} onSave={vi.fn()} onClose={vi.fn()} />,
    );

    expect(screen.getByText("Edit Launcher")).toBeInTheDocument();
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("pre-fills form fields when editing", () => {
    const launcher = makeLauncher({
      name: "RuneLite",
      executable: "C:\\RuneLite\\RuneLite.exe",
      arguments: "--profile=test",
      workingDirectory: "C:\\RuneLite",
      category: "Games",
    });
    render(
      <LauncherModal initial={launcher} onSave={vi.fn()} onClose={vi.fn()} />,
    );

    expect(screen.getByDisplayValue("RuneLite")).toBeInTheDocument();
    expect(screen.getByDisplayValue("C:\\RuneLite\\RuneLite.exe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("--profile=test")).toBeInTheDocument();
    expect(screen.getByDisplayValue("C:\\RuneLite")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Games")).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <LauncherModal initial={null} onSave={vi.fn()} onClose={onClose} />,
    );

    await user.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when X button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <LauncherModal initial={null} onSave={vi.fn()} onClose={onClose} />,
    );

    await user.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });

  it("submits form data correctly for new launcher", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <LauncherModal initial={null} onSave={onSave} onClose={vi.fn()} />,
    );

    await user.type(screen.getByPlaceholderText("My App"), "New App");
    await user.type(
      screen.getByPlaceholderText("C:\\Program Files\\MyApp\\app.exe"),
      "C:\\test.exe",
    );
    await user.type(
      screen.getByPlaceholderText("--config production --port 8080"),
      "--flag",
    );
    await user.click(screen.getByText("Add Launcher"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New App",
        executable: "C:\\test.exe",
        arguments: "--flag",
        category: "General",
        icon: "🚀",
      }),
    );
  });

  it("adds and removes environment variables", async () => {
    const user = userEvent.setup();
    render(
      <LauncherModal initial={null} onSave={vi.fn()} onClose={vi.fn()} />,
    );

    // Add env var
    await user.click(screen.getByText("+ Add Variable"));
    const keyInputs = screen.getAllByPlaceholderText("KEY");
    const valInputs = screen.getAllByPlaceholderText("value");
    expect(keyInputs).toHaveLength(1);
    expect(valInputs).toHaveLength(1);

    // Remove env var
    await user.click(screen.getByText("×", { selector: ".env-var-row button" }));
    expect(screen.queryAllByPlaceholderText("KEY")).toHaveLength(0);
  });

  it("trims env var keys and excludes empty keys on submit", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <LauncherModal initial={null} onSave={onSave} onClose={vi.fn()} />,
    );

    // Fill required fields
    await user.type(screen.getByPlaceholderText("My App"), "Test");
    await user.type(
      screen.getByPlaceholderText("C:\\Program Files\\MyApp\\app.exe"),
      "C:\\t.exe",
    );

    // Add two env vars - one with key, one empty
    await user.click(screen.getByText("+ Add Variable"));
    await user.click(screen.getByText("+ Add Variable"));

    const keyInputs = screen.getAllByPlaceholderText("KEY");
    await user.type(keyInputs[0], "  MY_VAR  ");
    // Leave second key empty

    const valInputs = screen.getAllByPlaceholderText("value");
    await user.type(valInputs[0], "hello");

    await user.click(screen.getByText("Add Launcher"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        envVars: { MY_VAR: "hello" },
      }),
    );
  });

  it("pre-fills env vars when editing launcher with env vars", () => {
    const launcher = makeLauncher({
      envVars: { PATH: "/usr/bin", NODE_ENV: "production" },
    });
    render(
      <LauncherModal initial={launcher} onSave={vi.fn()} onClose={vi.fn()} />,
    );

    expect(screen.getByDisplayValue("PATH")).toBeInTheDocument();
    expect(screen.getByDisplayValue("/usr/bin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("NODE_ENV")).toBeInTheDocument();
    expect(screen.getByDisplayValue("production")).toBeInTheDocument();
  });
});
