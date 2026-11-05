# VCT Match Predictor

Win odds for Valorant Champions Tour matches. Pick two teams, adjust rosters, the map and the format, and see the model's win chance next to a blend you control.

Live site: https://valorant-match-predictor.netlify.app

This repository holds only the website. The model, the data pipeline and the API live in a separate private repository. The site talks to the API directly from your browser.

## How it works, in plain English

- Every team has a rating and an uncertainty. Both update after every map, in date order, from finished VCT and Challengers matches.
- Teams also get a small offset per map, so a team that is strong on Lotus and weak on Bind is treated that way.
- Recent results count more than old ones. Player ratings follow players when they change teams.
- The model turns those signals into a win chance for each map. For a best of 3 or 5, it simulates the ban and pick phase on the current map pool to get series odds.
- The result shows two numbers side by side. "Model" is the model's own answer and never changes with your settings. "Your blend" is a weighted average of six simple views (team strength, map strength, recent form, roster form, head to head, composition) using the lens weights you set.
- Everything you choose is stored in the page link, so you can share a prediction by copying the link.
- The roster rule check (3 of 5 players retained, 3 of 5 living in the team's region) is informational only.

All accuracy numbers, baselines and the reliability chart are on the Model page, loaded live from the service. This README does not quote any.

## Pages

- Predict: team pickers, roster editor, match setup, optional agent picks, lenses, result, compare scenarios, share link
- Teams: sortable rankings with region tabs and search
- Team: rating history, map strengths, roster, recent results, head to head
- Player: form, agent pool, map stats, frequent teammates
- Model: what the model is, backtest against baselines, reliability chart, quality gate, data freshness, limits
- About: sources, update schedule, privacy

## Run it

Needs Node 22.

```
npm ci
npm run dev
```

Useful scripts: `npm run typecheck`, `npm test`, `npm run build`, `npm run preview`.

Environment variables:

- `VITE_API_BASE`: API base URL. Defaults to the production Cloud Run service.
- `VITE_MOCK=1`: serve fixtures from `src/mocks/` instead of calling the API. The fixtures use invented teams and players. Tests always run in mock mode.

```
VITE_MOCK=1 npm run dev
```

## Project layout

- `src/api`: hand-written API types (from the API contract) and the fetch wrapper
- `src/components`, `src/pages`: UI
- `src/charts`: SVG charts (sparkline, reliability)
- `src/lib`: formatting, lens math, URL state
- `src/mocks`: fixtures and a fake API for mock mode
- `src/test`: Vitest and Testing Library tests

## Deploy

Netlify builds with `npm ci && npm run build` and publishes `dist`. `public/_redirects` sends every path to `index.html` so deep links work.

## Screenshots

Placeholders, to be added after the first live deploy:

- Predict page with a result
- Predict page lenses panel
- Team page
- Model page reliability chart

## Credits

Match data from vlr.gg. Agent and map names and icons from valorant-api.com. Not affiliated with or endorsed by Riot Games.
