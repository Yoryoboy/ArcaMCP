import { describe, expect, it } from "vitest";

import {
  buildToolErrorPayload,
  toErrorResponse,
  toSerializableDetails,
} from "./toolError.helpers.js";

describe("toSerializableDetails", () => {
  it("converts a native Error into a plain serializable object", () => {
    expect(toSerializableDetails(new Error("boom"))).toEqual({
      name: "Error",
      message: "boom",
    });
  });

  it("preserves the code of an Error that carries one", () => {
    const error = Object.assign(new Error("rejected"), { code: 10049 });

    expect(toSerializableDetails(error)).toEqual({
      name: "Error",
      message: "rejected",
      code: 10049,
    });
  });

  it("returns non-Error values unchanged", () => {
    const details = { code: 10049, message: "rejected" };

    expect(toSerializableDetails(details)).toBe(details);
    expect(toSerializableDetails("raw")).toBe("raw");
    expect(toSerializableDetails(null)).toBeNull();
  });
});

describe("buildToolErrorPayload", () => {
  it("emits the unified contract for an AFIP rejection", () => {
    const payload = buildToolErrorPayload({
      code: 10049,
      message: "(10049) Missing service dates",
    });

    expect(payload).toMatchObject({
      success: false,
      error: "(10049) Missing service dates",
      kind: "afip_rejection",
      code: 10049,
      details: { code: 10049, message: "(10049) Missing service dates" },
    });
    expect(payload.instructions).toContain("FchServDesde");
  });

  it("serializes native Error details instead of dropping them as {}", () => {
    const payload = buildToolErrorPayload(new Error("rate failed"));

    expect(payload).toMatchObject({
      success: false,
      error: "rate failed",
      kind: "internal",
      details: { name: "Error", message: "rate failed" },
    });
    // El detalle serializado debe sobrevivir a JSON.stringify sin perderse.
    expect(JSON.parse(JSON.stringify(payload)).details).toEqual({
      name: "Error",
      message: "rate failed",
    });
  });

  it("classifies transport failures and keeps them retryable", () => {
    const payload = buildToolErrorPayload({ code: "ECONNREFUSED", message: "down" });

    expect(payload.kind).toBe("afip_transport");
    expect(payload.instructions).toContain("conectividad");
  });

  it("omits the code field when no code could be identified", () => {
    const payload = buildToolErrorPayload(new Error("no code"));

    expect(payload).not.toHaveProperty("code");
  });

  it("merges extra tool-specific fields into the envelope", () => {
    const payload = buildToolErrorPayload(new Error("AFIP down"), {
      note: "Use point 1",
    });

    expect(payload).toMatchObject({
      success: false,
      error: "AFIP down",
      note: "Use point 1",
    });
  });
});

describe("toErrorResponse", () => {
  it("wraps the unified payload in an MCP error response", () => {
    const response = toErrorResponse(new Error("boom"));

    expect(response.isError).toBe(true);
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe("text");
    expect(JSON.parse(response.content[0].text)).toMatchObject({
      success: false,
      error: "boom",
      kind: "internal",
    });
  });
});
