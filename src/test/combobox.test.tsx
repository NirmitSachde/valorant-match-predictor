import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TeamCombobox } from "../components/TeamCombobox";
import { filterTeams } from "../lib/teamFilter";
import { MOCK_BOOTSTRAP } from "../mocks/data";

const { teams, regions } = MOCK_BOOTSTRAP;

describe("filterTeams", () => {
  it("puts prefix matches before substring matches", () => {
    const out = filterTeams(teams, "o", "All");
    const names = out.map((t) => t.name.toLowerCase());
    const firstContains = names.findIndex((n) => !n.startsWith("o"));
    expect(names.slice(0, firstContains).every((n) => n.startsWith("o"))).toBe(true);
  });
  it("filters by region and excludes a team", () => {
    const out = filterTeams(teams, "", "EMEA", teams.find((t) => t.region === "EMEA")!.id);
    expect(out.every((t) => t.region === "EMEA")).toBe(true);
    expect(out).toHaveLength(2);
  });
});

describe("TeamCombobox", () => {
  it("searches, navigates with the keyboard and selects", async () => {
    const onChange = vi.fn();
    render(<TeamCombobox side="a" label="Team A" teams={teams} regions={regions} value={null} onChange={onChange} />);
    const input = screen.getByRole("combobox", { name: /team a/i });
    await userEvent.click(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.type(input, "ba");
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledTimes(1);
    const picked = teams.find((t) => t.id === onChange.mock.calls[0]![0])!;
    expect(picked.name.toLowerCase()).toContain("ba");
  });
  it("region chips narrow the list", async () => {
    render(<TeamCombobox side="b" label="Team B" teams={teams} regions={regions} value={null} onChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "China" }));
    const list = screen.getByRole("listbox");
    expect(within(list).getAllByRole("option")).toHaveLength(3);
  });
  it("shows an empty message and closes on Escape", async () => {
    render(<TeamCombobox side="a" label="Team A" teams={teams} regions={regions} value={null} onChange={() => {}} />);
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "zzzz");
    expect(screen.getByText(/no active teams match/i)).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
