import { z } from "zod";

import config from "../../config.js";
import afip from "./client.js";

export type OwnerProfile = {
  CUIT_EMISOR: string;
  NOMBRE_EMISOR: string;
  DIRECCION_EMISOR: string;
};

export type OwnerProfileProvider = (cuit: string) => Promise<OwnerProfile>;

const DomicileSchema = z
  .object({
    tipoDomicilio: z.unknown().optional(),
    tipo: z.unknown().optional(),
    estadoDomicilio: z.unknown().optional(),
    direccion: z.unknown().optional(),
    calle: z.unknown().optional(),
    numero: z.unknown().optional(),
    piso: z.unknown().optional(),
    oficinaDptoLocal: z.unknown().optional(),
    codigoPostal: z.unknown().optional(),
    descripcionProvincia: z.unknown().optional(),
  })
  .passthrough();

const TaxpayerSchema = z.object({
  nombre: z.unknown().optional(),
  apellido: z.unknown().optional(),
  domicilio: z.array(DomicileSchema).optional(),
});

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function domicileType(domicile: z.infer<typeof DomicileSchema>): string {
  return text(domicile.tipoDomicilio || domicile.tipo).toLowerCase();
}

function isActive(domicile: z.infer<typeof DomicileSchema>): boolean {
  return text(domicile.estadoDomicilio).toUpperCase() === "ACTIVO";
}

function addressOf(domicile: z.infer<typeof DomicileSchema>): string {
  const direct = text(domicile.direccion);
  if (direct) return direct;

  return [
    domicile.calle,
    domicile.numero,
    domicile.piso,
    domicile.oficinaDptoLocal,
    domicile.codigoPostal,
    domicile.descripcionProvincia,
  ]
    .map(text)
    .filter(Boolean)
    .join(" ");
}

export function normalizeOwnerProfile(cuit: string, raw: unknown): OwnerProfile {
  const taxpayer = TaxpayerSchema.parse(raw);
  const firstName = text(taxpayer.nombre);
  const lastName = text(taxpayer.apellido);
  if (!firstName || !lastName) throw new Error("A13 no contiene nombre y apellido válidos");
  const name = `${firstName} ${lastName}`;

  const ranking = ["fiscal", "legal", "comercial"];
  const domicile = (taxpayer.domicilio ?? [])
    .map((value, index) => ({ value, index, address: addressOf(value) }))
    .filter(({ value, address }) => isActive(value) && address)
    .sort((a, b) => {
      const rankA = ranking.indexOf(domicileType(a.value));
      const rankB = ranking.indexOf(domicileType(b.value));
      return (
        (rankA < 0 ? ranking.length : rankA) - (rankB < 0 ? ranking.length : rankB) ||
        a.index - b.index
      );
    })[0];

  if (!domicile) throw new Error("A13 no contiene un domicilio activo y direccionable");

  return {
    CUIT_EMISOR: cuit,
    NOMBRE_EMISOR: name,
    DIRECCION_EMISOR: domicile.address,
  };
}

export const defaultOwnerProfileProvider: OwnerProfileProvider = async (cuit) =>
  normalizeOwnerProfile(cuit, await afip.RegisterScopeThirteen.getTaxpayerDetails(Number(cuit)));

const PROFILE_CACHE_TTL_MS = 15 * 60 * 1000;
type ProfileCacheEntry = { promise: Promise<OwnerProfile>; expiresAt: number };
const profileCache = new Map<string, ProfileCacheEntry>();

export function resolveOwnerProfile(
  cuit: string,
  provider: OwnerProfileProvider = defaultOwnerProfileProvider,
  now: () => number = Date.now,
): Promise<OwnerProfile> {
  const cached = profileCache.get(cuit);
  if (cached && cached.expiresAt > now()) return cached.promise;

  const entry: ProfileCacheEntry = {
    promise: Promise.resolve({} as OwnerProfile),
    expiresAt: Infinity,
  };
  entry.promise = provider(cuit).then(
    (profile) => {
      entry.expiresAt = now() + PROFILE_CACHE_TTL_MS;
      return profile;
    },
    (error) => {
      if (profileCache.get(cuit) === entry) profileCache.delete(cuit);
      throw error;
    },
  );
  profileCache.set(cuit, entry);
  return entry.promise;
}

export function resetOwnerProfileCache(): void {
  profileCache.clear();
}

export function configuredOwnerCuit(): string {
  const cuit = text(config.CUIT);
  if (!/^\d{11}$/.test(cuit)) throw new Error("AFIP_CUIT debe contener exactamente 11 dígitos");
  return cuit;
}
