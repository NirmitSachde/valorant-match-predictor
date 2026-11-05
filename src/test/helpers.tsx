import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../App";
import { BootstrapProvider } from "../context";

export function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BootstrapProvider>
        <AppRoutes />
      </BootstrapProvider>
    </MemoryRouter>,
  );
}
