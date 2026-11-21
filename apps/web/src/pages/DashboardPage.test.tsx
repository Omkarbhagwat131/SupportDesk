import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DashboardPage", () => {
  it("shows a loading state instead of an unsupported initial ticket count", () => {
    vi.stubGlobal("localStorage", { getItem: () => null });
    const queryClient = new QueryClient();
    const markup = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(MemoryRouter, null, createElement(DashboardPage)),
      ),
    );

    expect(markup).toContain("Welcome back");
    expect(markup).toContain("Total tickets");
    expect(markup).toContain("—");
    expect(markup).toContain("Loading recent tickets...");
  });
});
