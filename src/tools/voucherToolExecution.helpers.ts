import { jsonResponse } from "../core/structuredOutput.js";
import { MCPResponse } from "../core/types.js";
import { toErrorResponse } from "./toolError.helpers.js";

type VoucherArrayFields = {
  Iva?: unknown[];
  Tributos?: unknown[];
  CbtesAsoc?: unknown[];
  Opcionales?: unknown[];
};

type SchemaWithParse<T> = {
  parse(input: unknown): T;
};

export function cleanEmptyVoucherArrays<T extends VoucherArrayFields>(
  params: T,
): T {
  const cleanedParams = { ...params } as Partial<T>;

  for (const key of ["Iva", "Tributos", "CbtesAsoc", "Opcionales"] as const) {
    if (Array.isArray(cleanedParams[key]) && cleanedParams[key]?.length === 0) {
      delete cleanedParams[key];
    }
  }

  return cleanedParams as T;
}

export async function executeVoucherTool<TValidated extends VoucherArrayFields, TResult>(
  options: {
    params: unknown;
    schema: SchemaWithParse<TValidated>;
    invoke: (context: {
      validatedParams: TValidated;
      cleanedParams: TValidated;
    }) => Promise<TResult>;
  },
): Promise<MCPResponse> {
  try {
    const validatedParams = options.schema.parse(options.params);
    const cleanedParams = cleanEmptyVoucherArrays(validatedParams);
    const result = await options.invoke({ validatedParams, cleanedParams });

    return jsonResponse(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
