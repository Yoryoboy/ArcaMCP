import { z } from "zod";
import { completable } from "@modelcontextprotocol/sdk/server/completable.js";
import {
  suggestCurrencyQuote,
  suggestInvoiceTotal,
  suggestNearbyVoucherDates,
  suggestPaymentDueDate,
  suggestServiceDateFrom,
  suggestServiceDateUntil,
  suggestVoucherType,
  startsWithAny,
} from "./CreateVoucherPrompt.helpers.js";

// Args del prompt: todos opcionales y de tipo string, según requisito del SDK MCP
// (PromptArgsRawShape: ZodString u opcional). El asistente debe parsear y validar.
export const CreateVoucherPromptArgsSchema = z.object({
  modoNumeracion: completable(
    z
      .string()
      .describe(
        "Método de numeración. 'automatico' usa create_next_voucher. 'manual' usa create_voucher y requiere CbteDesde/CbteHasta."
      ),
    (value) => startsWithAny(["automatico", "manual"], (value ?? "").toLowerCase())
  ).optional(),

  // Datos comerciales básicos
  concepto: completable(
    z
      .string()
      .describe("Concepto del comprobante: 1=Productos, 2=Servicios, 3=Productos y Servicios"),
    (value) => startsWithAny(["1", "2", "3"], value)
  ).optional(),
  tipoComprobante: completable(
    z
      .string()
      .describe(
        "Tipo de comprobante (ej: 11=Factura C). Si se omite, el asistente debe usar la tool get_voucher_types para listar y solicitar elección."
      ),
    suggestVoucherType
  ).optional(),
  puntoDeVenta: completable(
    z
      .string()
      .describe(
        "Punto de venta. Si se omite, el asistente debe usar get_sales_points; en testing puede continuar con 1 por defecto."
      ),
    (value) => startsWithAny(["1"], value)
  ).optional(),

  // Moneda
  moneda: completable(
    z
      .string()
      .describe("Código de moneda (ej: PES, DOL, EUR). Si se omite, usar PES."),
    (value) => startsWithAny(["PES", "DOL", "EUR"], value, (text) => text.toUpperCase())
  ).optional(),
  cotizacion: completable(
    z
      .string()
      .describe(
        "Cotización de la moneda. Para PES es 1. Si MonId != PES y no se provee, el asistente debe obtenerla con get_exchange_rate (fecha = CbteFch)."
      ),
    suggestCurrencyQuote
  ).optional(),

  // Identificación del receptor
  tipoDocumento: completable(
    z
      .string()
      .describe(
        "Código de documento del comprador (99=Consumidor Final, 96=DNI, 80=CUIT). Si se omite, el asistente puede sugerir 99 para consumidor final."
      ),
    (value) => startsWithAny(["99", "96", "80"], value)
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
    (value) => startsWithAny(["5", "6", "1", "4", "7", "8", "9", "10", "13", "15", "16"], value)
  ).optional(),

  // Fechas
  fechaComprobante: completable(
    z
      .string()
      .describe(
        "Fecha del comprobante (yyyyMMdd). Si se omite, usar la fecha actual. Para concepto=1: +/-5 días; para 2 o 3: +/-10 días."
      ),
    suggestNearbyVoucherDates
  ).optional(),
  fechaServicioDesde: completable(
    z
      .string()
      .describe(
        "Fecha inicio de servicio (yyyyMMdd). Obligatoria si concepto=2 o 3. Si falta, el asistente debe solicitarla."
      ),
    suggestServiceDateFrom
  ).optional(),
  fechaServicioHasta: completable(
    z
      .string()
      .describe(
        "Fecha fin de servicio (yyyyMMdd). Obligatoria si concepto=2 o 3. No menor a fchServDesde. Si falta, solicitarla."
      ),
    suggestServiceDateUntil
  ).optional(),
  fechaVencimientoPago: completable(
    z
      .string()
      .describe(
        "Fecha de vencimiento de pago (yyyyMMdd). Obligatoria si concepto=2 o 3 y debe ser >= cbteFch. Si falta, solicitarla."
      ),
    suggestPaymentDueDate
  ).optional(),

  // Importes principales (como texto; el asistente debe parsear a número)
  importeTotal: completable(
    z
      .string()
      .describe(
        "Importe total. Para Factura C: ImpTotal = ImpNeto + ImpTrib. Si no se provee, el asistente debe calcularlo según reglas."
      ),
    suggestInvoiceTotal
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
    (value) => startsWithAny(["0"], value)
  ).optional(),

  // Manual numbering extras (solo si metodo = manual)
  cantidadRegistros: completable(
    z.string().describe("Cantidad de registros (por defecto 1)"),
    (value) => startsWithAny(["1"], value)
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
