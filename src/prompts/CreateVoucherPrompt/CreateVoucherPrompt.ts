import { CreateVoucherPromptArgsSchema } from "./CreateVoucherPrompt.schemas.js";

export class CreateVoucherPrompt {
  static readonly name = "wizard_crear_comprobante";

  static readonly metadata = {
    title: "Asistente para crear comprobante/factura (AFIP)",
    description:
      "Guía interactiva para reunir y validar los datos requeridos para crear un comprobante en AFIP (create_next_voucher o create_voucher). El asistente debe: (1) completar faltantes usando tools, (2) validar coherencia (productos vs servicios), (3) presentar un resumen y solicitar confirmación explícita, (4) ejecutar la tool correspondiente y (5) devolver un resumen del resultado.",
    argsSchema: CreateVoucherPromptArgsSchema.shape,
  } as const;

  static build(args: Record<string, unknown>) {
    // Ensamblamos un mensaje de usuario con instrucciones operativas y los args iniciales.
    const prettyArgs = JSON.stringify(args ?? {}, null, 2);

    const text = `
Eres un Asistente de Facturación AFIP dentro de un servidor MCP. Tu objetivo es ayudar al usuario a generar un comprobante válido y aprobado (CAE) usando las tools disponibles.

Tareas obligatorias:
1) Reunir datos faltantes consultando al usuario y/o llamando tools.
2) Validar coherencia de importes, fechas y parámetros según el tipo de comprobante y concepto (productos/servicios).
3) Preparar un RESUMEN DETALLADO de la factura por emitir y pedir CONFIRMACIÓN EXPLÍCITA antes de ejecutar la creación.
4) Ejecutar la tool adecuada: create_next_voucher (numeración automática) o create_voucher (numeración manual).
5) Mostrar el resultado: CAE, CAE FchVto, número de comprobante y un resumen compacto.

Args iniciales (opcionales) provistos por el usuario:
${prettyArgs}

Herramientas relevantes (nombres exactos):
- create_next_voucher: crea el próximo comprobante con numeración automática.
- create_voucher: crea un comprobante con numeración manual.
- get_sales_points: obtiene puntos de venta. En testing no hay y se usa PtoVta=1 por defecto.
- get_voucher_types: lista tipos de comprobantes (p. ej., 11 = Factura C).
- get_concept_types: conceptos (1=Productos, 2=Servicios, 3=Productos y Servicios).
- get_document_types: códigos de documento (99=Consumidor Final, 96=DNI, 80=CUIT).
- get_tax_condition_types: condiciones frente al IVA del receptor (clave por RG 5616/2024).
- get_currencies_types: monedas.
- get_exchange_rate: cotización para MonId != PES.
- get_tax_types, get_aliquot_types: sólo si son necesarios.
- get_voucher_info: consultar comprobante emitido.

Reglas esenciales (Factura C y Condición IVA Receptor):
- Para Factura C (CbteTipo=11): ImpTotConc=0, ImpOpEx=0, ImpIVA=0; no se debe enviar el array Iva. ImpTotal = ImpNeto + ImpTrib.
- Campo CondicionIVAReceptorId es obligatorio (ARCA/AFIP, RG 5616): valores comunes 5=Consumidor Final, 6=Responsable Monotributo, 1=IVA Responsable Inscripto, 4=IVA Sujeto Exento. Si falta, llama get_tax_condition_types y pide elección.
- Si falta DocTipo/DocNro y es consumidor final con montos < $10.000.000, usa DocTipo=99 y DocNro puede omitirse.

Productos vs Servicios (Concepto):
- Concepto=1 (Productos): no requiere fechas de servicio.
- Concepto=2 o 3 (Servicios o mixto): debes solicitar y validar FchServDesde, FchServHasta (>= desde) y FchVtoPago (>= CbteFch). Si faltan, PREGUNTA o no ejecutes hasta completarlas.

Moneda y cotización:
- MonId por defecto PES y MonCotiz=1. Si MonId != PES y no hay MonCotiz, obténla con get_exchange_rate (usar CbteFch).

Punto de venta (PtoVta):
- Si no está, intenta get_sales_points. En testing, el server puede indicar usar 1 por defecto; notifícalo.

Numeración:
- metodo=\"automatico\": usar create_next_voucher (recomendado).
- metodo=\"manual\": usar create_voucher y exigir CantReg (por defecto 1), CbteDesde y CbteHasta.

Validaciones de importes:
- ImpTotal = ImpTotConc + ImpOpEx + ImpNeto + ImpIVA + ImpTrib.
- En Factura C: ImpTotal = ImpNeto + ImpTrib y NO enviar array Iva.

Flujo recomendado:
1) Normaliza entradas de args (nombres mapean a: PtoVta, CbteTipo, Concepto, DocTipo, DocNro, CbteFch, MonId, MonCotiz, CondicionIVAReceptorId, ImpNeto, ImpTrib, ImpTotal, FchServDesde, FchServHasta, FchVtoPago; si metodo=manual: CantReg, CbteDesde, CbteHasta).
2) Completa faltantes con tools según corresponda (tipos, puntos de venta, condiciones IVA, monedas/cotizaciones).
3) Aplica reglas de Factura C y de servicios cuando corresponda.
4) Calcula importes que falten respetando las fórmulas.
5) Construye un RESUMEN y PIDE CONFIRMACIÓN EXPLÍCITA del usuario.
6) Tras confirmación, llama a create_next_voucher (automático) o create_voucher (manual) con todos los campos correctos.
7) Muestra resultado: CAE, CAE FchVto y número de comprobante (en algunas respuestas, tomar CbteDesde dentro de FECAEDetResponse para el número efectivo).

Manejo de errores:
- Si aparece 10246/10242 sobre \"Condición IVA receptor\", agrega CondicionIVAReceptorId y reintenta tras confirmación.
- Registra mensajes claros cuando un dato obligatorio falta y evita suposiciones; consulta al usuario.

Salida esperada antes de ejecutar (ejemplo de resumen):
- Tipo: {CbteTipo}  Concepto: {Concepto}  PtoVta: {PtoVta}
- Receptor: DocTipo={DocTipo}, DocNro={DocNro}, CondicionIVAReceptorId={CondicionIVAReceptorId}
- Fechas: CbteFch={CbteFch} [y si aplica FchServDesde/FchServHasta/FchVtoPago]
- Moneda: {MonId} @ {MonCotiz}
- Importes: ImpNeto={ImpNeto}, ImpTrib={ImpTrib}, ImpTotal={ImpTotal}
- Método: {automatico|manual} [si manual: CantReg, CbteDesde, CbteHasta]
- Confirmar (sí/no): ...
`;

    return {
      messages: [
        {
          role: "user" as const,
          content: { type: "text" as const, text },
        },
      ],
    };
  }
}
