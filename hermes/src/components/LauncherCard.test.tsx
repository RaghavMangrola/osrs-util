import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LauncherCard from "./LauncherCard";
import { makeLauncher } from "../test/helpers";

describe("LauncherCard", () => {
  it("renders launcher name and executable path", () => {
    const launcher = makeLauncher({ name: "My App", executable: "C:\\apps\\my.exe" });
    render(
      <LauncherCard
        launcher={launcher}
        onLaunch={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("My App")).toBeInTheDocument();
    expect(screen.getByText("C:\\apps\\my.exe")).toBeInTheDocument();
  });

  it("renders arguments when present", () => {
    const launcher = makeLauncher({ arguments: "--verbose --port 8080" });
    render(
      <LauncherCard
        launcher={launcher}
        onLaunch={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("--verbose --port 8080")).toBeInTheDocument();
  });

  it("does not render arguments element when empty", () => {
    const launcher = makeLauncher({ arguments: "" });
    const { container } = render(
      <LauncherCard
        launcher={launcher}
        onLaunch={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(container.querySelector(".card-args")).not.toBeInTheDocument();
  });

  it("uses default icon when none provided", () => {
    const launcher = makeLauncher({ icon: "" });
    const { container } = render(
      <LauncherCard
        launcher={launcher}
        onLaunch={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(container.querySelector(".card-icon")?.textContent).toBe("🚀");
  });

  it("calls onLaunch when card is clicked", async () => {
    const user = userEvent.setup();
    const onLaunch = vi.fn();
    const launcher = makeLauncher();
    render(
      <LauncherCard
        launcher={launcher}
        onLaunch={onLaunch}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByText(launcher.name));
    expect(onLaunch).toHaveBeenCalledWith(launcher);
  });

  it("calls onEdit when edit button is clicked without triggering launch", async () => {
    const user = userEvent.setup();
    const onLaunch = vi.fn();
    const onEdit = vi.fn();
    const launcher = makeLauncher();
    render(
      <LauncherCard
        launcher={launcher}
        onLaunch={onLaunch}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByTitle("Edit"));
    expect(onEdit).toHaveBeenCalledWith(launcher);
    expect(onLaunch).not.toHaveBeenCalled();
  });

  it("calls onDelete when delete button is clicked without triggering launch", async () => {
    const user = userEvent.setup();
    const onLaunch = vi.fn();
    const onDelete = vi.fn();
    const launcher = makeLauncher();
    render(
      <LauncherCard
        launcher={launcher}
        onLaunch={onLaunch}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByTitle("Delete"));
    expect(onDelete).toHaveBeenCalledWith(launcher.id);
    expect(onLaunch).not.toHaveBeenCalled();
  });
});
