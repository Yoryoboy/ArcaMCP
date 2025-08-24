# Guía completa de las herramientas de PDF y QR (AFIP) en MonotributoMCP

Esta guía explica en profundidad cómo funcionan las herramientas de:
- Generación de PDF de comprobantes: `create_pdf`
- Generación del texto/URL del Código QR AFIP: `generate_qr`

Está pensada para alguien que no conoce MCP, ni Zod, ni QR, ni AFIP. Incluye:
- Conceptos básicos con ejemplos sencillos
- Relación directa con el código existente
- Explicación detallada de esquemas (Zod), tipos (TypeScript) y flujo interno
- Ejemplos de uso paso a paso y resolución de problemas

Al final comprenderás qué hace cada archivo, cómo se encadenan, qué validan y cómo usarlos desde un cliente MCP.

---

## Índice

1. Introducción a conceptos clave
   - MCP (Model Context Protocol)
   - Qué es un “tool” MCP
   - Zod (validación de datos)
   - QR AFIP: qué es y cómo se construye
2. Herramienta: CreatePDFTool (`create_pdf`)
   - Archivos y símbolos relevantes
   - Flujo completo y fuentes de datos
   - Placeholders del template HTML
   - Cálculo de ítems y subtotales
   - Generación de QR interno para el PDF
   - Errores y solución
   - Ejemplos de uso
3. Herramienta: GenerateQRTool (`generate_qr`)
   - Archivos y símbolos relevantes
   - Normalizaciones, alias y reglas de validación
   - Construcción del payload y del texto del QR
   - Errores y solución
   - Ejemplos de uso
4. Tipos (TypeScript) utilizados por ambas herramientas
5. Requisitos de entorno y notas importantes
6. Anexos y referencias útiles

---

# 1) Introducción a conceptos clave

## MCP (Model Context Protocol)
- Idea simple: un “servidor MCP” expone herramientas (“tools”) que un cliente (como un IDE o un asistente) puede invocar con parámetros JSON.
- Cada tool:
  - Tiene un nombre (ej: `create_pdf`).
  - Publica metadatos (título, descripción, esquema de entrada).
  - Expone un método `execute(params)`, que devuelve una respuesta MCP (`MCPResponse`) con contenido estructurado.

Ejemplo conceptual:
```ts
class MiTool {
  static readonly name = "mi_tool";
  static readonly metadata = {
    title: "Hacer algo",
    description: "Hace algo útil",
    inputSchema: { /* descripción de campos */ }
  };

  static async execute(params: any): Promise<MCPResponse> {
    // 1) Validar params
    // 2) Ejecutar lógica
    // 3) Devolver contenido
    return {
      content: [{ type: "text", text: JSON.stringify({ ok: true }) }]
    };
  }
}
```

Cómo se relaciona con el código:
- `CreatePDFTool` y `GenerateQRTool` siguen exactamente esta estructura en:
  - `src/tools/CreatePDFTool/CreatePDFTool.ts`
  - `src/tools/GenerateQRTool/GenerateQRTool.ts`

## Zod (validación de datos)

- Zod es una librería para:
  - Definir esquemas de datos (qué campos se esperan, de qué tipo).
  - Validar objetos contra ese esquema (lanzará errores si faltan campos o son incorrectos).
  - Transformar valores (por ejemplo, convertir `YYYY-MM-DD` a `YYYYMMDD`).

Ejemplo simple:
```ts
import { z } from "zod";

const PersonaSchema = z.object({
  nombre: z.string(),
  edad: z.number().min(0),
});

// Validación
const persona = PersonaSchema.parse({ nombre: "Ana", edad: 30 }); // OK
PersonaSchema.parse({ nombre: "Ana", edad: -5 }); // Lanza error por edad
```

Cómo se relaciona con el código:
- Los esquemas de entrada están en:
  - `src/tools/CreatePDFTool/CreatePDFTool.schemas.ts` → `CreatePDFSchema`, `InvoiceItemSchema`
  - `src/tools/GenerateQRTool/GenerateQRTool.schemas.ts` → `GenerateQRSchema`, `GenerateQRInputSchema`
- Las herramientas usan `.parse(params)` para validar y normalizar la entrada antes de ejecutar.

## QR AFIP: qué es y cómo se construye

- Las facturas electrónicas argentinas incluyen un QR que codifica un JSON con campos específicos.
- AFIP define:
  - Un URL base: `https://www.afip.gob.ar/fe/qr/?p=...`
  - Donde `p` es el JSON del comprobante en Base64.
- Campos principales del JSON (payload):
  - `ver`: versión (1)
  - `fecha`: fecha `YYYY-MM-DD`
  - `cuit`: CUIT emisor
  - `ptoVta`: punto de venta
  - `tipoCmp`: tipo de comprobante
  - `nroCmp`: número
  - `importe`: total
  - `moneda`: código 3 letras (ej. PES)
  - `ctz`: cotización (si PES → 1)
  - `tipoCodAut`: “E” (CAE) o “A” (CAEA)
  - `codAut`: CAE (14 dígitos)
  - Opcionales: `tipoDocRec`, `nroDocRec`

Ejemplo simple:
```ts
const payload = {
  ver: 1,
  fecha: "2025-08-22",
  cuit: 20304050607,
  ptoVta: 1,
  tipoCmp: 11,
  nroCmp: 123,
  importe: 1000.0,
  moneda: "PES",
  ctz: 1,
  tipoCodAut: "E",
  codAut: "12345678901234",
};

const base64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
const qrText = `https://www.afip.gob.ar/fe/qr/?p=${encodeURIComponent(base64)}`;
```

Cómo se relaciona con el código:
- `GenerateQRTool` construye este `payload` y `qrText`.
- `CreatePDFTool` reutiliza el esquema de QR para generar un Data URL de imagen QR e incrustarlo en el PDF.

---

# 2) Herramienta: CreatePDFTool (`create_pdf`)

- Archivo principal: `src/tools/CreatePDFTool/CreatePDFTool.ts`
- Esquemas: `src/tools/CreatePDFTool/CreatePDFTool.schemas.ts`
- Tipos: `src/tools/types.ts` (sección `CreatePDFParams` e `InvoiceItem`)

## Objetivo
Generar un PDF dinámico del comprobante, combinando:
- Datos del voucher real desde AFIP (CAE, montos, fechas),
- Datos del emisor (desde AFIP usando `AFIP_CUIT` o overrides opcionales),
- Datos del receptor (AFIP si no es consumidor final, o overrides),
- Ítems de factura opcionales que se renderizan en el HTML,
- Código QR AFIP embebido como imagen dentro del PDF.

## Archivos y símbolos relevantes

- `CreatePDFTool.ts`
  - `CreatePDFTool.metadata`: metadatos MCP (nombre, título, descripción, `inputSchema: CreatePDFSchema.shape`)
  - `CreatePDFTool.execute(params: CreatePDFParams)`: flujo completo de generación
  - Métodos privados:
    - `getVoucherTypeName()`, `getVoucherTypeLetter()`: mapeos A/B/C
    - `buildQRDataUrl(voucher, issuerCuit)`: genera Data URL de QR válido
    - `generateInvoiceItems(items, voucher)`: arma las filas HTML de ítems

- `CreatePDFTool.schemas.ts`
  - `InvoiceItemSchema`: valida cada ítem
  - `CreatePDFSchema`: valida todos los campos de entrada de la herramienta
  - Normaliza fechas de entrada de overrides a formato amigable (dd/MM/yyyy)

- `src/tools/types.ts`
  - `CreatePDFParams`: tipo de entrada esperado por el tool
  - `InvoiceItem`: tipo de cada ítem de factura

## Flujo interno paso a paso (`CreatePDFTool.execute`)

Referencia: `src/tools/CreatePDFTool/CreatePDFTool.ts`

1) Validar entrada
- Línea 29: `CreatePDFSchema.parse(params)`
- Asegura que `PtoVta`, `CbteTipo`, `CbteNro` existan y sean válidos.
- Permite overrides opcionales (`issuer`, `recipient`, `service`, `paymentCondition`, `items`).

2) Obtener datos del comprobante desde AFIP
- Líneas 44–48: `afip.ElectronicBilling.getVoucherInfo(CbteNro, PtoVta, CbteTipo)`
- Se usan datos reales: `ImpTotal`, `CbteFch`, `CAE`, `CAE Fch Vto`, `DocTipo/DocNro`, etc.
- Si no existe, arroja error.

3) Obtener datos del emisor (AFIP_CUIT)
- Líneas 60–68: Lee `process.env.AFIP_CUIT` y consulta `afip.RegisterScopeThirteen.getTaxpayerDetails(cuit)`.
- Nota: Debes asegurar que `AFIP_CUIT` esté definido en el proceso MCP (ver sección “Requisitos de entorno”).

4) Obtener datos del receptor
- Líneas 71–101: Si el voucher no es consumidor final (`DocTipo !== 99`) y hay `DocNro`:
  - Si `DocTipo = 80` (CUIT): consulta `getTaxpayerDetails(DocNro)`
  - Si `DocTipo = 96` (DNI): primero `getTaxIDByDocument(DNI)` → `idPersona` → `getTaxpayerDetails(idPersona)`
- Si falla, se loguea advertencia y continúa (no corta el flujo).

5) Cargar plantilla HTML
- Líneas 104–116: Busca `templates/bill.html` en varias rutas candidatas:
  - `process.cwd()/templates/bill.html`
  - rutas relativas a `__dirname`
- Si no la encuentra, error claro.

6) Formateo de fechas y armado de datos
- Líneas 117–151 y 152–167:
  - Funciones `formatDate` y `formatDateAny`
  - Deriva nombre/dirección/condición fiscal del emisor y receptor (prioriza overrides)
  - Formatea montos con `toLocaleString("es-AR", {minimumFractionDigits: 2, ...})`

7) Generar QR e ítems dinámicos
- Línea 177: `buildQRDataUrl(voucher, issuerCuit)`:
  - Valida con `GenerateQRSchema`, construye payload y genera imagen QR (`qrcode.toDataURL`)
- Línea 178: `generateInvoiceItems(items, voucher)`:
  - Si hay ítems, renderiza cada fila (escapa `<` y `>` en descripciones).
  - Si no hay ítems, crea una fila genérica con el total del voucher.

8) Reemplazar placeholders en el HTML
- Líneas 194–220: Diccionario de `{{PLACEHOLDER}}` → valor
- Líneas 222–224: Reemplazo robusto con `split().join()` por cada placeholder (evita regex).

9) Generar el PDF
- Líneas 227–243: Llama `afip.ElectronicBilling.createPDF({ html, file_name, options })`
- Devuelve un `MCPResponse` con:
  - `success`, `message`, `fileName` y `pdfUrl` (o `file`), más info de voucher, emisor y receptor.

## Placeholders soportados (en `templates/bill.html`)

Estos nombres deben existir en la plantilla para que la sustitución se refleje:

- Encabezado y datos principales
  - `{{VOUCHER_TYPE_LETTER}}` → A/B/C según `CbteTipo`
  - `{{POINT_OF_SALE}}` → `PtoVta` padded 5 dígitos
  - `{{VOUCHER_NUMBER}}` → `CbteNro` padded 8 dígitos
  - `{{ISSUE_DATE}}` → fecha emisión dd/MM/yyyy

- Emisor
  - `{{ISSUER_COMPANY_NAME}}`
  - `{{ISSUER_CUIT}}`
  - `{{ISSUER_ADDRESS}}`
  - `{{ISSUER_TAX_CONDITION}}`
  - `{{ISSUER_GROSS_INCOME}}`
  - `{{ISSUER_START_DATE}}`

- Receptor
  - `{{RECIPIENT_CUIT}}`
  - `{{RECIPIENT_NAME}}`
  - `{{RECIPIENT_TAX_CONDITION}}`
  - `{{RECIPIENT_ADDRESS}}`

- Servicio y pago
  - `{{PAYMENT_CONDITION}}`
  - `{{SERVICE_DATE_FROM}}`
  - `{{SERVICE_DATE_TO}}`
  - `{{PAYMENT_DUE_DATE}}`

- Montos
  - `{{SUBTOTAL}}`
  - `{{OTHER_TAXES}}`
  - `{{TOTAL_AMOUNT}}`

- QR e ítems
  - `{{QR_CODE_DATA}}` → Data URL de imagen PNG
  - `{{INVOICE_ITEMS}}` → HTML de filas `<tr>...</tr>`

## Cálculo y seguridad en los ítems

Referencia: `generateInvoiceItems()` en `CreatePDFTool.ts`:

- Campos por ítem (`InvoiceItem`):
  - `code` (por defecto 001, 002…)
  - `description` (se escapan `<` y `>` para evitar inyección HTML)
  - `quantity` (default 1)
  - `unit` (default “Unidad”)
  - `unitPrice`
  - `discountPercent` y/o `discountAmount`
  - `subtotal` (si no viene, se calcula: `qty * unitPrice - descuento`)

- Se suma un “subtotal por ítems” para usarlo como `{{SUBTOTAL}}` si están presentes.

## Generación de QR embebido en el PDF

Referencia: `buildQRDataUrl()` en `CreatePDFTool.ts`:

- Reutiliza el esquema `GenerateQRSchema` para validar los campos del voucher.
- Construye el payload AFIP (ver sección QR) y genera un Data URL con `qrcode`:
  - `QRCode.toDataURL(qrText, { errorCorrectionLevel: "M" })`
- Si falla, usa un PNG de 1x1 en base64 como placeholder.

Importante:
- El URL base aquí es el oficial correcto:
  - `https://www.afip.gob.ar/fe/qr/?p=...`

## Errores y solución (PDF)

- “AFIP_CUIT no configurado…”:
  - Debes definir `AFIP_CUIT` en el entorno del servidor MCP (ver “Requisitos de entorno”).
- “No se encontró la plantilla HTML 'templates/bill.html'…”:
  - Crea `templates/bill.html` en la raíz del proyecto con los placeholders.
- Error al obtener voucher:
  - Verifica `CbteNro`, `PtoVta`, `CbteTipo` y conectividad a AFIP.
- QR fallback:
  - Si falla la generación del QR, se usa una imagen mínima. Revisa conectividad o parámetros.

## Ejemplos de uso (PDF)

- Mínimo necesario:
```json
{
  "PtoVta": 1,
  "CbteTipo": 11,
  "CbteNro": 123
}
```

- Con overrides de emisor/receptor y con ítems:
```json
{
  "PtoVta": 1,
  "CbteTipo": 11,
  "CbteNro": 123,
  "fileName": "factura_cliente_x.pdf",
  "issuer": {
    "companyName": "Mi Empresa SRL",
    "cuit": "20304050607",
    "address": "Av. Siempre Viva 742",
    "taxCondition": "Responsable Monotributista",
    "grossIncome": "IIBB CABA 123-456",
    "startDate": "2020-01-15"
  },
  "recipient": {
    "name": "Cliente XYZ",
    "cuit": "27999888777",
    "address": "Calle Falsa 123",
    "taxCondition": "Consumidor Final"
  },
  "service": {
    "dateFrom": "2025-08-01",
    "dateTo": "2025-08-31",
    "paymentDueDate": "2025-09-10"
  },
  "paymentCondition": "Transferencia",
  "items": [
    { "description": "Servicio A", "quantity": 2, "unitPrice": 1000 },
    { "description": "Servicio B", "quantity": 1, "unitPrice": 500, "discountPercent": 10 }
  ]
}
```

---

# 3) Herramienta: GenerateQRTool (`generate_qr`)

- Archivo principal: `src/tools/GenerateQRTool/GenerateQRTool.ts`
- Esquemas: `src/tools/GenerateQRTool/GenerateQRTool.schemas.ts`
- Tipos: `src/tools/types.ts` (tipos QR y parámetros)

## Objetivo
Generar:
- El payload JSON conforme a AFIP,
- El texto exacto (URL) que se debe codificar en el QR.

Sirve para:
- Validar que tus datos forman un QR AFIP correcto,
- Reutilizar el `qrText` para generar una imagen con cualquier librería,
- Integrarlo a sistemas que necesitan armar el QR del comprobante.

## Archivos y símbolos relevantes

- `GenerateQRTool.ts`
  - `GenerateQRTool.metadata`: detalla `inputSchema: GenerateQRInputSchema.shape`
  - `GenerateQRTool.execute(params: GenerateQRParams)`: valida, arma `payload`, construye `qrText`, intenta generar SVG para sanity-check (aunque no retorna imagen por ahora).

- `GenerateQRTool.schemas.ts`
  - `GenerateQRBaseSchema`: definición base y reglas de cada campo
  - `GenerateQRSchema`: agrega preprocesamiento de alias y validaciones combinadas
  - `GenerateQRInputSchema`: expuesto en metadatos (mismo que base)

- `src/tools/types.ts`
  - `AFIPQRPayload`: tipo de payload QR
  - `GenerateQRParams`: parámetros aceptados (con alias en minúsculas)
  - `GenerateQRResult`: resultado (`qrText` y `payload`)

Nota: `src/tools/GenerateQRTool/GenerateQRTool.types.ts` está vacío; se centralizó en `src/tools/types.ts`.

## Normalizaciones, alias y reglas de validación (Zod)

Referencia: `src/tools/GenerateQRTool/GenerateQRTool.schemas.ts`

- Helpers:
  - `toNumber`, `toInt`: convierten strings a número/entero seguro.
  - `normalizeCbteFch`: acepta `YYYYMMDD` o `YYYY-MM-DD` y normaliza a `YYYYMMDD`.
  - `aliasPreprocess`: permite usar alias en minúsculas tipo QR (`fecha`, `ptoVta`, `tipoCmp`, etc.) y los mapea a nombres consistentes (`CbteFch`, `PtoVta`, `CbteTipo`, etc.).

- `GenerateQRBaseSchema` valida:
  - `Ver`: literal 1 (versión del esquema QR).
  - `CbteFch`: string `YYYYMMDD` (tras normalizar).
  - `Cuit`: numérico de 11 dígitos.
  - `PtoVta`: entero 1–99999.
  - `CbteTipo`: entero 1–999.
  - `CbteNro`: entero 1–99999999.
  - `ImpTotal`: numérico ≥ 0.
  - `MonId`: 3 letras mayúsculas.
  - `MonCotiz`: numérico > 0.
  - `DocTipo` y `DocNro`: opcionales, pero deben venir juntos.
  - `TipoCodAut`: enum `E` o `A` (default `E`).
  - `CodAut`: string/number convertido a string.

- `GenerateQRSchema` agrega `superRefine` con reglas:
  - `DocTipo` y `DocNro` deben informarse juntos o no informarse.
  - `CodAut` debe ser numérico (sólo dígitos) y tener 14 dígitos.
  - Si `MonId` = `PES`, entonces `MonCotiz` debe ser 1.

## Construcción del payload y del texto del QR

Referencia: `src/tools/GenerateQRTool/GenerateQRTool.ts`

1) Validación:
```ts
const parsed = GenerateQRSchema.parse(params);
```

2) Construcción del `payload` AFIP (`AFIPQRPayload`):
```ts
const payload: AFIPQRPayload = {
  ver: parsed.Ver ?? 1,
  fecha: `${parsed.CbteFch.slice(0,4)}-${parsed.CbteFch.slice(4,6)}-${parsed.CbteFch.slice(6,8)}`,
  cuit: parsed.Cuit,
  ptoVta: parsed.PtoVta,
  tipoCmp: parsed.CbteTipo,
  nroCmp: parsed.CbteNro,
  importe: parsed.ImpTotal,
  moneda: parsed.MonId,
  ctz: parsed.MonCotiz,
  ...(parsed.DocTipo !== undefined && parsed.DocNro !== undefined ? { tipoDocRec: parsed.DocTipo, nroDocRec: parsed.DocNro } : {}),
  tipoCodAut: parsed.TipoCodAut,
  codAut: String(parsed.CodAut),
};
```

3) Texto del QR (`qrText`):
```ts
const json = JSON.stringify(payload);
const base64 = Buffer.from(json, "utf8").toString("base64");
const qrText = `https://www.afip.gob.ar/fe/qr/?p=${encodeURIComponent(base64)}`;
```

4) Generación opcional de imagen (sanity-check):
```ts
await QRCode.toString(qrText, { type: "svg", errorCorrectionLevel: "M" });
```

Importante:
- En `CreatePDFTool` el URL base es el oficial `https://www.afip.gob.ar/fe/qr/?p=...`.
- Si ves una variante diferente (`https://www.arca.gob.ar/fe/qr/...`) en algún punto, cámbiala a la oficial de AFIP para cumplir la especificación.

## Errores y solución (QR)

- Error de validación Zod (`isZodError` con `issues`):
  - Revisa que todos los campos cumplan con formatos y reglas.
  - Pistas: `CbteFch` debe ser `YYYYMMDD` (o `YYYY-MM-DD` aceptada y normalizada), `Cuit` 11 dígitos, `CodAut` 14 dígitos, `MonId` 3 letras, `MonCotiz` > 0 (si `PES` debe ser 1), `DocTipo` y `DocNro` juntos.

- Error generando SVG (librería `qrcode`):
  - El tool lo ignora y solo advierte por consola. El `qrText` y `payload` igual se devuelven.

## Ejemplos de uso (QR)

- Forma “voucher-consistente”:
```json
{
  "CbteFch": "20250822",
  "Cuit": 20304050607,
  "PtoVta": 1,
  "CbteTipo": 11,
  "CbteNro": 123,
  "ImpTotal": 1000,
  "MonId": "PES",
  "MonCotiz": 1,
  "TipoCodAut": "E",
  "CodAut": "12345678901234"
}
```

- Con alias estilo QR (en minúsculas):
```json
{
  "fecha": "2025-08-22",
  "cuit": "20304050607",
  "ptoVta": 1,
  "tipoCmp": 11,
  "nroCmp": 123,
  "importe": 1000,
  "moneda": "PES",
  "ctz": 1,
  "tipoCodAut": "E",
  "codAut": "12345678901234"
}
```

---

# 4) Tipos (TypeScript) utilizados por ambas herramientas

Archivo: `src/tools/types.ts`

- `CreatePDFParams`
  - Parámetros de entrada para `create_pdf`.
  - Incluye `issuer`, `recipient`, `service`, `paymentCondition`, `items` para overrides.

- `InvoiceItem`
  - Estructura de cada ítem renderizado en la tabla del PDF.

- `AFIPQRPayload`
  - Estructura exacta del JSON que AFIP espera codificado en el QR.

- `GenerateQRParams`
  - Input para `generate_qr`; acepta tanto nombres “voucher-consistentes” como alias minúsculos QR.

- `GenerateQRResult`
  - Resultado del tool: `qrText` (URL final) y `payload` (JSON codificado).

Nota sobre `GenerateQRTool.types.ts`:
- El archivo `src/tools/GenerateQRTool/GenerateQRTool.types.ts` está vacío actualmente, ya que se centralizó la tipificación QR en `src/tools/types.ts`.

---

# 5) Requisitos de entorno y notas importantes

- Variable de entorno `AFIP_CUIT` (emisor) obligatoria para `create_pdf`:
  - El servidor MCP corre como proceso independiente y NO lee `.env` del proyecto automáticamente.
  - Debes definir `AFIP_CUIT`:
    1) Como variable de sistema, o
    2) En la configuración del cliente MCP (`mcp_config.json` → sección `env`).

- Plantilla HTML `templates/bill.html`:
  - Debe existir en el proyecto con los placeholders listados arriba.
  - Puedes personalizar estilos, logos y layout; respeta los placeholders.

- Dependencias clave:
  - `zod` (validación)
  - `qrcode` (generación de QR como Data URL o SVG)
  - SDK AFIP (cliente `afip`):
    - `afip.ElectronicBilling.getVoucherInfo` para datos del comprobante.
    - `afip.ElectronicBilling.createPDF` para renderizar el PDF desde HTML.
    - `afip.RegisterScopeThirteen.getTaxpayerDetails` y `getTaxIDByDocument` para emisor/receptor.

- URL base del QR:
  - Usa siempre `https://www.afip.gob.ar/fe/qr/?p=...`.

---

# 6) Anexos y referencias útiles

- Archivos fuente:
  - `src/tools/CreatePDFTool/CreatePDFTool.ts`
  - `src/tools/CreatePDFTool/CreatePDFTool.schemas.ts`
  - `src/tools/GenerateQRTool/GenerateQRTool.ts`
  - `src/tools/GenerateQRTool/GenerateQRTool.schemas.ts`
  - `src/tools/types.ts`
  - Plantilla: `templates/bill.html`

- Documentación y especificaciones:
  - AFIP – Código QR: https://www.afip.gob.ar/fe/qr/
  - Especificaciones QR AFIP (PDF): https://www.afip.gob.ar/fe/qr/documentos/QRespecificaciones.pdf
  - Facturación electrónica AFIP (general): ver `docs/GUIA_FACTURACION_ELECTRONICA_AFIP.md`
  - Arquitectura MCP y AFIP: ver `docs/ARQUITECTURA_MCP_AFIP.md`

---

## Resumen

- `create_pdf` toma los identificadores del comprobante, obtiene datos reales desde AFIP, combina overrides opcionales, genera un QR válido y renderiza un PDF a partir de `bill.html`.
- `generate_qr` valida parámetros, construye el JSON conforme AFIP y devuelve el `qrText` listo para codificar en imagen.
- Zod garantiza entradas correctas y con formatos normalizados.
- Asegura `AFIP_CUIT` y la plantilla HTML para un flujo sin errores.
