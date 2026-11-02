import { describe, expect, it } from "vitest";
import { jsonResponse, messageResponse, toStructuredContent } from "./structuredOutput.js";

describe("structured output helpers", () => {
  it("keeps objects, wraps lists in items and other values in value", () => {
    expect(toStructuredContent({ CAE: "123" })).toEqual({ CAE: "123" });
    expect(toStructuredContent([{ Id: 1 }])).toEqual({ items: [{ Id: 1 }] });
    expect(toStructuredContent(123)).toEqual({ value: 123 });
    expect(toStructuredContent("20123456789")).toEqual({ value: "20123456789" });
    expect(toStructuredContent(null)).toEqual({ value: null });
  });

  it("returns the same text as before plus structured content", () => {
    expect(jsonResponse([{ Id: 1 }])).toEqual({
      content: [{ type: "text", text: JSON.stringify([{ Id: 1 }], null, 2) }],
      structuredContent: { items: [{ Id: 1 }] },
    });
  });

  it("accepts explicit structured content for tool-specific shapes", () => {
    expect(jsonResponse(123, { CbteNro: 123 })).toEqual({
      content: [{ type: "text", text: "123" }],
      structuredContent: { CbteNro: 123 },
    });
  });

  it("builds message responses that are not errors", () => {
    expect(messageResponse("El comprobante no existe")).toEqual({
      content: [
        { type: "text", text: JSON.stringify({ message: "El comprobante no existe" }, null, 2) },
      ],
      structuredContent: { message: "El comprobante no existe" },
    });
  });
});
