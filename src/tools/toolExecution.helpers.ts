import { jsonResponse, StructuredContent } from "../core/structuredOutput.js";
import { MCPResponse } from "../core/types.js";
import { toErrorResponse } from "./toolError.helpers.js";

type SchemaWithParse<T> = {
  parse(input: unknown): T;
};

type ExecuteJsonToolOptions<TValidated, TResult> = {
  params: unknown;
  schema: SchemaWithParse<TValidated>;
  guard?: () => MCPResponse | null | undefined | Promise<MCPResponse | null | undefined>;
  invoke: (validatedParams: TValidated) => Promise<TResult>;
  onNullResult?: (validatedParams: TValidated) => MCPResponse | null | undefined;
  /** Tool-specific structured content; defaults to the result itself (lists under `items`). */
  structure?: (result: TResult) => StructuredContent;
};

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

    return jsonResponse(result, options.structure?.(result));
  } catch (error) {
    return toErrorResponse(error);
  }
}
