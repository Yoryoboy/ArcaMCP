import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  normalizeOwnerProfile,
  resolveOwnerProfile,
  resetOwnerProfileCache,
} from "./ownerTaxpayerProfile.js";

const taxpayer = {
  nombre: "  Ada ",
  apellido: " Lovelace ",
  periodoActividadPrincipal: 202201,
  domicilio: [
    { tipoDomicilio: "COMERCIAL", estadoDomicilio: "ACTIVO", direccion: "Commercial" },
    {
      tipoDomicilio: "FISCAL",
      estadoDomicilio: "ACTIVO",
      calle: "Main",
      numero: "42",
      codigoPostal: "1000",
      descripcionProvincia: "CABA",
    },
    { tipoDomicilio: "LEGAL", estadoDomicilio: "ACTIVO", direccion: "Legal" },
    { tipoDomicilio: "FISCAL", estadoDomicilio: "INACTIVO", direccion: "Inactive" },
  ],
};

describe("owner taxpayer profile", () => {
  beforeEach(() => resetOwnerProfileCache());

  it("normalizes CUIT, identity, and ranked active domicile without exposing the A13 period", () => {
    expect(normalizeOwnerProfile("20123456789", taxpayer)).toEqual({
      CUIT_EMISOR: "20123456789",
      NOMBRE_EMISOR: "Ada Lovelace",
      DIRECCION_EMISOR: "Main 42 1000 CABA",
    });
  });

  it("ignores periodoActividadPrincipal regardless of its representation", () => {
    expect(
      normalizeOwnerProfile("20123456789", {
        ...taxpayer,
        periodoActividadPrincipal: { not: "a legal start date" },
      }),
    ).not.toHaveProperty("FECHA_INICIO_ACTIVIDADES");
  });

  it.each([
    { ...taxpayer, nombre: "", apellido: "Lovelace" },
    {
      ...taxpayer,
      domicilio: [{ tipoDomicilio: "FISCAL", estadoDomicilio: "INACTIVO", direccion: "No" }],
    },
  ])("rejects unusable A13 data", (value) => {
    expect(() => normalizeOwnerProfile("20123456789", value)).toThrow();
  });

  it("deduplicates concurrent lookups and evicts rejected promises", async () => {
    let rejectFirst = true;
    const provider = vi.fn(async () => {
      if (rejectFirst) {
        rejectFirst = false;
        throw new Error("temporary");
      }
      return normalizeOwnerProfile("20123456789", taxpayer);
    });

    await expect(
      Promise.all([
        resolveOwnerProfile("20123456789", provider),
        resolveOwnerProfile("20123456789", provider),
      ]),
    ).rejects.toThrow("temporary");
    expect(provider).toHaveBeenCalledTimes(1);
    await expect(resolveOwnerProfile("20123456789", provider)).resolves.toMatchObject({
      CUIT_EMISOR: "20123456789",
    });
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it("caches successful profiles for 15 minutes and refreshes after the TTL", async () => {
    let time = 1_000;
    const now = () => time;
    const provider = vi.fn(async () => normalizeOwnerProfile("20123456789", taxpayer));

    await resolveOwnerProfile("20123456789", provider, now);
    time += 15 * 60 * 1000 - 1;
    await resolveOwnerProfile("20123456789", provider, now);
    expect(provider).toHaveBeenCalledTimes(1);

    time += 1;
    await resolveOwnerProfile("20123456789", provider, now);
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it("deduplicates an in-flight lookup even when the clock advances beyond the TTL", async () => {
    let time = 0;
    let resolveProvider!: (profile: ReturnType<typeof normalizeOwnerProfile>) => void;
    const provider = vi.fn(
      () =>
        new Promise<ReturnType<typeof normalizeOwnerProfile>>((resolve) => {
          resolveProvider = resolve;
        }),
    );

    const first = resolveOwnerProfile("20123456789", provider, () => time);
    time = 16 * 60 * 1000;
    const second = resolveOwnerProfile("20123456789", provider, () => time);
    expect(provider).toHaveBeenCalledTimes(1);
    resolveProvider(normalizeOwnerProfile("20123456789", taxpayer));
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
  });
});
