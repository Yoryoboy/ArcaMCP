import { MCPResponse } from "../core/types.js";
import { toErrorResponse } from "./toolError.helpers.js";

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
    return toErrorResponse(error);
  }
}
