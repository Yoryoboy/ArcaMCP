import { describe, expect, it } from "vitest";
import { devEnvDetectedMessage } from "./helpers.js";

describe("devEnvDetectedMessage", () => {
  it("returns the expected MCP text payload shape", () => {
    const result = devEnvDetectedMessage("Development environment detected");

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: '{\n  "message": "Development environment detected"\n}',
        },
      ],
    });
  });
});
