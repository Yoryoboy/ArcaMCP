import { MCPResponse } from "./types.js";

export type StructuredContent = Record<string, unknown>;

/** MCP structured content must be an object: lists go under `items`, other values under `value`. */
export function toStructuredContent(payload: unknown): StructuredContent {
  if (Array.isArray(payload)) return { items: payload };
  if (payload !== null && typeof payload === "object") return payload as StructuredContent;
  return { value: payload };
}

/** The tool's usual JSON text, plus the same data as structured content. */
export function jsonResponse(
  payload: unknown,
  structuredContent: StructuredContent = toStructuredContent(payload),
): MCPResponse {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent,
  };
}

/** A non-error informational answer, such as a guard or not-found message. */
export function messageResponse(message: string): MCPResponse {
  return jsonResponse({ message });
}
