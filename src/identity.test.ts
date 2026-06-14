import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("resolveOwnerCuitOrThrow", () => {
  const originalAfipCuit = process.env.AFIP_CUIT;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();

    if (originalAfipCuit === undefined) {
      delete process.env.AFIP_CUIT;
      return;
    }

    process.env.AFIP_CUIT = originalAfipCuit;
  });

  const loadResolver = async () => {
    const { resolveOwnerCuitOrThrow } = await import("./identity.js");
    return resolveOwnerCuitOrThrow;
  };

  it("returns the configured owner CUIT when it has exactly 11 digits", async () => {
    process.env.AFIP_CUIT = "20123456789";
    const resolveOwnerCuitOrThrow = await loadResolver();

    expect(resolveOwnerCuitOrThrow()).toBe("20123456789");
  });

  it("trims surrounding whitespace for a valid 11-digit owner CUIT", async () => {
    process.env.AFIP_CUIT = " 20123456789 ";
    const resolveOwnerCuitOrThrow = await loadResolver();

    expect(resolveOwnerCuitOrThrow()).toBe("20123456789");
  });

  it("fails when the configured owner CUIT is blank", async () => {
    process.env.AFIP_CUIT = "";
    const resolveOwnerCuitOrThrow = await loadResolver();

    expect(() => resolveOwnerCuitOrThrow()).toThrow(
      "AFIP_CUIT must be configured when CreatePDFTool omits CUIT_EMISOR",
    );
  });

  it("fails when the configured owner CUIT is only whitespace", async () => {
    process.env.AFIP_CUIT = "   ";
    const resolveOwnerCuitOrThrow = await loadResolver();

    expect(() => resolveOwnerCuitOrThrow()).toThrow(
      "AFIP_CUIT must be configured when CreatePDFTool omits CUIT_EMISOR",
    );
  });

  it("fails when the configured owner CUIT contains non-digit characters", async () => {
    process.env.AFIP_CUIT = "20A2345678B";
    const resolveOwnerCuitOrThrow = await loadResolver();

    expect(() => resolveOwnerCuitOrThrow()).toThrow(
      "AFIP_CUIT must be exactly 11 digits when CreatePDFTool omits CUIT_EMISOR",
    );
  });

  it("fails when the configured owner CUIT is shorter than 11 digits", async () => {
    process.env.AFIP_CUIT = "2012345678";
    const resolveOwnerCuitOrThrow = await loadResolver();

    expect(() => resolveOwnerCuitOrThrow()).toThrow(
      "AFIP_CUIT must be exactly 11 digits when CreatePDFTool omits CUIT_EMISOR",
    );
  });

  it("fails when the configured owner CUIT is longer than 11 digits", async () => {
    process.env.AFIP_CUIT = "201234567890";
    const resolveOwnerCuitOrThrow = await loadResolver();

    expect(() => resolveOwnerCuitOrThrow()).toThrow(
      "AFIP_CUIT must be exactly 11 digits when CreatePDFTool omits CUIT_EMISOR",
    );
  });

  it("fails when the configured owner CUIT mixes digits with punctuation", async () => {
    process.env.AFIP_CUIT = "20-12345678-9";
    const resolveOwnerCuitOrThrow = await loadResolver();

    expect(() => resolveOwnerCuitOrThrow()).toThrow(
      "AFIP_CUIT must be exactly 11 digits when CreatePDFTool omits CUIT_EMISOR",
    );
  });
});
