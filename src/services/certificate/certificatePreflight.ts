import { MCPResponse } from "../../core/types.js";
import { CertificateStatusMonitor, CertificateStatusSnapshot } from "./certificateStatus.js";

type ToolHandler = (...args: any[]) => Promise<MCPResponse>;

const OPENSSL_COMMAND = "openssl x509 -in /ruta/al/certificado.crt -noout -dates";

function blockedResponse(snapshot: CertificateStatusSnapshot): MCPResponse {
  const expired = snapshot.status === "expired";
  const code = expired ? "CERTIFICATE_EXPIRED" : "CERTIFICATE_NOT_YET_VALID";
  const error = expired
    ? "The loaded X.509 certificate has expired."
    : "The loaded X.509 certificate is not valid yet.";
  const action = expired
    ? "Renew or replace the certificate"
    : "Replace the certificate with one whose validity period has started";

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: false,
            error,
            kind: "certificate",
            code,
            certificate: {
              status: snapshot.status,
              validFrom: snapshot.validFrom,
              validUntil: snapshot.validUntil,
              daysRemaining: snapshot.daysRemaining,
            },
            instructions: `${action}, then restart ArcaMCP. Inspect dates with: ${OPENSSL_COMMAND}`,
          },
          null,
          2,
        ),
      },
    ],
    isError: true,
  };
}

function warning(snapshot: CertificateStatusSnapshot): Record<string, unknown> {
  return {
    code: "CERTIFICATE_EXPIRING_SOON",
    status: snapshot.status,
    validUntil: snapshot.validUntil,
    daysRemaining: snapshot.daysRemaining,
    warningThresholdDays: snapshot.warningThresholdDays,
    message: "The loaded X.509 certificate will expire soon.",
  };
}

export function createCertificatePreflight(monitor: CertificateStatusMonitor) {
  let warningIssued = false;

  return {
    wrap(handler: ToolHandler, requiresCertificate: boolean): ToolHandler {
      return async (...args: any[]) => {
        const snapshot = monitor.getStatus();

        if (
          requiresCertificate &&
          (snapshot.status === "expired" || snapshot.status === "not_yet_valid")
        ) {
          return blockedResponse(snapshot);
        }

        const response = await handler(...args);
        if (!requiresCertificate || snapshot.status !== "expiring_soon" || warningIssued) {
          return response;
        }

        warningIssued = true;
        const certificateWarning = warning(snapshot);
        return {
          ...response,
          content: [
            ...response.content,
            {
              type: "text",
              text: JSON.stringify({ warning: certificateWarning }, null, 2),
            },
          ],
          _meta: {
            ...response._meta,
            certificateWarning,
          },
        };
      };
    },
  };
}
