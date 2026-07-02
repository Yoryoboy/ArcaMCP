import { MCPResponse } from "../core/types.js";
import { EmptySchema } from "./shared.schemas.js";

export interface CatalogToolConfig {
  name: string;
  title: string;
  description: string;
  guard?: () => MCPResponse | null | undefined;
  fetcher: () => Promise<unknown>;
  onError?: (error: unknown) => Record<string, unknown>;
}

export interface CatalogTool {
  readonly name: string;
  readonly metadata: {
    title: string;
    description: string;
    inputSchema: typeof EmptySchema.shape;
  };
  execute(): Promise<MCPResponse>;
}

export function createCatalogTool(config: CatalogToolConfig): CatalogTool {
  return {
    name: config.name,
    metadata: {
      title: config.title,
      description: config.description,
      inputSchema: EmptySchema.shape,
    },
    async execute(): Promise<MCPResponse> {
      const guardedResponse = config.guard?.();

      if (guardedResponse) {
        return guardedResponse;
      }

      try {
        const result = await config.fetcher();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error:
                    error instanceof Error
                      ? error.message
                      : "Error desconocido",
                  details: error,
                  ...(config.onError?.(error) ?? {}),
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }
    },
  };
}
