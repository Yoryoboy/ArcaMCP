# 📋 Guía Completa de Facturación Electrónica AFIP

Esta guía explica los conceptos fundamentales de la facturación electrónica en Argentina y cómo utilizar correctamente las herramientas MCP para emitir comprobantes.

---

## 📚 Glosario de Términos AFIP

### **CAE (Código de Autorización Electrónica)**
Código único de 14 dígitos que AFIP asigna a cada comprobante electrónico válido. Es la "firma digital" que autoriza legalmente el comprobante. Sin CAE, la factura no tiene validez fiscal.

**Ejemplo:** `70123456789012`

### **WSFEv1 (Web Service de Facturación Electrónica v1)**
Servicio web oficial de AFIP para emitir comprobantes electrónicos. Es la API que utilizan los sistemas de facturación para comunicarse con AFIP.

### **Punto de Venta**
Número que identifica el lugar físico o virtual desde donde se emiten los comprobantes. Cada empresa puede tener múltiples puntos de venta.

**Ejemplo:** Punto de venta `0001` para sucursal principal, `0002` para sucursal norte.

### **Tipo de Comprobante**
Código numérico que identifica el tipo de documento fiscal:
- **Tipo 1**: Factura A
- **Tipo 6**: Factura B  
- **Tipo 11**: Factura C
- **Tipo 3**: Nota de Crédito A
- Y muchos más...

### **Concepto**
Indica qué tipo de operación representa el comprobante:
- **1**: Productos (bienes físicos)
- **2**: Servicios 
- **3**: Productos y Servicios

### **Monotributista**
Régimen fiscal simplificado en Argentina. Los monotributistas emiten principalmente Facturas C y tienen restricciones específicas (ej: no pueden discriminar IVA).

---

## 🔄 Diferencias entre Métodos de Emisión

### **`create_next_voucher` - Numeración Automática (Recomendado)**

**¿Qué hace?**
AFIP asigna automáticamente el siguiente número de comprobante disponible.

**¿Cuándo usarlo?**
- ✅ Facturación normal del día a día
- ✅ Cuando no necesitas un número específico
- ✅ Para evitar errores de numeración
- ✅ Flujo simple y seguro

**Ventajas:**
- Sin riesgo de números duplicados
- AFIP garantiza la secuencia correcta
- Menos parámetros requeridos
- Ideal para automatización

**Campos NO requeridos:**
- `CantReg` (cantidad de registros)
- `CbteDesde` (número desde)
- `CbteHasta` (número hasta)

---

### **`create_voucher` - Control Manual de Numeración**

**¿Qué hace?**
Tú especificas exactamente qué número(s) de comprobante quieres usar.

**¿Cuándo usarlo?**
- ⚠️ Recuperación de errores (reenviar un comprobante fallido)
- ⚠️ Emisión de lotes masivos
- ⚠️ Sincronización con sistemas externos
- ⚠️ Casos especiales que requieren control preciso

**Ventajas:**
- Control total sobre la numeración
- Permite emisión en lotes
- Útil para recuperación de errores
- Opción de respuesta completa del WS

**Campos adicionales requeridos:**
- `CantReg`: Cantidad de comprobantes a emitir
- `CbteDesde`: Número de comprobante inicial
- `CbteHasta`: Número de comprobante final
- `fullResponse`: (Opcional) Respuesta completa de AFIP

---

## 🎯 Ejemplos de Uso

### **Escenario 1: Facturación Normal**
```
Situación: Emitir una factura C por servicios de consultoría
Método: create_next_voucher
Razón: Flujo normal, queremos el siguiente número disponible
```

### **Escenario 2: Error de Conexión**
```
Situación: Falló la emisión del comprobante #150 por problemas de red
Método: create_voucher (CbteDesde: 150, CbteHasta: 150)
Razón: Necesitamos reenviar exactamente el mismo número
```

### **Escenario 3: Migración de Sistema**
```
Situación: Migrar 100 facturas desde otro sistema
Método: create_voucher (CbteDesde: 200, CbteHasta: 299)
Razón: Necesitamos mantener la numeración específica
```

---

## 🤖 Prompts para IA - Elección del Método Correcto

### **Para `create_next_voucher` (Casos Normales)**

```
"Necesito emitir una factura C por $15,000 por servicios de desarrollo web 
del 1 al 15 de agosto, con vencimiento el 30 de agosto. Cliente consumidor final."
```

```
"Quiero facturar productos vendidos hoy por $8,500. Es una factura B para 
un cliente con CUIT 20-12345678-9."
```

### **Para `create_voucher` (Casos Especiales)**

```
"Necesito reenviar la factura #1250 que falló por problemas de conexión. 
Los datos son los mismos pero debo usar exactamente ese número."
```

```
"Tengo que emitir 50 facturas consecutivas desde el número 2000 al 2049 
para migrar datos de mi sistema anterior."
```

```
"Quiero emitir la factura #3500 específicamente y necesito la respuesta 
completa de AFIP para auditoría."
```

---

## ⚡ Guía de Decisión Rápida

### **¿Qué método usar?**

```
¿Es facturación normal del día a día?
├─ SÍ → create_next_voucher ✅
└─ NO → ¿Necesitas un número específico?
    ├─ SÍ → create_voucher ⚠️
    └─ NO → create_next_voucher ✅
```

### **Indicadores para `create_voucher`:**
- Mencionas números específicos
- Hablas de "reenviar" o "reintentar"
- Necesitas "lotes" o "rangos" de facturas
- Requieres "respuesta completa" de AFIP
- Migración o sincronización de sistemas

### **Indicadores para `create_next_voucher`:**
- "Nueva factura"
- "Siguiente comprobante"
- "Facturación normal"
- No mencionas números específicos
- Flujo estándar de negocio

---

## 🚨 Errores Comunes y Soluciones

### **Error 10071: "Para comprobantes tipo C el objeto IVA no debe informarse"**
**Causa:** Enviaste arrays vacíos de IVA en facturas C
**Solución:** El sistema automáticamente filtra arrays vacíos

### **Error de numeración duplicada**
**Causa:** Intentaste usar un número ya utilizado con `create_voucher`
**Solución:** Usa `create_next_voucher` o verifica el último número con `ultimo_comprobante_creado`

### **Error de validación de fechas**
**Causa:** Fechas fuera del rango permitido por AFIP
**Solución:** 
- Productos: ±5 días de la fecha actual
- Servicios: ±10 días de la fecha actual

---

## 📋 Checklist Pre-Emisión

Antes de emitir cualquier comprobante, verifica:

- [ ] **Tipo de comprobante correcto** (A, B, C según el cliente)
- [ ] **Concepto apropiado** (1=Productos, 2=Servicios, 3=Mixto)
- [ ] **Importes calculados correctamente** (Total = Neto + IVA + Tributos)
- [ ] **Fechas dentro del rango permitido**
- [ ] **Datos del cliente completos** (CUIT/DNI, condición IVA)
- [ ] **Método de emisión apropiado** (next_voucher vs voucher)

---

## 🔍 Herramientas de Consulta

### **`ultimo_comprobante_creado`**
Consulta el último número de comprobante emitido para un punto de venta y tipo específico.

**Uso:** Verificar numeración antes de usar `create_voucher`

```
Parámetros:
- puntoDeVenta: 1
- tipoDeComprobante: 11 (Factura C)
```

---

## 💡 Mejores Prácticas

1. **Usa `create_next_voucher` por defecto** - Es más seguro y simple
2. **Reserva `create_voucher` para casos especiales** - Solo cuando necesites control manual
3. **Siempre valida los importes** - AFIP es estricto con los cálculos
4. **Mantén registros locales** - Guarda CAE y números para auditorías
5. **Maneja errores apropiadamente** - Implementa reintentos para fallos de red
6. **Respeta los rangos de fechas** - AFIP rechaza fechas muy antiguas o futuras

---

Esta guía te ayudará a entender y utilizar correctamente el sistema de facturación electrónica AFIP a través de las herramientas MCP disponibles.
