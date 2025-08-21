# Especificaciones del QR en Facturas Electrónicas

## Información codificada en el QR
El código QR debe incluir los siguientes datos del comprobante:
- Fecha de emisión
- CUIT del emisor
- Punto de venta
- Tipo de Comprobante
- Número de Comprobante
- Importe total
- Moneda
- Cotización
- Tipo Documento Receptor (si corresponde)
- Número de Documento de Receptor (si corresponde)
- Código del Tipo de Autorización
- Código de Autorización

Cuando el comprobante electrónico se emite mediante **Comprobantes en línea** o la aplicación **Facturador Móvil**, el sistema incorpora automáticamente el QR al comprobante autorizado.

---

## Especificación técnica

El QR codifica el siguiente texto:
```
{URL}?p={DATOS_CMPBASE64}
```

- **{URL}** = `https://www.arca.gob.ar/fe/qr/`
- **{DATOS_CMPBASE64}** = JSON con datos del comprobante codificado en Base64

### Formato JSON (versión 1)

| Campo      | Tipo                        | Descripción                                                        | Ejemplo |
|------------|-----------------------------|--------------------------------------------------------------------|---------|
| ver        | Numérico (1 dígito)         | OBLIGATORIO – versión del formato de los datos                     | 1       |
| fecha      | full-date (RFC3339)         | OBLIGATORIO – Fecha de emisión                                     | "2020-10-13" |
| cuit       | Numérico (11 dígitos)       | OBLIGATORIO – CUIT del emisor                                      | 30000000007 |
| ptoVta     | Numérico (hasta 5 dígitos)  | OBLIGATORIO – Punto de venta                                       | 10      |
| tipoCmp    | Numérico (hasta 3 dígitos)  | OBLIGATORIO – Tipo de comprobante (según tablas AFIP)              | 1       |
| nroCmp     | Numérico (hasta 8 dígitos)  | OBLIGATORIO – Número de comprobante                                | 94      |
| importe    | Decimal (13 enteros, 2 dec) | OBLIGATORIO – Importe total en la moneda emitida                   | 12100   |
| moneda     | String (3 caracteres)       | OBLIGATORIO – Moneda del comprobante (según tablas AFIP)           | "DOL"  |
| ctz        | Decimal (13 enteros, 6 dec) | OBLIGATORIO – Cotización en pesos argentinos de la moneda utilizada | 65      |
| tipoDocRec | Numérico (hasta 2 dígitos)  | OPCIONAL – Código del tipo de documento del receptor               | 80      |
| nroDocRec  | Numérico (hasta 20 dígitos) | OPCIONAL – Número de documento del receptor                        | 20000000001 |
| tipoCodAut | String                      | OBLIGATORIO – “A” = CAEA, “E” = CAE                                | "E"    |
| codAut     | Numérico (14 dígitos)       | OBLIGATORIO – Código de autorización otorgado por ARCA             | 70417054367476 |

---

## Ejemplo

**Texto codificado en el QR:**
```
https://www.afip.gob.ar/fe/qr/?p=eyJ2ZXIiOjEsImZlY2hhIjoiMjAyMC0xMC0xMyIsImN1aXQiOjMwMDAwMDAwMDA3LCJwdG9WdGEiOjEwLCJ0aXBvQ21wIjoxLCJucm9DbXAiOjk0LCJpbXBvcnRlIjoxMjEwMCwibW9uZWRhIjoiRE9MIiwiY3R6Ijo2NSwidGlwb0RvY1JlYyI6ODAsIm5yb0RvY1JlYyI6MjAwMDAwMDAwMDEsInRpcG9Db2RBdXQiOiJFIiwiY29kQXV0Ijo3MDQxNzA1NDM2NzQ3Nn0=
```

**JSON decodificado:**
```json
{
  "ver": 1,
  "fecha": "2020-10-13",
  "cuit": 30000000007,
  "ptoVta": 10,
  "tipoCmp": 1,
  "nroCmp": 94,
  "importe": 12100,
  "moneda": "DOL",
  "ctz": 65,
  "tipoDocRec": 80,
  "nroDocRec": 20000000001,
  "tipoCodAut": "E",
  "codAut": 70417054367476
}
```

