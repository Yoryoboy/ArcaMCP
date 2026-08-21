import { describe, expect, it } from "vitest";
import { createCertificateStatus } from "./certificateStatus.js";

const certificate = `-----BEGIN CERTIFICATE-----
MIIDJzCCAg+gAwIBAgIUc7+M4+2/2NOT9SDu4f+S6qvLT5AwDQYJKoZIhvcNAQEL
BQAwIzEhMB8GA1UEAwwYQXJjYU1DUCB0ZXN0IGNlcnRpZmljYXRlMB4XDTI2MDgy
MTE0NDExM1oXDTM2MDgxODE0NDExM1owIzEhMB8GA1UEAwwYQXJjYU1DUCB0ZXN0
IGNlcnRpZmljYXRlMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxweM
We7sX5ouQ3lTxAWl6G7iPKMmWaRBeyTXlqwZZfW+nXTog8vQ576yKyu5ajP8mi8J
mWVrjzqubmHMQJIEg1rtvPav8td1jWY7nrcWPhoddn2A1m8TGBh2ewH8w75u0O1Q
3V7F7vVqf2GoYiQWOO/KV28f7ONOIxHnTWtfuUzFzbDatGwu8zAPF2u/zpvoN/y2
VjdUQpkkxOyNNc880UmbxumWx9gUHNDxTNDG9vIu5A4WiF42vfyJgmuEbyZLyUcW
dONmOtkvCNpiUEpg+o8QY6dJ1fZIYX9ChJ0rAmyog2HA3eHDFIpIp8Ygc/t5xgur
/0UQirV/3zgPcdVdtwIDAQABo1MwUTAdBgNVHQ4EFgQUp1wg7d8aSv734qcACHnd
Ryu2SMMwHwYDVR0jBBgwFoAUp1wg7d8aSv734qcACHndRyu2SMMwDwYDVR0TAQH/
BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAceAX/JiO2HRWxPSbFeBoYNJqLAuV
j1W6vYKFg+P7ZqW+RigV54ViHfHW1YSK+q501WSsKZ67dUJzlyKLN511lhiPWUQZ
CLNjrdUPZCbg6ioM1e6dHn6P5ZVLbvuGqnvE0o9CpHKudoXnPwpD/GMHu0zfMrzl
xxcFY/F5DALJv1XHaeOPiXXBr6wUH9Vrc14HKMOD3Lf3itqpZXFSoi911n3wazmi
48SfRf/hH2QwTmMe3qb0LS7Cm6iiuOpvHu+DsPIHanb4UCHz4bVbQbP0yoRD2XQa
JpG3H1TPUWgN+gghO96fQzm1yGVq6YrF+wDfEqijE2UdDiASSvdrLap9XQ==
-----END CERTIFICATE-----`;

const validFrom = Date.parse("2026-08-21T14:41:13.000Z");
const validUntil = Date.parse("2036-08-18T14:41:13.000Z");
const days = 24 * 60 * 60 * 1000;

describe("certificate status", () => {
  it("parses the loaded PEM once and exposes only safe validity data", () => {
    const monitor = createCertificateStatus(certificate, "production");
    const result = monitor.getStatus(() => validFrom + 91 * days);

    expect(result).toEqual({
      environment: "production",
      validFrom: "2026-08-21T14:41:13.000Z",
      validUntil: "2036-08-18T14:41:13.000Z",
      daysRemaining: 3559,
      status: "valid",
      warningThresholdDays: 90,
    });
  });

  it("uses the exact 90-day boundary", () => {
    const monitor = createCertificateStatus(certificate, "development");

    expect(monitor.getStatus(() => validUntil - 90 * days).status).toBe("expiring_soon");
    expect(monitor.getStatus(() => validUntil - 90 * days - 1).status).toBe("valid");
    expect(monitor.getStatus(() => validUntil - 90 * days + 1)).toMatchObject({
      daysRemaining: 90,
      status: "expiring_soon",
    });
  });

  it("treats the expiry instant as expired and dates before validFrom as not yet valid", () => {
    const monitor = createCertificateStatus(certificate, "production");

    expect(monitor.getStatus(() => validUntil).status).toBe("expired");
    expect(monitor.getStatus(() => validFrom - 1).status).toBe("not_yet_valid");
  });

  it("rejects malformed PEM without exposing its contents", () => {
    expect(() => createCertificateStatus("not a certificate", "production")).toThrow(
      "Loaded X.509 certificate PEM is invalid or unreadable.",
    );
  });
});
