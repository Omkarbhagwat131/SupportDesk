import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TicketsPage } from "./TicketsPage";

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderTicketsPage(role: "CUSTOMER" | "AGENT" | "ADMIN") {
  vi.stubGlobal("localStorage", {
    getItem: () => JSON.stringify({ id: "user-1", name: "Test User", email: "test@example.com", role }),
  });

  const queryClient = new QueryClient();
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, null, createElement(TicketsPage)),
    ),
  );
}

describe("TicketsPage", () => {
  it("shows ticket creation only to customers", () => {
    expect(renderTicketsPage("ADMIN")).not.toContain("Create ticket");
    expect(renderTicketsPage("AGENT")).not.toContain("Create ticket");
    expect(renderTicketsPage("CUSTOMER")).toContain("Create ticket");
  });
});
