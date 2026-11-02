import { z } from "zod";
import { jsonResponse } from "../../core/structuredOutput.js";
import { MCPResponse } from "../../core/types.js";
import { getDefaultCertificateStatus } from "../../services/afip/client.js";
import { toErrorResponse } from "../toolError.helpers.js";
import { READ_ONLY_LOCAL } from "../toolAnnotations.js";

const GetCertificateStatusOutputSchema = z.looseObject({
  environment: z.enum(["production", "development"]).describe("Ambiente del certificado cargado"),
  validFrom: z.string().describe("Inicio de vigencia (ISO 8601)"),
  validUntil: z.string().describe("Fin de vigencia (ISO 8601)"),
  daysRemaining: z.number().describe("Días hasta el vencimiento; negativo si ya venció"),
  status: z
    .enum(["valid", "expiring_soon", "expired", "not_yet_valid"])
    .describe("Estado de vigencia del certificado"),
  warningThresholdDays: z.number().describe("Días de anticipación desde los que se avisa el vencimiento"),
});

export class GetCertificateStatusTool {
  static readonly name = "get_certificate_status";

  static readonly metadata = {
    title: "Get X.509 certificate status",
    description:
      "Returns the loaded X.509 certificate validity status without exposing certificate, key, identity, issuer, subject, or local paths.",
    inputSchema: {},
    annotations: READ_ONLY_LOCAL,
    outputSchema: GetCertificateStatusOutputSchema,
  };

  static async execute(): Promise<MCPResponse> {
    try {
      return jsonResponse(getDefaultCertificateStatus().getStatus());
    } catch (error) {
      return toErrorResponse(error);
    }
  }
}
