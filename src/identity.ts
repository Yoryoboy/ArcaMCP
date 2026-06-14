import config from "./config.js";

/**
 * Identity boundary convention
 *
 * - owner: fields that describe the server owner's legal identity.
 *   Only owner fields may default from server configuration.
 * - third-party: fields that identify a recipient or any other external party.
 *   These fields must remain explicit.
 * - query: fields used to look up another person or entity.
 *   These fields must remain explicit.
 */
export const OWNER_CUIT = config.CUIT;

export function resolveOwnerCuitOrThrow(): string {
  const ownerCuit = config.CUIT?.trim();

  if (!ownerCuit) {
    throw new Error(
      "AFIP_CUIT must be configured when CreatePDFTool omits CUIT_EMISOR",
    );
  }

  return ownerCuit;
}
