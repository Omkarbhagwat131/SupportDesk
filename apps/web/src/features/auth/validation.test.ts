import { describe, expect, it } from "vitest";
import { getLoginPasswordError, getRegistrationPasswordError } from "./validation";

describe("getLoginPasswordError", () => {
  it("allows passwords up to 72 UTF-8 bytes", () => {
    expect(getLoginPasswordError("a".repeat(72))).toBeNull();
    expect(getLoginPasswordError("é".repeat(36))).toBeNull();
  });

  it("rejects passwords that exceed 72 UTF-8 bytes", () => {
    expect(getLoginPasswordError("a".repeat(73))).toBe(
      "Password must not exceed 72 UTF-8 bytes.",
    );
    expect(getLoginPasswordError("é".repeat(37))).not.toBeNull();
  });
});

describe("getRegistrationPasswordError", () => {
  it("requires at least 12 characters", () => {
    expect(getRegistrationPasswordError("short")).toBe("Password must be at least 12 characters.");
    expect(getRegistrationPasswordError("long-enough!")).toBeNull();
  });

  it("rejects passwords that exceed 72 UTF-8 bytes", () => {
    expect(getRegistrationPasswordError("a".repeat(73))).toBe(
      "Password must not exceed 72 UTF-8 bytes.",
    );
    expect(getRegistrationPasswordError("é".repeat(37))).not.toBeNull();
  });
});
