import { MCPResponse } from "../core/types.js";

type SchemaWithParse<T> = {
  parse(input: unknown): T;
};

type ExecuteJsonToolOptions<TValidated, TResult> = {
  params: unknown;
  schema: SchemaWithParse<TValidated>;
  guard?: () => MCPResponse | null | undefined | Promise<MCPResponse | null | undefined>;
  invoke: (validatedParams: TValidated) => Promise<TResult>;
  onNullResult?: (validatedParams: TValidated) => MCPResponse | null | undefined;
};

function toTextResponse(payload: unknown): MCPResponse {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export async function executeJsonTool<TValidated, TResult>(
  options: ExecuteJsonToolOptions<TValidated, TResult>,
): Promise<MCPResponse> {
  try {
    const guardedResponse = await options.guard?.();
    if (guardedResponse) {
      return guardedResponse;
    }

    const validatedParams = options.schema.parse(options.params);
    const result = await options.invoke(validatedParams);

    if (result === null && options.onNullResult) {
      const nullResultResponse = options.onNullResult(validatedParams);
      if (nullResultResponse) {
        return nullResultResponse;
      }
    }

    return toTextResponse(result);
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : "Error desconocido",
              details: error,
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
}
