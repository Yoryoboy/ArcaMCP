import { MCPResponse } from "../core/types.js";

type SchemaWithParse<T> = {
  parse(input: unknown): T;
};

type AutomationToolOptions<TValidated, TResult> = {
  params: unknown;
  schema: SchemaWithParse<TValidated>;
  invoke: (validatedParams: TValidated) => Promise<TResult>;
  serializeSuccess: (result: TResult) => MCPResponse["content"];
};

export async function executeAutomationTool<TValidated, TResult>(
  options: AutomationToolOptions<TValidated, TResult>,
): Promise<MCPResponse> {
  try {
    const validatedParams = options.schema.parse(options.params);
    const result = await options.invoke(validatedParams);

    return {
      content: options.serializeSuccess(result),
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error),
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
