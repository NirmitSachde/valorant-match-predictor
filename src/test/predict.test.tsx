import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { mockPredict } from "../mocks/handler";
import { MOCK_BOOTSTRAP, PARTIAL_TEAM } from "../mocks/data";
import { buildRequest } from "../pages/Predict";
import { defaultState } from "../lib/urlState";
import { renderApp } from "./helpers";

const [t0, t1] = MOCK_BOOTSTRAP.teams;

async function pick(label: RegExp, text: string) {
  const input = await screen.findByRole("combobox", { name: label });
  await userEvent.click(input);
  await userEvent.type(input, text);
  const opt = await screen.findByRole("option", { name: new RegExp(text, "i") });
  await userEvent.click(opt);
}

describe("mock API contract", () => {
  it("predict is symmetric", () => {
    const x = mockPredict({ team_a: t0!.id, team_b: t1!.id, best_of: 3, map: "Lotus" });
    const y = mockPredict({ team_a: t1!.id, team_b: t0!.id, best_of: 3, map: "Lotus" });
    expect(x.model.map_prob + y.model.map_prob).toBeCloseTo(1, 6);
    expect(x.blend.prob + y.blend.prob).toBeCloseTo(1, 6);
  });
  it("builds requests only for two different teams", () => {
    const s = defaultState();
    expect(buildRequest(s)).toBeNull();
    s.a = 100;
    s.b = 100;
    expect(buildRequest(s)).toBeNull();
    s.b = 101;
    s.map = "Ascent";
    s.pickedBy = "a";
    const r = buildRequest(s)!;
    expect(r).toMatchObject({ team_a: 100, team_b: 101, best_of: 3, map: "Ascent", picked_by: "a" });
    expect(r.roster_a).toBeUndefined();
  });
});

describe("Predict page (mock mode)", () => {
  it("picks two teams and shows model and blend side by side", async () => {
    renderApp("/");
    await pick(/team a/i, "Northwind");
    await pick(/team b/i, "Typhoon");
    const run = screen.getByRole("button", { name: "Predict" });
    await userEvent.click(run);
    const result = await screen.findByRole("region", { name: "Result" });
    expect(within(result).getByRole("heading", { name: "Model" })).toBeInTheDocument();
    expect(within(result).getByRole("heading", { name: "Your blend" })).toBeInTheDocument();
    expect(within(result).getByText(/series odds, best of 3/i)).toBeInTheDocument();
    expect(within(result).getByText(/data through 2026-11-01/i)).toBeInTheDocument();
    expect(within(result).getByText(/what the six factors say/i)).toBeInTheDocument();
    const likely = within(result).getByRole("heading", { name: "Likely maps" }).parentElement!.querySelector("ol.likely-maps")!;
    const items = within(likely as HTMLElement).getAllByRole("listitem");
    expect(items.length).toBeGreaterThan(1);
    expect(items[0]).toHaveTextContent(/^Map 1 \S/);
  });

  it("disables Predict until two different teams are chosen", async () => {
    renderApp("/");
    const btn = await screen.findByRole("button", { name: "Predict" });
    expect(btn).toBeDisabled();
  });

  it("shared link restores state and auto-runs", async () => {
    renderApp(`/?a=${t0!.id}&b=${t1!.id}&bo=1&map=Lotus&pb=a`);
    const result = await screen.findByRole("region", { name: "Result" });
    expect(within(result).getByText(/on lotus/i)).toBeInTheDocument();
    expect(within(result).queryByText(/series odds/i)).not.toBeInTheDocument();
  });

  it("roster editor swaps a player via search and can reset", async () => {
    renderApp(`/?a=${t0!.id}&b=${t1!.id}`);
    await screen.findByRole("region", { name: "Result" });
    const roster = await screen.findByRole("region", { name: /team a roster/i });
    expect(within(roster).getByText(/roster check \(informational\)/i)).toBeInTheDocument();
    await userEvent.click(within(roster).getAllByRole("button", { name: /change player 1/i })[0]!);
    await userEvent.type(screen.getByPlaceholderText(/search players by name/i), "wraith");
    const hit = await screen.findByRole("button", { name: /wraith/i });
    await userEvent.click(hit);
    await waitFor(() => expect(within(roster).getByText("wraith")).toBeInTheDocument());
    expect(screen.getByText(/inputs changed since this result/i)).toBeInTheDocument();
    await userEvent.click(within(roster).getByRole("button", { name: /reset roster/i }));
    await waitFor(() => expect(within(roster).queryByText("wraith")).not.toBeInTheDocument());
  });

  it("incomplete lineup: shows the note and empty slots, still predicts, and fills a slot", async () => {
    const partial = MOCK_BOOTSTRAP.teams.find((t) => t.name === PARTIAL_TEAM)!;
    expect(partial.roster).toHaveLength(3);
    const res = mockPredict({ team_a: partial.id, team_b: t0!.id, best_of: 3 });
    expect(res.roster_check.a.notes.join(" ")).toMatch(/3 of 5 players known/);
    renderApp(`/?a=${partial.id}&b=${t0!.id}`);
    const result = await screen.findByRole("region", { name: "Result" });
    expect(within(result).getByRole("heading", { name: "Model" })).toBeInTheDocument();
    const roster = await screen.findByRole("region", { name: /team a roster/i });
    expect(within(roster).getByRole("note")).toHaveTextContent(/lineup incomplete: 3 of 5 players known/i);
    expect(within(roster).getAllByText("Empty slot")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Predict" })).toBeEnabled();
    await userEvent.click(within(roster).getByRole("button", { name: /add player 4/i }));
    await userEvent.type(screen.getByPlaceholderText(/search players by name/i), "wraith");
    await userEvent.click(await screen.findByRole("button", { name: /wraith/i }));
    await waitFor(() => expect(within(roster).getByRole("note")).toHaveTextContent(/lineup incomplete: 4 of 5 players known/i));
    expect(within(roster).getByText("wraith")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Predict" }));
    await waitFor(() => expect(screen.queryByText(/inputs changed since this result/i)).not.toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("moving a slider updates the blend live but not the model", async () => {
    renderApp(`/?a=${t0!.id}&b=${t1!.id}`);
    const result = await screen.findByRole("region", { name: "Result" });
    const blendBefore = within(result).getByText("Your blend").parentElement!.textContent;
    const modelBefore = within(result).getByText("Model").parentElement!.textContent;
    const slider = screen.getByRole("slider", { name: /weight for recent form/i });
    // Use the number box: reliable in jsdom.
    const box = screen.getByRole("spinbutton", { name: /weight number for recent form/i });
    await userEvent.clear(box);
    await userEvent.type(box, "100");
    expect(slider).toHaveValue("100");
    const blendAfter = within(result).getByText("Your blend").parentElement!.textContent;
    const modelAfter = within(result).getByText("Model").parentElement!.textContent;
    expect(blendAfter).not.toEqual(blendBefore);
    expect(modelAfter).toEqual(modelBefore);
    expect(screen.queryByText(/inputs changed since this result/i)).not.toBeInTheDocument();
  });

  it("presets and per-factor toggles work", async () => {
    renderApp("/");
    await userEvent.click(await screen.findByRole("button", { name: "Model only" }));
    expect(screen.getByRole("spinbutton", { name: /weight number for team strength/i })).toHaveValue(100);
    await userEvent.click(screen.getByRole("checkbox", { name: /team strength/i }));
    expect(screen.getByRole("spinbutton", { name: /weight number for team strength/i })).toBeDisabled();
    expect(screen.getByText(/turn on at least one factor/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(screen.getByRole("spinbutton", { name: /weight number for team strength/i })).toHaveValue(50);
  });

  it("shows the Model only note and an n/a preview before any result", async () => {
    renderApp("/");
    expect(await screen.findByText(/blend preview/i)).toHaveTextContent(/n\/a/);
    cleanup();
    renderApp(`/?a=${t0!.id}&b=${t1!.id}`);
    const result = await screen.findByRole("region", { name: "Result" });
    expect(within(result).queryByText(/your blend equals the model number/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Model only" }));
    expect(within(result).getByText("Model only: your blend equals the model number.")).toBeInTheDocument();
  });

  it("pins a scenario and compares after a change", async () => {
    renderApp(`/?a=${t0!.id}&b=${t1!.id}`);
    await screen.findByRole("region", { name: "Result" });
    await userEvent.click(screen.getByRole("button", { name: /pin as scenario a/i }));
    await userEvent.click(screen.getByRole("radio", { name: /best of 5/i }));
    await userEvent.click(screen.getByRole("button", { name: "Predict" }));
    expect(await screen.findByRole("region", { name: /compare scenarios/i })).toBeInTheDocument();
  });

  it("swap sides exchanges the teams", async () => {
    renderApp(`/?a=${t0!.id}&b=${t1!.id}`);
    await screen.findByRole("region", { name: "Result" });
    await userEvent.click(screen.getByRole("button", { name: /swap sides/i }));
    const a = screen.getByRole("combobox", { name: /team a/i }) as HTMLInputElement;
    expect(a.value).toBe(t1!.name);
  });
});
