import { MCPResponse } from "../../core/types.js";
import { getDefaultCertificateStatus } from "../../services/afip/client.js";

export class GetCertificateStatusTool {
  static readonly name = "get_certificate_status";

  static readonly metadata = {
    title: "Get X.509 certificate status",
    description:
      "Returns the loaded X.509 certificate validity status without exposing certificate, key, identity, issuer, subject, or local paths.",
    inputSchema: {},
  };

  static async execute(): Promise<MCPResponse> {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(getDefaultCertificateStatus().getStatus(), null, 2),
        },
      ],
    };
  }
}
