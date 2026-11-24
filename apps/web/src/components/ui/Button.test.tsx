import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders a disabled loading button with a busy state", () => {
    const markup = renderToStaticMarkup(createElement(Button, { type: "submit", loading: true }, "Saving"));
    expect(markup).toContain("disabled");
    expect(markup).toContain('aria-busy="true"');
  });

  it("uses a button element and supports secondary variants", () => {
    const markup = renderToStaticMarkup(createElement(Button, { variant: "secondary" }, "Cancel"));
    expect(markup).toContain("<button");
    expect(markup).toContain("secondary");
  });
});
