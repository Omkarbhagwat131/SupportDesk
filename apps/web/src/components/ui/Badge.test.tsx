import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("maps every supported status to its existing label", () => {
    const statuses = [
      ["OPEN", "Open"],
      ["IN_PROGRESS", "In progress"],
      ["WAITING_ON_CUSTOMER", "Waiting on customer"],
      ["RESOLVED", "Resolved"],
      ["CLOSED", "Closed"],
    ] as const;
    for (const [status, label] of statuses) {
      const markup = renderToStaticMarkup(createElement(Badge, { type: "status", value: status }));
      expect(markup).toContain(label);
    }
  });

  it("maps every supported priority", () => {
    for (const priority of ["P1", "P2", "P3", "P4"] as const) {
      const markup = renderToStaticMarkup(createElement(Badge, { type: "priority", value: priority }));
      expect(markup).toContain(priority);
    }
  });
});
