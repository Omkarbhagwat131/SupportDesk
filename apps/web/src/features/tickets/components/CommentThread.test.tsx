import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommentThread } from "./CommentThread";
import type { TicketComment } from "../api/comments";

const comments: TicketComment[] = [
  {
    id: "public-comment",
    ticketId: "ticket-1",
    body: "Visible to the requester.",
    isInternal: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    author: { id: "agent-1", name: "Support Agent" },
  },
  {
    id: "internal-comment",
    ticketId: "ticket-1",
    body: "Staff-only investigation.",
    isInternal: true,
    createdAt: "2026-01-01T00:01:00.000Z",
    author: { id: "agent-1", name: "Support Agent" },
  },
];

describe("CommentThread", () => {
  it("does not render internal comments for customers", () => {
    const markup = renderToStaticMarkup(
      createElement(CommentThread, { comments, showInternal: false }),
    );

    expect(markup).toContain("Visible to the requester.");
    expect(markup).not.toContain("Staff-only investigation.");
  });

  it("renders internal comments for staff", () => {
    const markup = renderToStaticMarkup(
      createElement(CommentThread, { comments, showInternal: true }),
    );

    expect(markup).toContain("Staff-only investigation.");
    expect(markup).toContain("Internal");
  });

  it("explains when a customer has only internal comments", () => {
    const markup = renderToStaticMarkup(
      createElement(CommentThread, { comments: [comments[1]], showInternal: false }),
    );

    expect(markup).toContain("No public comments yet.");
    expect(markup).not.toContain("Staff-only investigation.");
    expect(markup).toContain('role="status"');
  });
});
