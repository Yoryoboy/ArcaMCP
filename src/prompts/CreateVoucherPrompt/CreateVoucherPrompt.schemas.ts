import { z } from "zod";
import { completable } from "@modelcontextprotocol/sdk/server/completable.js";

// Args del prompt: todos opcionales y de tipo string, según requisito del SDK MCP
// (PromptArgsRawShape: ZodString u opcional). El asistente debe parsear y validar.
export const CreateVoucherPromptArgsSchema = z.object({
  modoNumeracion: completable(
    z
      .string()
      .describe(
        "Método de numeración. 'automatico' usa create_next_voucher. 'manual' usa create_voucher y requiere CbteDesde/CbteHasta."
      ),
    (value) => ["automatico", "manual"].filter((v) => v.startsWith((value ?? "").toLowerCase()))
  ).optional(),

  // Datos comerciales básicos
  concepto: completable(
    z
      .string()
      .describe("Concepto del comprobante: 1=Productos, 2=Servicios, 3=Productos y Servicios"),
    (value) => ["1", "2", "3"].filter((v) => v.startsWith(value ?? ""))
  ).optional(),
  tipoComprobante: completable(
    z
      .string()
      .describe(
        "Tipo de comprobante (ej: 11=Factura C). Si se omite, el asistente debe usar la tool get_voucher_types para listar y solicitar elección."
      ),
    (value, context) => {
      // Sugerencias comunes: 11 (Factura C), 6 (Factura B), 1 (Factura A)
      // Si el concepto es 1 o 3 y el usuario es monotributista, 11 suele ser preferido.
      const base = value ?? "";
      const concepto = context?.arguments?.["concepto"] as string | undefined;
      const suggestions = ["11", "6", "1"];
      // Prioriza 11 cuando concepto es 1 o 3
      const ordered =
        concepto === "1" || concepto === "3" ? ["11", "6", "1"] : suggestions;
      return ordered.filter((v) => v.startsWith(base));
    }
  ).optional(),
  puntoDeVenta: completable(
    z
      .string()
      .describe(
        "Punto de venta. Si se omite, el asistente debe usar get_sales_points; en testing puede continuar con 1 por defecto."
      ),
    (value) => ["1"].filter((v) => v.startsWith(value ?? ""))
  ).optional(),

  // Moneda
  moneda: completable(
    z
      .string()
      .describe("Código de moneda (ej: PES, DOL, EUR). Si se omite, usar PES."),
    (value) => ["PES", "DOL", "EUR"].filter((v) => v.startsWith((value ?? "").toUpperCase()))
  ).optional(),
  cotizacion: completable(
    z
      .string()
      .describe(
        "Cotización de la moneda. Para PES es 1. Si MonId != PES y no se provee, el asistente debe obtenerla con get_exchange_rate (fecha = CbteFch)."
      ),
    (value, context) => {
      const monId = (context?.arguments?.["moneda"] as string | undefined)?.toUpperCase();
      const base = (value ?? "").toString();
      if (!monId || monId === "PES") {
        return ["1"].filter((v) => v.startsWith(base));
      }
      return [];
    }
  ).optional(),

  // Identificación del receptor
  tipoDocumento: completable(
    z
      .string()
      .describe(
        "Código de documento del comprador (99=Consumidor Final, 96=DNI, 80=CUIT). Si se omite, el asistente puede sugerir 99 para consumidor final."
      ),
    (value) => ["99", "96", "80"].filter((v) => v.startsWith(value ?? ""))
  ).optional(),
  numeroDocumento: z
    .string()
    .optional()
    .describe(
      "Número de documento del comprador. Si es Consumidor Final y el monto es < $10.000.000 ARS, puede omitirse."
    ),
  condicionIVAReceptor: completable(
    z
      .string()
      .describe(
        "Condición de IVA del receptor (ej: 5=Consumidor Final, 6=Responsable Monotributo, 1=IVA Responsable Inscripto, 4=IVA Sujeto Exento). Si se omite, el asistente debe usar get_tax_condition_types para listar y pedir elección."
      ),
    (value) =>
      ["5", "6", "1", "4", "7", "8", "9", "10", "13", "15", "16"].filter((v) =>
        v.startsWith(value ?? "")
      )
  ).optional(),

  // Fechas
  fechaComprobante: completable(
    z
      .string()
      .describe(
        "Fecha del comprobante (yyyyMMdd). Si se omite, usar la fecha actual. Para concepto=1: +/-5 días; para 2 o 3: +/-10 días."
      ),
    (value) => {
      const fmt = (d: Date) =>
        `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
          d.getDate()
        ).padStart(2, "0")}`;
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const base = value ?? "";
      return [fmt(now), fmt(yesterday), fmt(tomorrow)].filter((v) => v.startsWith(base));
    }
  ).optional(),
  fechaServicioDesde: completable(
    z
      .string()
      .describe(
        "Fecha inicio de servicio (yyyyMMdd). Obligatoria si concepto=2 o 3. Si falta, el asistente debe solicitarla."
      ),
    (value, context) => {
      const base = value ?? "";
      const concepto = context?.arguments?.["concepto"] as string | undefined;
      if (concepto === "2" || concepto === "3") {
        const today = context?.arguments?.["fechaComprobante"] as string | undefined;
        return (today ? [today] : []).filter((v) => v.startsWith(base));
      }
      return [];
    }
  ).optional(),
  fechaServicioHasta: completable(
    z
      .string()
      .describe(
        "Fecha fin de servicio (yyyyMMdd). Obligatoria si concepto=2 o 3. No menor a fchServDesde. Si falta, solicitarla."
      ),
    (value, context) => {
      const base = value ?? "";
      const concepto = context?.arguments?.["concepto"] as string | undefined;
      const desde = context?.arguments?.["fechaServicioDesde"] as string | undefined;
      if (concepto === "2" || concepto === "3") {
        return (desde ? [desde] : []).filter((v) => v.startsWith(base));
      }
      return [];
    }
  ).optional(),
  fechaVencimientoPago: completable(
    z
      .string()
      .describe(
        "Fecha de vencimiento de pago (yyyyMMdd). Obligatoria si concepto=2 o 3 y debe ser >= cbteFch. Si falta, solicitarla."
      ),
    (value, context) => {
      const base = value ?? "";
      const fc = context?.arguments?.["fechaComprobante"] as string | undefined;
      return (fc ? [fc] : []).filter((v) => v.startsWith(base));
    }
  ).optional(),

  // Importes principales (como texto; el asistente debe parsear a número)
  importeTotal: completable(
    z
      .string()
      .describe(
        "Importe total. Para Factura C: ImpTotal = ImpNeto + ImpTrib. Si no se provee, el asistente debe calcularlo según reglas."
      ),
    (value, context) => {
      const base = value ?? "";
      const cbteTipo = context?.arguments?.["tipoComprobante"] as string | undefined;
      const impNeto = parseFloat(String(context?.arguments?.["importeNeto"] ?? ""));
      const impTrib = parseFloat(String(context?.arguments?.["importeTributos"] ?? ""));
      if (cbteTipo === "11" && !Number.isNaN(impNeto) && !Number.isNaN(impTrib)) {
        const total = (impNeto + impTrib).toString();
        return [total].filter((v) => v.startsWith(base));
      }
      return [];
    }
  ).optional(),
  importeNeto: z
    .string()
    .optional()
    .describe(
      "Importe neto. En Factura C corresponde al Subtotal. Si no se provee, el asistente debe inferirlo del monto o ítems."
    ),
  importeTributos: completable(
    z
      .string()
      .describe("Suma de tributos (por defecto 0 si no aplica)"),
    (value) => ["0"].filter((v) => v.startsWith(value ?? ""))
  ).optional(),

  // Manual numbering extras (solo si metodo = manual)
  cantidadRegistros: completable(
    z.string().describe("Cantidad de registros (por defecto 1)"),
    (value) => ["1"].filter((v) => v.startsWith(value ?? ""))
  ).optional(),
  comprobanteDesde: z
    .string()
    .optional()
    .describe("Número de comprobante desde (requerido en modo manual)"),
  comprobanteHasta: z
    .string()
    .optional()
    .describe("Número de comprobante hasta (requerido en modo manual)"),
});
