import { readFileSync } from "node:fs";

// package.json sits one level above both src/ and dist/, and npm always publishes it.
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

export const packageVersion = packageJson.version;
