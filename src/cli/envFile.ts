import fs from "fs";

type EnvFileSystem = Pick<typeof fs, "readFileSync" | "writeFileSync" | "renameSync">;

function formatValue(value: string): string {
  if (value === "" || /^[\w./:@+-]+$/.test(value)) {
    return value;
  }

  // Single quotes are literal for dotenv, so Windows backslashes such as `\n`
  // in a path are never expanded. Fall back to double quotes only when needed.
  return value.includes("'") ? `"${value.replace(/"/g, '\\"')}"` : `'${value}'`;
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
    return `${key}=${formatValue(values[key])}`;
  });

  for (const [key, value] of pending) {
    updated.push(`${key}=${formatValue(value)}`);
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
