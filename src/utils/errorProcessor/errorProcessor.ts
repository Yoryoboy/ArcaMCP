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

export type ProcessedToolError = {
  /** Mensaje de error legible para humanos (preservado del error original) */
  error: string;
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

    let instructions: string | undefined;

    if (code !== undefined && instructionMap.has(code)) {
      instructions = instructionMap.get(code)!;
    } else if (
      isZodValidationError(err) &&
      instructionMap.has("ZOD_VALIDATION")
    ) {
      instructions = instructionMap.get("ZOD_VALIDATION")!;
    } else {
      instructions = DEFAULT_INSTRUCTIONS;
    }

    return {
      error: message || "Error desconocido",
      details: err,
      instructions,
    };
  } catch {
    // Resguardo ultra-seguro para asegurar que el procesador nunca arroje excepciones
    return {
      error: "Error desconocido",
      details: err,
      instructions: DEFAULT_INSTRUCTIONS,
    };
  }
}
