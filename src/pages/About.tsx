import { useBoot } from "../context";
import { useTitle } from "../lib/hooks";

export default function About() {
  useTitle("About");
  const { boot } = useBoot();
  return (
    <div className="page">
      <h1>About and data</h1>
      <section className="card">
        <h2>Sources</h2>
        <ul className="plain">
          <li>
            Match results, maps, rosters and player stats come from finished match pages on{" "}
            <a href="https://www.vlr.gg" target="_blank" rel="noopener noreferrer">vlr.gg</a>. Only the VCT path is used: VCT 2023 to now, and Challengers from 2025.
          </li>
          <li>
            Agent, role and map names and icons come from{" "}
            <a href="https://valorant-api.com" target="_blank" rel="noopener noreferrer">valorant-api.com</a>.
          </li>
          <li>Team logos are served from the vlr.gg image host. Nothing else is loaded from third parties except the Inter font.</li>
        </ul>
      </section>
      <section className="card">
        <h2>Update schedule</h2>
        <p>
          The data refreshes once a day. Only finished matches are added, so live games never enter the ratings.{" "}
          {boot ? `The service currently has data through ${boot.as_of}.` : ""}
        </p>
      </section>
      <section className="card">
        <h2>Privacy</h2>
        <p>No accounts, no cookies, no tracking, no ads. Your picks stay in the link you copy and in your browser. The only thing saved locally is your theme choice and a one hour cache of the team list.</p>
      </section>
      <section className="card">
        <h2>Fine print</h2>
        <p>
          This is a hobby project, not affiliated with or endorsed by Riot Games. VALORANT and Valorant Champions Tour are trademarks of Riot Games. Odds are
          estimates for fun and analysis, not betting advice. The roster rule check is informational only.
        </p>
        <p>
          <a href="https://github.com/NirmitSachde/valorant-match-predictor" target="_blank" rel="noopener noreferrer">Source code for this site</a>
        </p>
      </section>
    </div>
  );
}
