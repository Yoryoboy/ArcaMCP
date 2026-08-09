/**
 * Procesador de errores centralizado y escalable para herramientas MCP.
 *
 * Objetivos:
 * - Preservar la estructura original del error (mensaje "error" y objeto "details").
 * - Agregar un nuevo campo "instructions" basado en un mapeo extensible de códigos de error.
 * - Ser resiliente ante formatos desconocidos y campos faltantes.
 * - Proveer una instrucción por defecto segura cuando el código sea desconocido.
 */

import { ErrorCode, instructionMap } from "./errorProcessor.mapping.js";

/**
 * Clasificación del origen de una falla. Permite al agente decidir si debe
 * corregir el input, reintentar, o escalar a revisión humana.
 *
 * - "validation":     el input no pasó la validación local (Zod). Corregir input.
 * - "afip_rejection": AFIP rechazó la operación por una regla de negocio (hay código).
 * - "afip_transport": falla de red/SOAP/HTTP/certificados al hablar con AFIP. Reintentar.
 * - "internal":       falla no clasificada (probablemente un bug). Escalar.
 */
export type ErrorKind =
  | "validation"
  | "afip_rejection"
  | "afip_transport"
  | "internal";

export type ProcessedToolError = {
  /** Mensaje de error legible para humanos (preservado del error original) */
  error: string;
  /** Clasificación del origen de la falla */
  kind: ErrorKind;
  /** Código de error identificado (AFIP o lógico), cuando se pudo extraer */
  code?: number | string;
  /** Objeto/valor de error original para depuración y contexto (sin modificar) */
  details: unknown;
  /** Instrucciones determinísticas que debe seguir el LLM */
  instructions: string;
};

/**
 * Instrucción por defecto cuando no se puede identificar un código de error conocido.
 * Mantenerla conservadora para evitar que el LLM improvise soluciones por su cuenta.
 */
const DEFAULT_INSTRUCTIONS =
  "Informa al usuario que ocurrió un error desconocido y solicita revisión humana. " +
  "Muestra el mensaje de error y cualquier código disponible. No reintentes automáticamente sin correcciones.";

/**
 * Códigos de error de red/conexión (Node/axios) que indican una falla de
 * transporte y no un rechazo de negocio de AFIP.
 */
const TRANSPORT_ERROR_CODES = new Set<string>([
  "ECONNREFUSED",
  "ECONNRESET",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "EPIPE",
  "EPROTO",
  "ERR_NETWORK",
  "ERR_BAD_REQUEST",
  "ERR_CANCELED",
]);

/** Patrones de mensaje típicos de fallas de red/SOAP/HTTP/certificados. */
const TRANSPORT_MESSAGE_PATTERN =
  /ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|network\s*error|timeout|timed?\s*out|socket hang up|getaddrinfo|failed to (connect|fetch|resolve)|certificate|ssl\b|tls\b|EPROTO|HTTP\s*(status\s*)?(4\d\d|5\d\d)/i;

/** Registrar o sobrescribir instrucciones para un código específico. */
export function registerErrorInstructions(code: ErrorCode, text: string): void {
  instructionMap.set(code, text);
}

/** Registrar un lote de entradas [código, instrucciones]. */
export function registerErrorInstructionsBatch(
  entries: Array<[ErrorCode, string]>
): void {
  for (const [k, v] of entries) instructionMap.set(k, v);
}

/** Convertir de forma segura valores desconocidos a una cadena de mensaje. */
function toStringSafe(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message || "Error desconocido";
  if (isObjectLike(value) && typeof value.message === "string") return value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return "Error desconocido";
  }
}

/** Intentar extraer un código numérico desde un mensaje de error como "(10049) ...". */
function parseNumericCodeFromMessage(message: string): number | undefined {
  const match = message.match(/\((\d{3,6})\)/);
  if (match) return Number(match[1]);
  return undefined;
}

const MAX_CODE_SEARCH_DEPTH = 2;
const DIRECT_CODE_PROPERTY = "code" as const;
const ALTERNATE_CODE_PROPERTIES = ["errCode", "statusCode"] as const;

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readCodeLikeValue(value: unknown): number | string | undefined {
  if (typeof value === "number" || typeof value === "string") return value;
  return undefined;
}

function readOwnCodeFromObject(obj: Record<string, unknown>): number | string | undefined {
  return readCodeLikeValue(obj[DIRECT_CODE_PROPERTY]);
}

function readAlternateCodeFromObject(
  obj: Record<string, unknown>
): number | string | undefined {
  for (const property of ALTERNATE_CODE_PROPERTIES) {
    const code = readCodeLikeValue(obj[property]);
    if (code !== undefined) return code;
  }

  return undefined;
}

function readNestedDetailsCode(
  obj: Record<string, unknown>,
  depth: number
): number | string | undefined {
  return extractCodeFromObject(obj.details, depth + 1);
}

/**
 * Intentar extraer un código de error desde objetos arbitrarios con una profundidad acotada.
 * Busca propiedades comunes como `code` y `details.code` anidado.
 */
function extractCodeFromObject(
  obj: any,
  depth = 0
): number | string | undefined {
  if (!isObjectLike(obj) || depth > MAX_CODE_SEARCH_DEPTH) return undefined;

  return (
    readOwnCodeFromObject(obj) ??
    readNestedDetailsCode(obj, depth) ??
    readAlternateCodeFromObject(obj)
  );
}

/** Verificación heurística de errores de validación de Zod sin importar los tipos de Zod. */
function isZodValidationError(value: unknown): boolean {
  const v = value as any;
  return (
    !!v &&
    typeof v === "object" &&
    (v.name === "ZodError" || Array.isArray(v.issues))
  );
}

/**
 * Detecta fallas de transporte (red/SOAP/HTTP/certificados) de forma conservadora:
 * solo clasifica como transporte cuando hay una señal fuerte (código de red conocido,
 * nombre de error HTTP/axios, o patrón de mensaje). Nunca dispara ante rechazos de AFIP.
 */
function isTransportError(value: unknown): boolean {
  if (typeof value === "string") {
    return TRANSPORT_MESSAGE_PATTERN.test(value);
  }

  if (!isObjectLike(value)) {
    return false;
  }

  const code = value.code;
  if (typeof code === "string" && TRANSPORT_ERROR_CODES.has(code.toUpperCase())) {
    return true;
  }

  if (value.name === "AxiosError" || value.name === "AbortError") {
    return true;
  }

  const message = typeof value.message === "string" ? value.message : "";
  return TRANSPORT_MESSAGE_PATTERN.test(message);
}

/**
 * Clasifica el origen de la falla. El orden importa:
 * 1. validación local (Zod), 2. transporte, 3. rechazo de AFIP con código, 4. interno.
 * Transporte se evalúa antes que rechazo para no confundir códigos de red (p.ej. ECONNREFUSED)
 * con códigos de negocio.
 */
function classifyKind(err: unknown, code: number | string | undefined): ErrorKind {
  if (isZodValidationError(err)) return "validation";
  if (isTransportError(err)) return "afip_transport";
  if (code !== undefined) return "afip_rejection";
  return "internal";
}

/**
 * Procesa cualquier error y lo transforma en un objeto estructurado que guíe al LLM.
 * - Siempre preserva el mensaje de error original y sus detalles.
 * - Agrega instrucciones determinísticas desde el mapeo centralizado.
 * - Recurre a una instrucción por defecto cuando el error es desconocido.
 */
export function processAfipError(err: unknown): ProcessedToolError {
  try {
    const message = toStringSafe(err);

    // Intentar encontrar un código desde el objeto o desde el patrón del mensaje
    let code: number | string | undefined;
    if (typeof err === "object" && err !== null) {
      code = extractCodeFromObject(err);
    }
    if (!code) {
      const fromMsg = parseNumericCodeFromMessage(message);
      if (fromMsg !== undefined) code = fromMsg;
    }

    // Clasificar el origen de la falla. Envuelto en su propio resguardo para que
    // un error hostil nunca rompa la extracción de mensaje/detalles ya lograda.
    let kind: ErrorKind = "internal";
    try {
      kind = classifyKind(err, code);
    } catch {
      kind = "internal";
    }

    let instructions: string | undefined;

    if (code !== undefined && instructionMap.has(code)) {
      instructions = instructionMap.get(code)!;
    } else if (
      isZodValidationError(err) &&
      instructionMap.has("ZOD_VALIDATION")
    ) {
      instructions = instructionMap.get("ZOD_VALIDATION")!;
    } else if (
      kind === "afip_transport" &&
      instructionMap.has("AFIP_TRANSPORT")
    ) {
      instructions = instructionMap.get("AFIP_TRANSPORT")!;
    } else {
      instructions = DEFAULT_INSTRUCTIONS;
    }

    return {
      error: message || "Error desconocido",
      kind,
      code,
      details: err,
      instructions,
    };
  } catch {
    // Resguardo ultra-seguro para asegurar que el procesador nunca arroje excepciones
    return {
      error: "Error desconocido",
      kind: "internal",
      details: err,
      instructions: DEFAULT_INSTRUCTIONS,
    };
  }
}
