import { afterEach, describe, expect, it } from "vitest";
import { instructionMap } from "./errorProcessor.mapping.js";
import { processAfipError, registerErrorInstructions } from "./errorProcessor.js";

describe("processAfipError", () => {
  afterEach(() => {
    instructionMap.delete(777777);
  });

  it("uses registered instructions for known codes", () => {
    registerErrorInstructions(777777, "Use the custom recovery steps.");

    const result = processAfipError({ code: 777777, message: "custom failure" });

    expect(result.instructions).toBe("Use the custom recovery steps.");
    expect(result.details).toEqual({ code: 777777, message: "custom failure" });
  });

  it("resolves mapped instructions from a numeric code inside an error message", () => {
    const result = processAfipError(new Error("(10049) Missing service dates"));

    expect(result.instructions).toContain("FchServDesde");
    expect(result.error).toContain("(10049)");
  });

  it("uses the zod validation branch for schema errors", () => {
    const zodLikeError = {
      name: "ZodError",
      issues: [{ path: ["field"], message: "Required" }],
    };

    const result = processAfipError(zodLikeError);

    expect(result.instructions).toContain("No intentes llamar a AFIP");
  });

  it("falls back to default instructions for unknown errors", () => {
    const result = processAfipError({ code: 999999, message: "unknown failure" });

    expect(result.instructions).toContain("error desconocido");
  });

  it("never throws when the incoming error shape is hostile", () => {
    const hostileError = Object.defineProperty({}, "code", {
      get() {
        throw new Error("boom");
      },
    });

    const result = processAfipError(hostileError);

    expect(result.error).toBe("Error desconocido");
    expect(result.details).toBe(hostileError);
    expect(result.instructions).toContain("error desconocido");
  });
});
