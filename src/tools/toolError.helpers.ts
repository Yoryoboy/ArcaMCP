import { MCPResponse } from "../core/types.js";
import { processAfipError, ProcessedToolError } from "../utils/errorProcessor/errorProcessor.js";

/**
 * Convierte un `Error` nativo en un objeto plano serializable.
 *
 * `JSON.stringify(new Error(...))` produce `{}`, lo que descarta el mensaje y el
 * nombre del error. Para preservar esa información en el envelope, representamos
 * los errores nativos como `{ name, message, code? }`. Cualquier otro valor se
 * devuelve sin cambios.
 */
export function toSerializableDetails(details: unknown): unknown {
  if (details instanceof Error) {
    const plain: Record<string, unknown> = {
      name: details.name,
      message: details.message,
    };
    const code = (details as { code?: unknown }).code;
    if (code !== undefined) {
      plain.code = code;
    }
    const candidates = (details as { candidates?: unknown }).candidates;
    if (Array.isArray(candidates)) {
      plain.candidates = candidates;
    }
    const requestedAddress = (details as { requestedAddress?: unknown }).requestedAddress;
    if (typeof requestedAddress === "string") {
      plain.requestedAddress = requestedAddress;
    }
    return plain;
  }

  return details;
}

/**
 * Construye el payload de error unificado a partir de un error arbitrario.
 *
 * Contrato único de error para todas las tools:
 * `{ success: false, error, kind, code?, details, instructions, ...extra }`.
 *
 * - `kind` clasifica el origen (validation / afip_rejection / afip_transport / internal).
 * - `code` preserva el código AFIP o lógico cuando se pudo identificar.
 * - `details` conserva el error original de forma serializable.
 * - `instructions` guía determinísticamente al agente.
 * - `extra` permite a una tool agregar campos adicionales (p.ej. el hook `onError`).
 */
export function buildToolErrorPayload(
  error: unknown,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const processed: ProcessedToolError = processAfipError(error);

  return {
    success: false,
    error: processed.error,
    kind: processed.kind,
    ...(processed.code !== undefined ? { code: processed.code } : {}),
    details: toSerializableDetails(processed.details),
    instructions: processed.instructions,
    ...(extra ?? {}),
  };
}

/**
 * Envuelve el payload de error unificado en una respuesta MCP marcada como error.
 * Este es el único punto de salida para los errores de todas las tools.
 */
export function toErrorResponse(error: unknown, extra?: Record<string, unknown>): MCPResponse {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(buildToolErrorPayload(error, extra), null, 2),
      },
    ],
    isError: true,
  };
}
