import { X509Certificate } from "node:crypto";

export const CERTIFICATE_WARNING_THRESHOLD_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export type CertificateEnvironment = "production" | "development";
export type CertificateStatus = "valid" | "expiring_soon" | "expired" | "not_yet_valid";

export interface CertificateStatusSnapshot {
  environment: CertificateEnvironment;
  validFrom: string;
  validUntil: string;
  daysRemaining: number;
  status: CertificateStatus;
  warningThresholdDays: number;
}

export interface CertificateStatusMonitor {
  getStatus(now?: () => number): CertificateStatusSnapshot;
}

function toIsoDate(value: string, field: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Loaded X.509 certificate has an invalid ${field} date.`);
  }

  return new Date(timestamp).toISOString();
}

export function createCertificateStatus(
  pem: string,
  environment: CertificateEnvironment,
): CertificateStatusMonitor {
  let certificate: X509Certificate;

  try {
    certificate = new X509Certificate(pem);
  } catch {
    throw new Error("Loaded X.509 certificate PEM is invalid or unreadable.");
  }

  const validFrom = toIsoDate(certificate.validFrom, "validFrom");
  const validUntil = toIsoDate(certificate.validTo, "validUntil");
  const validFromMs = Date.parse(validFrom);
  const validUntilMs = Date.parse(validUntil);

  return {
    getStatus(now = Date.now): CertificateStatusSnapshot {
      const nowMs = now();
      const daysRemaining = Math.floor((validUntilMs - nowMs) / DAY_MS);
      let status: CertificateStatus;

      if (nowMs >= validUntilMs) {
        status = "expired";
      } else if (nowMs < validFromMs) {
        status = "not_yet_valid";
      } else if (validUntilMs - nowMs <= CERTIFICATE_WARNING_THRESHOLD_DAYS * DAY_MS) {
        status = "expiring_soon";
      } else {
        status = "valid";
      }

      return {
        environment,
        validFrom,
        validUntil,
        daysRemaining,
        status,
        warningThresholdDays: CERTIFICATE_WARNING_THRESHOLD_DAYS,
      };
    },
  };
}
