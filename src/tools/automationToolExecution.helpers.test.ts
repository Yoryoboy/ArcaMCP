import { describe, expect, it, vi } from "vitest";

import { executeAutomationTool } from "./automationToolExecution.helpers.js";

describe("executeAutomationTool", () => {
  it("parses input, invokes the callback and serializes the success response", async () => {
    const parse = vi.fn().mockReturnValue({ id: "auto-1" });
    const invoke = vi.fn().mockResolvedValue({ id: "auto-1", status: "completed" });
    const serializeSuccess = vi.fn().mockReturnValue([
      { type: "text" as const, text: "automation started" },
      { type: "text" as const, text: JSON.stringify({ id: "auto-1", status: "completed" }, null, 2) },
    ]);

    const response = await executeAutomationTool({
      params: { id: "auto-1" },
      schema: { parse },
      invoke,
      serializeSuccess,
    });

    expect(parse).toHaveBeenCalledWith({ id: "auto-1" });
    expect(invoke).toHaveBeenCalledWith({ id: "auto-1" });
    expect(serializeSuccess).toHaveBeenCalledWith({ id: "auto-1", status: "completed" });
    expect(response).toEqual({
      content: [
        { type: "text", text: "automation started" },
        { type: "text", text: JSON.stringify({ id: "auto-1", status: "completed" }, null, 2) },
      ],
    });
  });

  it("normalizes thrown errors into the shared MCP error envelope", async () => {
    const response = await executeAutomationTool({
      params: { id: "auto-1" },
      schema: { parse: vi.fn().mockReturnValue({ id: "auto-1" }) },
      invoke: vi.fn().mockRejectedValue(new Error("automation failed")),
      serializeSuccess: vi.fn(),
    });

    expect(response).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: false, error: "automation failed" }, null, 2),
        },
      ],
      isError: true,
    });
  });
});
