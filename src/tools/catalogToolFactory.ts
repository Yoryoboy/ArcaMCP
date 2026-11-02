import { z } from "zod";
import { jsonResponse, StructuredContent } from "../core/structuredOutput.js";
import { MCPResponse } from "../core/types.js";
import { EmptySchema } from "./shared.schemas.js";
import { toErrorResponse } from "./toolError.helpers.js";
import { READ_ONLY_AFIP } from "./toolAnnotations.js";

export interface CatalogToolConfig {
  name: string;
  title: string;
  description: string;
  guard?: () => MCPResponse | null | undefined;
  fetcher: () => Promise<unknown>;
  onError?: (error: unknown) => Record<string, unknown>;
  /** Structured content for the fetched result; defaults to the result itself (lists under `items`). */
  structure?: (result: unknown) => StructuredContent;
  /** Shape of each list element in the output schema; defaults to AFIP's `{ Id, Desc }`. */
  itemSchema?: z.ZodType;
  /** Serves successful results from memory for this long; omit to fetch on every call. */
  cacheTtlMs?: number;
  now?: () => number;
}

export interface CatalogTool {
  readonly name: string;
  readonly metadata: {
    title: string;
    description: string;
    inputSchema: typeof EmptySchema.shape;
    annotations: typeof READ_ONLY_AFIP;
    outputSchema: z.ZodObject;
  };
  execute(): Promise<MCPResponse>;
}

// AFIP payloads are typed `any` by the SDK: document the known fields, accept the rest.
const AfipParameterSchema = z.looseObject({
  Id: z.union([z.number(), z.string()]).optional().describe("Código AFIP"),
  Desc: z.string().optional().describe("Descripción"),
});

function catalogOutputSchema(itemSchema: z.ZodType = AfipParameterSchema) {
  return z.looseObject({
    items: z.array(itemSchema).optional().describe("Elementos devueltos por AFIP"),
    message: z
      .string()
      .optional()
      .describe("Aviso informativo cuando no se consulta AFIP, por ejemplo en testing"),
  });
}

// AFIP parameter catalogs (FEParamGet*) change rarely; one request per day is plenty.
export const AFIP_CATALOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry = { promise: Promise<unknown>; expiresAt: number };
const catalogCaches = new Set<{ entry?: CacheEntry }>();

export function resetCatalogCaches(): void {
  for (const cache of catalogCaches) cache.entry = undefined;
}

function cachedFetcher(config: CatalogToolConfig): () => Promise<unknown> {
  const { fetcher, cacheTtlMs, now = Date.now } = config;
  if (cacheTtlMs === undefined) return fetcher;

  const cache: { entry?: CacheEntry } = {};
  catalogCaches.add(cache);

  return () => {
    if (cache.entry && cache.entry.expiresAt > now()) return cache.entry.promise;

    // Concurrent calls share the pending request; the TTL starts once it succeeds.
    const entry: CacheEntry = { promise: Promise.resolve(), expiresAt: Infinity };
    entry.promise = fetcher().then(
      (result) => {
        entry.expiresAt = now() + cacheTtlMs;
        return result;
      },
      (error) => {
        if (cache.entry === entry) cache.entry = undefined;
        throw error;
      },
    );
    cache.entry = entry;
    return entry.promise;
  };
}

export function createCatalogTool(config: CatalogToolConfig): CatalogTool {
  const fetch = cachedFetcher(config);

  return {
    name: config.name,
    metadata: {
      title: config.title,
      description: config.description,
      inputSchema: EmptySchema.shape,
      annotations: READ_ONLY_AFIP,
      outputSchema: catalogOutputSchema(config.itemSchema),
    },
    async execute(): Promise<MCPResponse> {
      const guardedResponse = config.guard?.();

      if (guardedResponse) {
        return guardedResponse;
      }

      try {
        const result = await fetch();
        return jsonResponse(result, config.structure?.(result));
      } catch (error) {
        return toErrorResponse(error, config.onError?.(error));
      }
    },
  };
}
