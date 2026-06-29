import { afterEach, describe, expect, it } from "vitest";
import { instructionMap } from "./errorProcessor.mapping.js";
import {
  processAfipError,
  registerErrorInstructions,
  registerErrorInstructionsBatch,
} from "./errorProcessor.js";

describe("processAfipError", () => {
  afterEach(() => {
    instructionMap.delete(777777);
    instructionMap.delete("AFIP_TIMEOUT");
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

  it("prefers a direct code over nested and alternate codes", () => {
    registerErrorInstructions(777777, "Use the direct recovery steps.");

    const result = processAfipError({
      code: 777777,
      details: { code: 10031 },
      errCode: 10035,
      statusCode: 10007,
      message: "direct code should win",
    });

    expect(result.instructions).toBe("Use the direct recovery steps.");
  });

  it("checks nested details.code before errCode and statusCode", () => {
    const result = processAfipError({
      details: { code: 10031 },
      errCode: 10035,
      statusCode: 10007,
      message: "nested code should win",
    });

    expect(result.instructions).toContain("FchServDesde");
  });

  it("uses the zod validation branch for schema errors", () => {
    const zodLikeError = {
      name: "ZodError",
      issues: [{ path: ["field"], message: "Required" }],
    };

    const result = processAfipError(zodLikeError);

    expect(result.instructions).toContain("No intentes llamar a AFIP");
  });

  it.each([
    {
      name: "nested details.code",
      error: { details: { code: 10031 }, message: "missing service start date" },
      expectedText: "FchServDesde",
    },
    {
      name: "errCode",
      error: { errCode: 10035, message: "missing payment due date" },
      expectedText: "FchVtoPago",
    },
    {
      name: "statusCode",
      error: { statusCode: 10007, message: "invalid voucher type" },
      expectedText: "CbteTipo",
    },
  ])("resolves mapped instructions from $name", ({ error, expectedText }) => {
    const result = processAfipError(error);

    expect(result.instructions).toContain(expectedText);
  });

  it("keeps traversing nested details objects until the depth limit", () => {
    const result = processAfipError({
      details: {
        details: { code: 10031 },
      },
      message: "nested failure",
    });

    expect(result.instructions).toContain("FchServDesde");
  });

  it("stops extracting once the depth limit is exceeded", () => {
    const result = processAfipError({
      details: {
        details: {
          details: { code: 10031 },
        },
      },
      message: "too deep",
    });

    expect(result.instructions).toContain("error desconocido");
  });

  it("supports registering custom instruction batches for string error codes", () => {
    registerErrorInstructionsBatch([
      ["AFIP_TIMEOUT", "Wait for the upstream service before retrying."],
    ]);

    const result = processAfipError({ code: "AFIP_TIMEOUT", message: "timeout" });

    expect(result.instructions).toBe("Wait for the upstream service before retrying.");
  });

  it("preserves plain string errors and uses the default instructions", () => {
    const result = processAfipError("plain failure message");

    expect(result.error).toBe("plain failure message");
    expect(result.instructions).toContain("error desconocido");
  });

  it("prefers an object-shaped error message over JSON stringification", () => {
    const result = processAfipError({ message: "human-friendly failure", meta: 1 });

    expect(result.error).toBe("human-friendly failure");
    expect(result.instructions).toContain("error desconocido");
  });

  it("keeps plain empty objects stringified as {}", () => {
    const result = processAfipError({});

    expect(result.error).toBe("{}");
    expect(result.instructions).toContain("error desconocido");
  });

  it("falls back to an unknown message when the error object cannot be stringified", () => {
    const circularError: Record<string, unknown> = {};
    circularError.self = circularError;

    const result = processAfipError(circularError);

    expect(result.error).toBe("Error desconocido");
    expect(result.instructions).toContain("error desconocido");
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
