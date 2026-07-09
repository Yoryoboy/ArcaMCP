import { describe, expect, it, vi } from "vitest";

import { executeJsonTool } from "./toolExecution.helpers.js";

describe("executeJsonTool", () => {
  it("parses params, invokes the tool, and serializes the result as JSON text", async () => {
    const parse = vi.fn().mockReturnValue({ taxId: 20368506345 });
    const invoke = vi.fn().mockResolvedValue({ taxId: 20368506345 });

    const response = await executeJsonTool({
      params: { taxId: 20368506345 },
      schema: { parse },
      invoke,
    });

    expect(parse).toHaveBeenCalledWith({ taxId: 20368506345 });
    expect(invoke).toHaveBeenCalledWith({ taxId: 20368506345 });
    expect(response).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ taxId: 20368506345 }, null, 2),
        },
      ],
    });
  });

  it("can return a custom response when the tool result is null", async () => {
    const parse = vi.fn().mockReturnValue({ CbteNro: 123 });
    const invoke = vi.fn().mockResolvedValue(null);
    const onNullResult = vi.fn().mockReturnValue({
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ message: "missing" }, null, 2),
        },
      ],
    });

    const response = await executeJsonTool({
      params: { CbteNro: 123 },
      schema: { parse },
      invoke,
      onNullResult,
    });

    expect(parse).toHaveBeenCalledWith({ CbteNro: 123 });
    expect(invoke).toHaveBeenCalledWith({ CbteNro: 123 });
    expect(onNullResult).toHaveBeenCalledWith({ CbteNro: 123 });
    expect(response).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ message: "missing" }, null, 2),
        },
      ],
    });
  });

  it("returns structured JSON errors when parsing or invocation fails", async () => {
    const parse = vi.fn().mockReturnValue({ MonId: "DOL" });
    const invoke = vi.fn().mockRejectedValue(new Error("rate failed"));

    const response = await executeJsonTool({
      params: { MonId: "DOL" },
      schema: { parse },
      invoke,
    });

    expect(response.isError).toBe(true);
    expect(JSON.parse(response.content[0].text)).toEqual({
      error: "rate failed",
      details: {},
    });
  });

  it("allows a guard to short-circuit before validation", async () => {
    const parse = vi.fn();
    const invoke = vi.fn();

    const response = await executeJsonTool({
      params: { taxId: 20368506345 },
      schema: { parse },
      guard: () => ({
        content: [
          {
            type: "text" as const,
            text: "dev-guard",
          },
        ],
      }),
      invoke,
    });

    expect(parse).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
    expect(response).toEqual({
      content: [
        {
          type: "text",
          text: "dev-guard",
        },
      ],
    });
  });
});
