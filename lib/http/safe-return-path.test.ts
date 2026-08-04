import { describe, expect, it } from "vitest";
import { safeRelativeReturnPath } from "./safe-return-path";

describe("safeRelativeReturnPath", () => {
  it("preserves same-origin paths, queries, and fragments", () => {
    expect(safeRelativeReturnPath("/courses?state=ME#results")).toBe(
      "/courses?state=ME#results",
    );
  });

  it.each([
    undefined,
    null,
    "",
    "https://attacker.example",
    "//attacker.example/path",
    "/\\attacker.example/path",
    "/courses\\\\attacker.example",
    "/signin-with-chatgpt",
    "/signout-with-chatgpt?return_to=/profile",
    "/callback",
  ])("rejects unsafe or reserved destination %s", (value) => {
    expect(safeRelativeReturnPath(value)).toBe("/");
  });
});
