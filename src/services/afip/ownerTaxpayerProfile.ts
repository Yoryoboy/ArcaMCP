import { z } from "zod";

import config from "../../config.js";
import afip from "./client.js";

export type OwnerProfile = {
  CUIT_EMISOR: string;
  NOMBRE_EMISOR: string;
  DIRECCION_EMISOR: string;
};

export type OwnerProfileProvider = (
  cuit: string,
  selectedAddress?: string,
) => Promise<OwnerProfile>;

export class OwnerAddressSelectionError extends Error {
  readonly code = "address_selection_required";
  readonly candidates: string[];

  constructor(candidates: string[]) {
    super(
      "A13 contiene varios domicilios elegibles de igual prioridad; se requiere seleccionar uno",
    );
    this.name = "OwnerAddressSelectionError";
    this.candidates = candidates;
  }
}

export class InvalidOwnerAddressSelectionError extends Error {
  readonly code = "address_selection_invalid";
  readonly requestedAddress: string;
  readonly candidates: string[];

  constructor(requestedAddress: string, candidates: string[]) {
    super("El domicilio seleccionado no coincide con un candidato elegible de A13");
    this.name = "InvalidOwnerAddressSelectionError";
    this.requestedAddress = requestedAddress;
    this.candidates = candidates;
  }
}

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

function isEligible(domicile: z.infer<typeof DomicileSchema>): boolean {
  return ["ACTIVO", "DECLARADO POR INTERNET"].includes(
    text(domicile.estadoDomicilio).toUpperCase(),
  );
}

function addressOf(domicile: z.infer<typeof DomicileSchema>): string {
  const direct = text(domicile.direccion);
  if (direct) return direct.replace(/\s+/g, " ");

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
    .join(" ")
    .replace(/\s+/g, " ");
}

function addressKey(address: string): string {
  return address.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function domicilePriority(domicile: z.infer<typeof DomicileSchema>): number {
  const type = domicileType(domicile);
  if (type === "fiscal") return 0;
  if (["legal", "legal/real", "legal real"].includes(type)) return 1;
  if (type === "comercial") return 2;
  return 3;
}

export function normalizeOwnerProfile(
  cuit: string,
  raw: unknown,
  selectedAddress?: string,
): OwnerProfile {
  const taxpayer = TaxpayerSchema.parse(raw);
  const firstName = text(taxpayer.nombre);
  const lastName = text(taxpayer.apellido);
  if (!firstName || !lastName) throw new Error("A13 no contiene nombre y apellido válidos");
  const name = `${firstName} ${lastName}`;

  const candidates = (taxpayer.domicilio ?? [])
    .map((value, index) => ({ value, index, address: addressOf(value) }))
    .filter(({ value, address }) => isEligible(value) && address)
    .reduce<Array<{ address: string; priority: number; index: number }>>((unique, candidate) => {
      const existing = unique.find(
        (item) => addressKey(item.address) === addressKey(candidate.address),
      );
      const priority = domicilePriority(candidate.value);
      if (existing) {
        existing.priority = Math.min(existing.priority, priority);
      } else {
        unique.push({ address: candidate.address, priority, index: candidate.index });
      }
      return unique;
    }, [])
    .sort((a, b) => a.priority - b.priority || a.index - b.index);

  if (!candidates.length) {
    if (selectedAddress !== undefined) {
      throw new InvalidOwnerAddressSelectionError(selectedAddress, []);
    }
    throw new Error("A13 no contiene un domicilio elegible y direccionable");
  }

  if (selectedAddress !== undefined) {
    const selected = candidates.find(
      (candidate) => addressKey(candidate.address) === addressKey(selectedAddress),
    );
    if (!selected) {
      throw new InvalidOwnerAddressSelectionError(
        selectedAddress,
        candidates.map((candidate) => candidate.address),
      );
    }

    return {
      CUIT_EMISOR: cuit,
      NOMBRE_EMISOR: name,
      DIRECCION_EMISOR: selected.address,
    };
  }

  const highestPriority = candidates[0].priority;
  const highestPriorityCandidates = candidates.filter(
    (candidate) => candidate.priority === highestPriority,
  );
  if (highestPriorityCandidates.length > 1) {
    throw new OwnerAddressSelectionError(
      highestPriorityCandidates.map((candidate) => candidate.address),
    );
  }

  return {
    CUIT_EMISOR: cuit,
    NOMBRE_EMISOR: name,
    DIRECCION_EMISOR: candidates[0].address,
  };
}

export const defaultOwnerProfileProvider: OwnerProfileProvider = async (cuit, selectedAddress) =>
  normalizeOwnerProfile(
    cuit,
    await afip.RegisterScopeThirteen.getTaxpayerDetails(Number(cuit)),
    selectedAddress,
  );

const PROFILE_CACHE_TTL_MS = 15 * 60 * 1000;
type ProfileCacheEntry = { promise: Promise<OwnerProfile>; expiresAt: number };
const profileCache = new Map<string, ProfileCacheEntry>();

export function resolveOwnerProfile(
  cuit: string,
  provider: OwnerProfileProvider = defaultOwnerProfileProvider,
  now: () => number = Date.now,
  selectedAddress?: string,
): Promise<OwnerProfile> {
  if (selectedAddress !== undefined) return provider(cuit, selectedAddress);

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
