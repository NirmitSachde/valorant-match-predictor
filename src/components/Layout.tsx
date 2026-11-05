import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useBoot } from "../context";
import { MoonIcon, SunIcon } from "./Icons";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

function currentTheme(): "light" | "dark" {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(currentTheme);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage unavailable */
    }
    setTheme(next);
  };
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export function Layout() {
  const { boot, error, retry } = useBoot();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="wrap topbar-in">
          <NavLink to="/" className="brand" aria-label="VCT Match Predictor home">
            <span className="brand-mark" aria-hidden="true" />
            <span>VCT Predictor</span>
          </NavLink>
          <nav aria-label="Main" className="nav">
            <NavLink to="/" end>
              Predict
            </NavLink>
            <NavLink to="/teams">Teams</NavLink>
            <NavLink to="/model">Model</NavLink>
            <NavLink to="/about">About</NavLink>
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="wrap main" tabIndex={-1}>
        {error && !boot ? (
          <div className="notice bad" role="alert">
            <p>Could not load team data. {error}</p>
            <button type="button" className="btn" onClick={retry}>
              Try again
            </button>
          </div>
        ) : null}
        <RouteErrorBoundary resetKey={pathname}>
          <Suspense fallback={<p className="muted" role="status">Loading...</p>}>
            <Outlet />
          </Suspense>
        </RouteErrorBoundary>
      </main>
      <footer className="footer">
        <div className="wrap">
          <p>
            {boot ? `Data through ${boot.as_of}. ` : ""}Updated daily from finished matches only. Not affiliated with or endorsed by Riot
            Games. Odds are estimates, not advice.
          </p>
        </div>
      </footer>
    </>
  );
}
