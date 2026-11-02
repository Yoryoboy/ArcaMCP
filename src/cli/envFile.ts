import fs from "fs";

type EnvFileSystem = Pick<typeof fs, "readFileSync" | "writeFileSync" | "renameSync">;

function formatValue(key: string, value: string): string {
  if (value === "" || /^[\w./:@+-]+$/.test(value)) {
    return value;
  }

  // Single quotes and backticks are literal for Node's .env parser, so Windows
  // backslashes such as `\n` are never expanded. The parser has no escape
  // sequences, so double quotes are only safe without backslashes or `"`.
  for (const quote of ["'", "`"]) {
    if (!value.includes(quote)) {
      return `${quote}${value}${quote}`;
    }
  }
  if (!/["\\]/.test(value)) {
    return `"${value}"`;
  }

  throw new Error(
    `${key} no puede guardarse en .env: contiene comillas simples y backticks junto con comillas dobles o barras invertidas.`,
  );
}

/**
 * Sets each key in dotenv content, replacing existing assignments in place and
 * appending missing ones. Every other line, including comments, is preserved.
 */
export function updateEnvContent(content: string, values: Record<string, string>): string {
  const pending = new Map(Object.entries(values));
  const lines = content === "" ? [] : content.replace(/\r?\n$/, "").split(/\r?\n/);

  const updated = lines.map((line) => {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    const key = match?.[1];
    if (!key || !(key in values)) {
      return line;
    }

    pending.delete(key);
    return `${key}=${formatValue(key, values[key])}`;
  });

  for (const [key, value] of pending) {
    updated.push(`${key}=${formatValue(key, value)}`);
  }

  return `${updated.join("\n")}\n`;
}

export function writeEnvFile(
  filePath: string,
  values: Record<string, string>,
  fileSystem: EnvFileSystem = fs,
): void {
  let current = "";
  try {
    current = fileSystem.readFileSync(filePath, "utf8");
  } catch (error) {
    if ((error as { code?: unknown })?.code !== "ENOENT") {
      throw error;
    }
  }

  // Write then rename so an interrupted run never leaves a truncated .env behind.
  const temporaryPath = `${filePath}.arcamcp-tmp`;
  fileSystem.writeFileSync(temporaryPath, updateEnvContent(current, values), { mode: 0o600 });
  fileSystem.renameSync(temporaryPath, filePath);
}
