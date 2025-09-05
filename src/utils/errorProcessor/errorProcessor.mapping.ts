/** El código de error puede ser numérico (p.ej., 10049) o string para agrupaciones lógicas (p.ej., "ZOD_VALIDATION"). */
export type ErrorCode = number | string;

/**
 * Mapeo central de códigos de error a instrucciones prescriptivas.
 *
 * Agrega nuevas entradas aquí (o vía registerErrorInstructions) para escalar sin tocar la lógica central.
 */
export const instructionMap: Map<ErrorCode, string> = new Map<
  ErrorCode,
  string
>([
  [
    10004,
    [
      "Acción para código 10004 (PtoVta inválido):",
      "- El campo PtoVta debe estar comprendido entre 1 y 99998.",
      "- Para obtener puntos de venta disponibles, usar tool get_sales_points.",
      "- Solicita al usuario que proporcione un número de punto de venta válido dentro del rango permitido.",
      "- Recuerda que el punto de venta debe estar habilitado en AFIP para el emisor.",
      "- No reintentes la operación hasta que se proporcione un valor válido para PtoVta.",
      "- Si el usuario no especifica, se tiene que obtener sus puntos de venta disponibles y pedirle que elija uno.",
    ].join("\n"),
  ],
  [
    10007,
    [
      "Acción para código 10007 (CbteTipo inválido):",
      "- El campo CbteTipo debe ser uno de los tipos de comprobante válidos:",
      "  * Clase A: 01, 02, 03, 04, 05, 34, 39, 60, 63, 201, 202, 203",
      "  * Clase B: 06, 07, 08, 09, 10, 35, 40, 61, 64, 206, 207, 208",
      "  * Clase C: 11, 12, 13, 15, 211, 212, 213",
      "  * Clase M: 51, 52, 53, 54",
      "  * Bienes Usados: 49",
      "- Para obtener tipos de comprobante disponibles, usar tool get_voucher_types.",
      "- Si el usuario no ha especificado el tipo de Factura, se tiene que obtener sus tipos de comprobante disponibles y recomendarle elegir uno.",
      "- Si se informa más de un comprobante, todos deben ser del mismo tipo.",
      "- No reintentes la operación hasta que se proporcione un valor válido para CbteTipo.",
    ].join("\n"),
  ],
  [
    10016,
    [
      "Acción para código 10016 (concepto obligatorio):",
      "Fecha del comprobante (yyyyMMdd). Para concepto=1: hasta 5 días anteriores/posteriores. Para 2 o 3: hasta 10 días. Si el usuario no especifica, usar la fecha actual",
    ].join("\n"),
  ],
  [
    10031,
    [
      "Acción para código 10031 (FchServDesde obligatorio):",
      "- El campo 'fecha desde del servicio a facturar' <FchServDesde> es obligatorio si se informa 'fecha hasta del servicio a facturar' <FchServHasta> y/o 'fecha de vencimiento para el pago' <FchVtoPago>.",
      "- Solicita al usuario que proporcione la fecha de inicio del servicio (FchServDesde) en formato AAAAMMDD.",
      "- Recuerda que para servicios, las tres fechas deben estar presentes y ser coherentes entre sí.",
      "- No reintentes la operación hasta que se proporcione un valor válido para FchServDesde.",
      "- El LLM no debe asumir esa información",
    ].join("\n"),
  ],
  [
    10032,
    [
      "Acción para código 10032 (FchServDesde posterior a FchServHasta):",
      "- El campo 'fecha desde del servicio a facturar' <FchServDesde> no puede ser posterior al campo 'fecha hasta del servicio a facturar' <FchServHasta>.",
      "- Solicita al usuario que corrija las fechas asegurando que FchServDesde sea anterior o igual a FchServHasta.",
      "- Sugiere valores coherentes basados en la fecha del comprobante.",
      "- No reintentes la operación hasta que se corrijan las fechas.",
    ].join("\n"),
  ],
  [
    10033,
    [
      "Acción para código 10033 (FchServHasta obligatorio):",
      "- El campo FchServHasta es obligatorio cuando se informa FchServDesde y/o FchVtoPago.",
      "- Solicita al usuario que proporcione la fecha de fin del servicio (FchServHasta) en formato AAAAMMDD.",
      "- Verifica que FchServHasta sea igual o posterior a FchServDesde.",
      "- Recuerda que para servicios, las tres fechas son obligatorias: FchServDesde, FchServHasta y FchVtoPago.",
      "- No reintentes la operación hasta que se proporcione un valor válido para FchServHasta.",
      "- El LLM no debe asumir esa información",
    ].join("\n"),
  ],
  [
    10035,
    [
      "Acción para código 10035 (FchVtoPago obligatorio):",
      "- El campo 'fecha de vencimiento para el pago' <FchVtoPago> es obligatorio si se informa 'fecha desde del servicio a facturar' <FchServDesde> y/o 'fecha hasta del servicio a facturar' <FchServHasta>.",
      "- Solicita al usuario que proporcione la fecha de vencimiento de pago (FchVtoPago) en formato AAAAMMDD.",
      "- Verifica que FchVtoPago sea posterior a la fecha del comprobante (CbteFch).",
      "- Recuerda que para servicios, las tres fechas son obligatorias.",
      "- No reintentes la operación hasta que se proporcione un valor válido para FchVtoPago.",
      "- El LLM no debe asumir esa información",
    ].join("\n"),
  ],
  [
    10036,
    [
      "Acción para código 10036 (FchVtoPago anterior a fecha del comprobante):",
      "- El campo 'fecha de vencimiento para el pago' <FchVtoPago> no puede ser anterior a la fecha del comprobante.",
      "- Solicita al usuario que corrija la fecha de vencimiento de pago asegurando que sea igual o posterior a la fecha del comprobante (CbteFch).",
      "- Sugiere una fecha de vencimiento razonable (por ejemplo, 15 o 30 días después de la fecha del comprobante).",
      "- No reintentes la operación hasta que se corrija la fecha de vencimiento.",
      "- El LLM no debe asumir esa información",
    ].join("\n"),
  ],
  [
    10049,
    [
      "Acción para código 10049 (fechas de servicio obligatorias):",
      "- Verifica el campo 'Concepto'. Si es 2 (Servicios) o 3 (Productos y Servicios),",
      "- Si el usuario no especifica, se le debe preguntar por esta información. El LLM no debe asumir esa información",
      "- Solicita y valida estos campos: FchServDesde, FchServHasta, FchVtoPago (formato AAAAMMDD).",
      "- Validaciones mínimas: FchServHasta >= FchServDesde y FchVtoPago > CbteFch.",
      "- Si el comprobante es solo de productos, ofrece cambiar 'Concepto' a 1 (Productos).",
      "- No reintentes la operación hasta completar/corregir estos campos.",
      "- El LLM no debe asumir esa información",
    ].join("\n"),
  ],
  [
    "ZOD_VALIDATION",
    [
      "Acción para error de validación de esquema (Zod):",
      "- Informa exactamente qué campos faltan o son inválidos según el esquema.",
      "- Solicita al usuario proporcionar valores válidos, respetando tipos y formatos.",
      "- No intentes llamar a AFIP hasta que la validación local pase sin errores.",
    ].join("\n"),
  ],
]);
