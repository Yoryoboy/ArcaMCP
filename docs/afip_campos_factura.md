# 📑 Especificaciones Técnicas de Servicios Web – WSFEv1

Este documento reúne los campos de solicitud para la autorización de comprobantes electrónicos ante la AFIP, organizados en formato Markdown para una consulta rápida.

---

## 🔐 Autenticación – `Auth`

| Campo | Detalle | Obligatorio |
|-------|---------|-------------|
| `Auth` | Información de la autenticación. Contiene los datos de Token, Sign y Cuit. | S |
| `Token` | Token devuelto por el WSAA. | S |
| `Sign` | Sign devuelto por el WSAA. | S |
| `Cuit` | CUIT contribuyente (representado o emisor). | S |

---

## 🧾 Comprobante / Lote – `FECAEReq`

| Campo     | Detalle                                                                 | Obligatorio |
|-----------|-------------------------------------------------------------------------|-------------|
| `FeCAEReq` | Información del comprobante o lote de comprobantes de ingreso. Contiene `FeCabReq` y `FeDetReq`. | S |
| `FeCabReq` | Información de la cabecera del comprobante o lote de comprobantes de ingreso. | S |
| `FeDetReq` | Información del detalle del comprobante o lote de comprobantes de ingreso. | S |

---

## 📌 Cabecera del Comprobante – `FeCabReq`

| Campo     | Tipo   | Detalle                                                                 | Obligatorio |
|-----------|--------|-------------------------------------------------------------------------|-------------|
| `CantReg` | Int(4) | Cantidad de registros del detalle del comprobante o lote de comprobantes de ingreso. | S |
| `CbteTipo`| Int(3) | Tipo de comprobante informado. Si se informa más de uno, todos deben ser del mismo tipo. | S |
| `PtoVta`  | Int(4) | Punto de venta del comprobante. Si se informan varios, deben corresponder al mismo punto de venta. | S |

---

## 📌 Detalle del Comprobante – `FeDetReq`

| Campo        | Tipo        | Detalle                                                                                          | Obligatorio |
|--------------|-------------|--------------------------------------------------------------------------------------------------|-------------|
| `Concepto`   | Int(2)      | Concepto del comprobante. Valores permitidos: 1=Productos, 2=Servicios, 3=Productos y Servicios. | S |
| `DocTipo`    | Int(2)      | Código de documento del comprador. Ej: 80=CUIT, 96=DNI, 99=Consumidor Final.                     | S |
| `DocNro`     | Long(11)    | Número de identificación del comprador.                                                          | S |
| `CbteDesde`  | Long(8)     | Nro. de comprobante desde. Rango 1 – 99999999.                                                   | S |
| `CbteHasta`  | Long(8)     | Nro. de comprobante hasta. Rango 1 – 99999999.                                                   | S |
| `CbteFch`    | String(8)   | Fecha del comprobante (yyyyMMdd). Para concepto=1: hasta 5 días anteriores/posteriores. Para 2 o 3: hasta 10 días. Si no se envía, se asigna la fecha de proceso. | N |
| `ImpTotal`   | Double(13+2)| Importe total del comprobante. Fórmula: Importe no gravado + Importe exento + Importe neto gravado + IVA + tributos. | S |
| `ImpTotConc` | Double(13+2)| Importe neto no gravado. ≤ ImpTotal y ≥ 0. Para comprobantes tipo C debe ser = 0. Para Bienes Usados – Emisor Monotributista, corresponde al subtotal. | S |
| `ImpNeto`    | Double(13+2)| Importe neto gravado. ≤ ImpTotal y ≥ 0. Para comprobantes tipo C corresponde al Subtotal. Para Bienes Usados – Monotributista: no debe informarse o debe ser = 0. | S |
| `ImpOpEx`    | Double(13+2)| Importe exento. ≤ ImpTotal y ≥ 0. Para comprobantes tipo C debe ser = 0. Para Bienes Usados – Monotributista: no debe informarse o debe ser = 0. | S |
| `ImpIVA`     | Double(13+2)| Suma de importes de IVA. Para comprobantes tipo C debe ser = 0. Para Bienes Usados – Monotributista: no debe informarse o debe ser = 0. | S |
| `ImpTrib`    | Double(13+2)| Suma de los importes de tributos.                                                                | S |
| `FchServDesde` | String(8) | Fecha inicio servicio. Obligatorio si concepto=2 o 3.                                            | N |
| `FchServHasta` | String(8) | Fecha fin servicio. Obligatorio si concepto=2 o 3. No menor a `FchServDesde`.                   | N |
| `FchVtoPago`   | String(8) | Fecha de vencimiento de pago. Obligatorio si concepto=2 o 3. Posterior a `CbteFch`.             | N |
| `MonId`        | String(3) | Código de moneda (ej: PES). Consultar método `FEParamGetTiposMonedas`.                          | S |
| `MonCotiz`     | Double(4+6)| Cotización de la moneda. Para PES debe ser 1.                                                   | S |
| `CbtesAsoc`    | Array      | Comprobantes asociados.                                                                         | N |
| `Tributos`     | Array      | Tributos asociados al comprobante.                                                              | N |
| `IVA`          | Array      | Alícuotas e importes de IVA asociados. Para comprobantes tipo C y Bienes Usados – Monotributista no debe informarse. | N |
| `Opcionales`   | Array      | Campos auxiliares reservados para usos futuros.                                                 | N |

---

## 📌 Comprobantes Asociados – `CbtesAsoc`

| Campo | Tipo     | Detalle                                                               | Obligatorio |
|-------|----------|-----------------------------------------------------------------------|-------------|
| `Tipo`| Int(3)   | Código de tipo de comprobante. Consultar `FEParamGetTiposCbte`.       | S |
| `PtoVta` | Int(4)| Punto de venta.                                                       | S |
| `Nro` | Long(8)  | Número de comprobante.                                                | S |
| `Cuit`| String(11)| CUIT emisor del comprobante.                                         | N |

---

## 📌 Tributos – `Tributo`

| Campo   | Tipo         | Detalle                                                          | Obligatorio |
|---------|--------------|------------------------------------------------------------------|-------------|
| `Id`    | Int(2)       | Código tributo. Consultar `FEParamGetTiposTributos`.             | S |
| `Desc`  | String(80)   | Descripción del tributo.                                         | N |
| `BaseImp`| Double(13+2)| Base imponible del tributo.                                      | S |
| `Alic`  | Double(3+2)  | Alícuota.                                                       | S |
| `Importe`| Double(13+2)| Importe del tributo.                                            | S |

---

## 📌 IVA – `AlicIva`

| Campo   | Tipo         | Detalle                                                          | Obligatorio |
|---------|--------------|------------------------------------------------------------------|-------------|
| `Id`    | Int(2)       | Código de tipo de IVA. Consultar `FEParamGetTiposIva`.           | S |
| `BaseImp`| Double(13+2)| Base imponible para la determinación del IVA.                    | S |
| `Importe`| Double(13+2)| Importe del IVA. Para comprobantes tipo C debe ser = 0.          | S |

