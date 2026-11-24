import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("renders an accessible named dialog when open", () => {
    const markup = renderToStaticMarkup(createElement(
      Modal,
      { open: true, title: "Confirm action", description: "This action cannot be undone.", onClose: vi.fn(), onConfirm: vi.fn(), destructive: true },
      "Confirm details",
    ));
    expect(markup).toContain("<dialog");
    expect(markup).toContain('aria-labelledby="ui-modal-title"');
    expect(markup).toContain("Confirm action");
  });

  it("does not render while closed", () => {
    const markup = renderToStaticMarkup(createElement(
      Modal,
      { open: false, title: "Closed", onClose: vi.fn() },
      "Hidden",
    ));
    expect(markup).toBe("");
  });
});
