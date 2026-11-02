import { messageResponse } from "../core/structuredOutput.js";
import { MCPResponse } from "../core/types.js";

export function devEnvDetectedMessage(message: string): MCPResponse {
  return messageResponse(message);
}
