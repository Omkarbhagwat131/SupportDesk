import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("associates label, required state, and validation error", () => {
    const markup = renderToStaticMarkup(createElement(Input, {
      id: "subject",
      label: "Subject",
      required: true,
      error: "Subject is required",
    }));
    expect(markup).toContain('for="subject"');
    expect(markup).toContain('aria-describedby="subject-error"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain("Subject is required");
  });
});
