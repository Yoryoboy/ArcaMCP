import type { SetupOptions } from "./setup.js";

export const HELP_TEXT = `ArcaMCP: servidor MCP para facturación electrónica de ARCA/AFIP.

Uso:
  arcamcp                                   Inicia el servidor MCP por stdio.
  arcamcp setup [--dev | --prod] [--force]  Crea el certificado, lo guarda en ./certs/<env>/,
                                            actualiza .env y autoriza wsfe y ws_sr_padron_a13.
  arcamcp doctor                            Diagnostica la configuración sin modificar nada.
  arcamcp help                              Muestra esta ayuda.

Opciones de setup:
  --dev      Usa homologación (por defecto si AFIP_PRODUCTION no es "true").
  --prod     Usa producción (por defecto si AFIP_PRODUCTION=true).
  --force    Reemplaza un certificado existente en ./certs/<env>/.

setup toma AFIP_CUIT, AFIP_CERT_ALIAS, AFIP_SDK_ACCESS_TOKEN y AFIP_PASSWORD del entorno
o de .env; si falta alguno lo pide por terminal. La clave fiscal nunca se guarda.

Con npx: npx -y @yoryoboy/arcamcp@latest <comando>
`;

export interface CliDependencies {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  setup: (options: Required<Pick<SetupOptions, "force">> & SetupOptions) => Promise<number>;
  doctor: () => Promise<number>;
}

/** Returns "server" when the MCP server should start, otherwise the exit code. */
export async function runCli(
  argv: string[],
  dependencies: CliDependencies,
): Promise<number | "server"> {
  const { stdout, stderr } = dependencies;
  const [command, ...rest] = argv;

  const usageError = (message: string) => {
    stderr(`${message}\n\n${HELP_TEXT}`);
    return 2;
  };

  if (command === undefined) {
    return "server";
  }

  if (command === "help" || command === "--help" || command === "-h") {
    stdout(HELP_TEXT);
    return 0;
  }

  if (command === "setup") {
    const allowed = new Set(["--dev", "--prod", "--force"]);
    const invalid = rest.find((argument) => !allowed.has(argument));
    if (invalid !== undefined) {
      return usageError(`Opción inválida para setup: ${invalid}`);
    }
    if (rest.includes("--dev") && rest.includes("--prod")) {
      stderr("Usá --dev o --prod, no ambos.\n");
      return 2;
    }

    const environment = rest.includes("--prod")
      ? "prod"
      : rest.includes("--dev")
        ? "dev"
        : undefined;
    return dependencies.setup({ environment, force: rest.includes("--force") });
  }

  if (command === "doctor") {
    if (rest.length > 0) {
      return usageError(`Opción inválida para doctor: ${rest[0]}`);
    }
    return dependencies.doctor();
  }

  return usageError(`Comando desconocido: ${command}`);
}
