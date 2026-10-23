import { MCPResponse } from "../../core/types.js";
import { getDefaultCertificateStatus } from "../../services/afip/client.js";
import { toErrorResponse } from "../toolError.helpers.js";
import { READ_ONLY_LOCAL } from "../toolAnnotations.js";

export class GetCertificateStatusTool {
  static readonly name = "get_certificate_status";

  static readonly metadata = {
    title: "Get X.509 certificate status",
    description:
      "Returns the loaded X.509 certificate validity status without exposing certificate, key, identity, issuer, subject, or local paths.",
    inputSchema: {},
    annotations: READ_ONLY_LOCAL,
  };

  static async execute(): Promise<MCPResponse> {
    try {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(getDefaultCertificateStatus().getStatus(), null, 2),
          },
        ],
      };
    } catch (error) {
      return toErrorResponse(error);
    }
  }
}
