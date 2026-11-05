import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { BootstrapProvider } from "./context";
import Predict from "./pages/Predict";

const Teams = lazy(() => import("./pages/Teams"));
const Team = lazy(() => import("./pages/Team"));
const Player = lazy(() => import("./pages/Player"));
const Model = lazy(() => import("./pages/Model"));
const About = lazy(() => import("./pages/About"));

function NotFound() {
  return (
    <div className="page">
      <h1>Page not found</h1>
      <p className="muted">That page does not exist. Try the Predict page.</p>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
        <Route element={<Layout />}>
          <Route index element={<Predict />} />
          <Route path="teams" element={<Teams />} />
          <Route path="teams/:id" element={<Team />} />
          <Route path="players/:id" element={<Player />} />
          <Route path="model" element={<Model />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <BootstrapProvider>
        <AppRoutes />
      </BootstrapProvider>
    </BrowserRouter>
  );
}
