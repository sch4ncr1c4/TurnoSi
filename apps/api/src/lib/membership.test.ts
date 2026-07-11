import { describe, expect, it } from "vitest";

import { AppError } from "./app-error.js";
import { requireEditor } from "./membership.js";

describe("authorization", () => {
  it.each(["owner", "admin"])("allows %s to edit", (role) => {
    expect(() => requireEditor(role)).not.toThrow();
  });

  it("rejects members from editing", () => {
    expect(() => requireEditor("member")).toThrow(AppError);
  });
});
