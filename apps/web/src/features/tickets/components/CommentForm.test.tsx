import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { CommentForm } from "./CommentForm";

function renderCommentForm(props: Parameters<typeof CommentForm>[0]) {
  const queryClient = new QueryClient();
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(CommentForm, props),
    ),
  );
}

describe("CommentForm", () => {
  it("places the AI draft in the comment field and requires accept or reject", () => {
    const markup = renderCommentForm({
      ticketId: "ticket-1",
      allowInternal: true,
      suggestedReply: "Thanks for reporting this.",
      suggestionPendingReview: true,
      onAcceptSuggestion: () => undefined,
      onRejectSuggestion: () => undefined,
    });

    expect(markup).toContain("Thanks for reporting this.");
    expect(markup).toContain("Accept suggestion");
    expect(markup).toContain("Reject");
    expect(markup).toContain("Internal comment");
    expect(markup).toContain("disabled=\"\"");
  });

  it("does not show agent-only controls when there is no suggestion", () => {
    const markup = renderCommentForm({
      ticketId: "ticket-1",
      allowInternal: false,
    });

    expect(markup).not.toContain("Accept suggestion");
    expect(markup).not.toContain("Internal comment");
  });
});
