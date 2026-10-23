/**
 * MCP tool annotations. Clients use them to decide when to ask the user for
 * confirmation, so only tools with real-world effects are marked as such.
 */

/** Queries ARCA/AFIP without changing anything. */
export const READ_ONLY_AFIP = { readOnlyHint: true, openWorldHint: true } as const;

/** Reads local state only. */
export const READ_ONLY_LOCAL = { readOnlyHint: true, openWorldHint: false } as const;

/** Issues a fiscal document with a CAE: irreversible and never safe to repeat. */
export const ISSUES_FISCAL_DOCUMENT = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} as const;

/** Creates a new hosted file on every call without altering existing data. */
export const CREATES_HOSTED_FILE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;
