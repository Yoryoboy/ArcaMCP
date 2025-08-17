# Técnica para obtener facturación en un rango de fechas con AFIP (WSFEv1)

En el **WSFEv1 de AFIP** no existe un método que permita obtener directamente todos los comprobantes emitidos entre dos fechas.  
La técnica oficial consiste en apoyarse en dos métodos:

- **`FECompUltimoAutorizado`** → devuelve el último comprobante emitido.
- **`FECompConsultar`** → devuelve la información de un comprobante puntual (por número).

---

## 🧩 Técnica básica (paso a paso)

1. **Consultar el último comprobante autorizado** con `FECompUltimoAutorizado`.

   - Ejemplo: el último comprobante es el **350**.

2. **Iterar desde el primero hasta el último comprobante** con `FECompConsultar`.

   - Para cada comprobante, leer fecha (`CbteFch`) e importe (`ImpTotal`).
   - Si la fecha está dentro del rango pedido, sumar el importe.

3. **Resultado**: suma total de importes del rango.

⚠️ Problema: si tenés miles de comprobantes, la consulta uno por uno es muy lenta.

---

## ⚡ Necesidad de optimización

- **Motivo**: AFIP no permite pedir comprobantes en lote ni por rango de fechas.
- **Problema**: muchas llamadas innecesarias y tiempo de espera alto.

---

## 🛠️ Optimización paso a paso

### Paso A. Encontrar el primer comprobante en rango (Búsqueda binaria)

- Los comprobantes son **secuenciales**: números bajos = más viejos, números altos = más recientes.
- Con una **búsqueda binaria**:
  - Consultás un comprobante intermedio (ej: nº 175).
  - Si su fecha es más vieja que el rango → buscás más adelante.
  - Si su fecha es más nueva → buscás más atrás.
- Así encontrás el **primer número válido del rango** sin consultar todo desde el 1.

### Paso B. Batching (consultas en paralelo)

- En lugar de consultar 1 comprobante por vez, agrupás en **lotes** (ej: 20 o 50 comprobantes).
- Usás `Promise.all` (o equivalente) para lanzar las requests en paralelo.
- Esto reduce mucho el tiempo total.
- ⚠️ No conviene lanzar miles de requests de golpe (AFIP puede bloquearte). Mejor en lotes moderados.

### Paso C. Base de datos local (nivel pro)

- Guardar cada comprobante cuando lo emitís.
- Así, para reportes, consultás tu DB en vez de AFIP.
- AFIP se usa solo como respaldo o validación.

---

## 🚀 Ejemplo de flujo optimizado

1. Usar `FECompUltimoAutorizado` para conocer el número máximo (ej: 350).
2. Hacer búsqueda binaria para encontrar el primer comprobante dentro del rango (ej: nº 280).
3. Iterar desde 280 hasta 350, en lotes de 20 consultas paralelas.
4. Para cada comprobante en rango, sumar el `ImpTotal`.
5. Devolver el total acumulado.

---

### 📝 Ejemplo de código

```javascript
async function getFacturadoEnRangoOptimizado(
  ptoVta: number,
  cbteTipo: number,
  fechaDesde: Date,
  fechaHasta: Date
): Promise<number> {
  // 1. Preguntar último comprobante
  const last = await afip.ElectronicBilling.FECompUltimoAutorizado({
    PtoVta: ptoVta,
    CbteTipo: cbteTipo,
  });
  const ultimoNro = last.CbteNro;

  // 2. Buscar el primer número válido usando búsqueda binaria
  let inicio = 1;
  let fin = ultimoNro;
  let primerEnRango = ultimoNro;

  while (inicio <= fin) {
    const medio = Math.floor((inicio + fin) / 2);

    const data = await afip.ElectronicBilling.FECompConsultar({
      PtoVta: ptoVta,
      CbteTipo: cbteTipo,
      CbteNro: medio,
    });

    if (!data?.FeDetResp?.[0]) break;
    const fecha = data.FeDetResp[0].CbteFch;

    if (fecha < formatDate(fechaDesde)) {
      // Todavía muy viejo, avanzar
      inicio = medio + 1;
    } else {
      // Este ya está en rango o más adelante
      primerEnRango = medio;
      fin = medio - 1;
    }
  }

  // 3. Iterar en batches desde primerEnRango hasta ultimoNro
  const batchSize = 20;
  let total = 0;

  for (let i = primerEnRango; i <= ultimoNro; i += batchSize) {
    const promises = [];
    for (let j = i; j < i + batchSize && j <= ultimoNro; j++) {
      promises.push(
        afip.ElectronicBilling.FECompConsultar({
          PtoVta: ptoVta,
          CbteTipo: cbteTipo,
          CbteNro: j,
        })
      );
    }

    const results = await Promise.all(promises);

    for (const r of results) {
      const det = r?.FeDetResp?.[0];
      if (!det) continue;

      const fecha = det.CbteFch;
      if (fecha >= formatDate(fechaDesde) && fecha <= formatDate(fechaHasta)) {
        total += det.ImpTotal;
      }
    }
  }

  return total;
}
```

## 🎯 Resumen

- **Técnica básica**: uno por uno → funciona, pero lento.
- **Optimización**:
  - Búsqueda binaria = reducir consultas innecesarias.
  - Batching = acelerar consultas en paralelo.
- **Mejor práctica**: guardar comprobantes en tu DB desde el inicio.
