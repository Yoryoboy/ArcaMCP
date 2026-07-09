import { MCPResponse } from "../core/types.js";
import { processAfipError } from "../utils/errorProcessor/errorProcessor.js";

type VoucherArrayFields = {
  Iva?: unknown[];
  Tributos?: unknown[];
  CbtesAsoc?: unknown[];
  Opcionales?: unknown[];
};

type SchemaWithParse<T> = {
  parse(input: unknown): T;
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

    return toTextResponse(result);
  } catch (error) {
    const processed = processAfipError(error);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(processed, null, 2),
        },
      ],
      isError: true,
    };
  }
}
