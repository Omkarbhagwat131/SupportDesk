import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Table } from "./Table";

describe("Table", () => {
  it("renders semantic headers and caption", () => {
    const markup = renderToStaticMarkup(createElement(
      Table,
      { caption: "Support tickets", headers: ["Ticket", "Status"] },
      createElement("tbody", null, createElement("tr", null,
        createElement("td", null, "Example"),
        createElement("td", null, "Open"),
      )),
    ));
    expect(markup).toContain("<table");
    expect(markup).toContain("<caption");
    expect(markup).toContain('scope="col"');
  });

  it("renders an accessible empty state", () => {
    const markup = renderToStaticMarkup(createElement(
      Table,
      { caption: "Support tickets", headers: [], isEmpty: true, emptyMessage: "No tickets yet." },
      null,
    ));
    expect(markup).toContain('role="status"');
    expect(markup).toContain("No tickets yet.");
  });
});
