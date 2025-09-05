import { MCPResponse } from "../core/types";

export function devEnvDetectedMessage(message: string): MCPResponse {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ message }, null, 2),
      },
    ],
  };
}
