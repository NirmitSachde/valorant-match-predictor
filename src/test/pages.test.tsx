import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { RouteErrorBoundary } from "../components/RouteErrorBoundary";
import { MOCK_BOOTSTRAP, MOCK_MODEL, teamById } from "../mocks/data";
import { sortTeams } from "../pages/Teams";
import { renderApp } from "./helpers";

describe("pages (mock mode)", () => {
  it("rankings sort and filter", async () => {
    renderApp("/teams");
    const table = await screen.findByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(MOCK_BOOTSTRAP.teams.length + 1);
    await userEvent.click(screen.getByRole("tab", { name: "China" }));
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    await userEvent.type(screen.getByRole("textbox", { name: /search teams/i }), "jade");
    expect(within(table).getAllByRole("row")).toHaveLength(2);
  });
  it("sortTeams orders by key and direction", () => {
    const asc = sortTeams(MOCK_BOOTSTRAP.teams, "rating", 1);
    expect(asc[0]!.rating).toBeLessThanOrEqual(asc[1]!.rating);
    const desc = sortTeams(MOCK_BOOTSTRAP.teams, "name", -1);
    expect(desc[0]!.name.localeCompare(desc[1]!.name)).toBeGreaterThan(0);
  });
  it("team page shows sparkline, map bars, roster and results", async () => {
    renderApp("/teams/100");
    expect(await screen.findByRole("heading", { name: "Northwind", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /rating over the last 52 weeks/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /map strengths/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /recent results/i })).toBeInTheDocument();
  });
  it("team head to head shows the record from the page team's side, share and last met", async () => {
    renderApp("/teams/100");
    const h = teamById(100)!.h2h_top[0]!;
    const card = (await screen.findByRole("heading", { name: /head to head/i })).closest("section")!;
    const tag = within(card).getByLabelText(`Northwind record ${h.a_wins} wins, ${h.b_wins} losses`);
    expect(tag).toHaveTextContent(`${h.a_wins}-${h.b_wins}`);
    expect(card).toHaveTextContent(`${Math.round(h.decayed_share * 100)}%`);
    expect(card).toHaveTextContent(/last met 2026-08-15/);
    expect(card.textContent).not.toMatch(/NaN/);
  });
  it("player page shows form and agent pool", async () => {
    renderApp("/players/1000");
    expect(await screen.findByRole("heading", { name: /form, last 10 maps/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /agent pool/i })).toBeInTheDocument();
  });
  it("model page shows backtest vs baselines and the reliability chart", async () => {
    renderApp("/model");
    expect(await screen.findByRole("heading", { name: "Backtest" })).toBeInTheDocument();
    expect(screen.getAllByText("Glicko only").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Coin flip").length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: /reliability chart/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /data freshness/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /2026 monthly walk-forward/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /mock masters one, map level/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /mock masters one, series level/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /quality gate/i })).toBeInTheDocument();
    expect(screen.getByText(/2026 walk-forward accuracy/i)).toBeInTheDocument();
  });
  it("model page tolerates a sparse backtest from a small bundle", async () => {
    const sparse = structuredClone(MOCK_MODEL);
    sparse.backtest = {
      generated_at: null,
      data: null,
      monthly_2026: { model: { n: 100, accuracy: 0.6, log_loss: 0.65, brier: 0.23 }, glicko_only: null },
      international_2026: { model: null, glicko_only: null },
      events: [],
      reliability: [],
      quality_gate: null,
      params: null,
      notes: [],
    };
    const spy = vi.spyOn(api, "model").mockResolvedValue(sparse);
    renderApp("/model");
    expect(await screen.findByRole("heading", { name: /2026 monthly walk-forward/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /quality gate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /reliability/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /what the model weighs/i })).toBeInTheDocument();
    spy.mockRestore();
  });
  it("about page renders", async () => {
    renderApp("/about");
    expect(await screen.findByRole("heading", { name: /about and data/i })).toBeInTheDocument();
  });
  it("unknown team shows an error", async () => {
    renderApp("/teams/99999");
    expect(await screen.findByRole("alert")).toHaveTextContent(/not found|unknown/i);
  });
  it("a crashing page shows the error card instead of blanking the app", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Boom(): never {
      throw new Error("kaboom");
    }
    render(
      <MemoryRouter>
        <p>header stays</p>
        <RouteErrorBoundary resetKey="/model">
          <Boom />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/this page hit an error/i);
    expect(screen.getByRole("link", { name: /try again/i })).toHaveAttribute("href", "/model");
    expect(screen.getByText("header stays")).toBeInTheDocument();
    spy.mockRestore();
  });
});
