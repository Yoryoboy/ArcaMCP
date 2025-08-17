# 🏗️ Arquitectura MCP para Sistema de Facturación AFIP

## 📋 Índice
1. [Introducción](#introducción)
2. [Estructura de Carpetas](#estructura-de-carpetas)
3. [Principios de Arquitectura](#principios-de-arquitectura)
4. [Implementación Paso a Paso](#implementación-paso-a-paso)
5. [Ventajas de la Arquitectura](#ventajas-de-la-arquitectura)
6. [Cómo Implementar](#cómo-implementar)
7. [Consejos Específicos](#consejos-específicos)
8. [Checklist de Implementación](#checklist-de-implementación)
9. [Migración STDIO → SSE](#migración-stdio--sse)

---

## 📖 Introducción

Esta documentación describe la arquitectura ideal para desarrollar un MCP (Model Context Protocol) server que integre con el sistema de facturación AFIP/ARCA de Argentina. El objetivo es crear un código organizado, mantenible y escalable que evite el "código espagueti".

### 🎯 Objetivos del Proyecto
- **Automatizar facturación**: Generar facturas vía API de AFIP
- **Interfaz conversacional**: Usar agentes AI para interactuar
- **Desarrollo local**: Usar STDIO para desarrollo, SSE para producción
- **Código limpio**: Arquitectura modular y bien organizada

---

## 📁 Estructura de Carpetas

```
src/
├── core/                    # Lógica central del MCP
│   ├── server.ts           # Configuración del servidor MCP
│   └── types.ts            # Tipos compartidos
├── services/               # Servicios externos (APIs)
│   ├── afip/
│   │   ├── client.ts       # Cliente AFIP
│   │   ├── auth.ts         # Autenticación con certificados
│   │   └── types.ts        # Tipos específicos de AFIP
├── tools/                  # Herramientas MCP organizadas por dominio
│   ├── invoicing/
│   │   ├── generate.ts     # Generar facturas
│   │   ├── query.ts        # Consultar facturas
│   │   └── list.ts         # Listar facturas
├── utils/                  # Utilidades compartidas
│   ├── validation.ts       # Validaciones
│   ├── formatting.ts       # Formateo de datos
│   └── errors.ts           # Manejo de errores
├── config/                 # Configuración
│   ├── afip.ts            # Config de AFIP
│   └── environment.ts      # Variables de entorno
└── index.ts               # Punto de entrada
```

### 📂 Descripción de Carpetas

| Carpeta | Propósito | Ejemplos |
|---------|-----------|----------|
| `core/` | Tipos y lógica central del MCP | Interfaces, tipos base |
| `services/` | Comunicación con APIs externas | Cliente AFIP, autenticación |
| `tools/` | Herramientas MCP específicas | Generar facturas, consultas |
| `utils/` | Utilidades reutilizables | Validaciones, formateo |
| `config/` | Configuración del sistema | Credenciales, parámetros |

---

## 🎯 Principios de Arquitectura

### 1. **Separación de Responsabilidades (SRP)**
Cada módulo tiene una responsabilidad específica y bien definida.

```typescript
// ✅ Correcto: Cada clase tiene una responsabilidad
class AFIPClient {
  // Solo maneja comunicación con AFIP
}

class FacturaValidator {
  // Solo maneja validaciones
}

class GenerateInvoiceTool {
  // Solo maneja la herramienta MCP de generación
}
```

### 2. **Inversión de Dependencias (DIP)**
Las herramientas dependen de abstracciones, no de implementaciones concretas.

```typescript
// ✅ La herramienta recibe el cliente como dependencia
export class GenerateInvoiceTool {
  constructor(private afipClient: AFIPClient) {}
}
```

### 3. **Principio Abierto/Cerrado (OCP)**
Fácil de extender sin modificar código existente.

```typescript
// ✅ Agregar nueva herramienta sin tocar las existentes
src/tools/invoicing/cancel.ts     // Nueva funcionalidad
src/tools/clients/manage.ts       // Nuevo dominio
```

### 4. **Reutilización de Código**
Componentes compartidos entre múltiples herramientas.

```typescript
// ✅ Validaciones reutilizables
FacturaValidator.validarCUIT(cuit);
FacturaValidator.validarCliente(cliente);
```

---

## 🔧 Implementación Paso a Paso

### **Paso 1: Tipos Centrales** (`core/types.ts`)

```typescript
// Tipos centrales para el MCP
export interface MCPResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
}

export interface Cliente {
  nombre: string;
  documento: string;
  tipoDocumento: "CUIT" | "DNI";
  email?: string;
  direccion?: string;
}

export interface Factura {
  id?: string;
  numero?: number;
  tipo: "A" | "B" | "C";
  puntoVenta: number;
  fecha: string;
  cliente: Cliente;
  conceptos: ConceptoFactura[];
  totales: {
    subtotal: number;
    iva: number;
    total: number;
  };
  cae?: string;
  vencimientoCAE?: string;
  estado?: "Pendiente" | "Aprobada" | "Rechazada";
}
```

### **Paso 2: Validaciones** (`utils/validation.ts`)

```typescript
export class FacturaValidator {
  // Validar CUIT argentino con algoritmo oficial
  static validarCUIT(cuit: string): boolean {
    const cuitLimpio = cuit.replace(/[-\s]/g, '');
    if (cuitLimpio.length !== 11) return false;
    
    const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    
    for (let i = 0; i < 10; i++) {
      suma += parseInt(cuitLimpio[i]) * multiplicadores[i];
    }
    
    const resto = suma % 11;
    const digitoVerificador = resto < 2 ? resto : 11 - resto;
    
    return parseInt(cuitLimpio[10]) === digitoVerificador;
  }

  // Validaciones específicas para Argentina
  static validarDNI(dni: string): boolean {
    const dniLimpio = dni.replace(/[.\s]/g, '');
    return /^\d{7,8}$/.test(dniLimpio);
  }
}
```

### **Paso 3: Cliente AFIP** (`services/afip/client.ts`)

```typescript
export class AFIPClient {
  private config: ConfiguracionAFIP;
  private token?: string;
  private tokenExpiry?: Date;

  constructor(config: ConfiguracionAFIP) {
    this.config = config;
  }

  // Autenticación con certificados digitales
  private async authenticate(): Promise<string> {
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }

    // Implementar autenticación real con certificados
    this.token = await this.obtenerTokenAFIP();
    this.tokenExpiry = new Date(Date.now() + 12 * 60 * 60 * 1000);
    
    return this.token;
  }

  // Generar factura en AFIP
  async generarFactura(factura: Factura): Promise<AFIPResponse> {
    await this.authenticate();
    const request = this.mapearFacturaAFIP(factura);
    return await this.llamarWebService('FECAESolicitar', request);
  }
}
```

### **Paso 4: Herramientas MCP** (`tools/invoicing/generate.ts`)

```typescript
export class GenerateInvoiceTool {
  constructor(private afipClient: AFIPClient) {}

  static readonly schema = {
    cliente: z.object({
      nombre: z.string().describe("Nombre del cliente"),
      documento: z.string().describe("CUIT o DNI del cliente"),
      tipoDocumento: z.enum(["CUIT", "DNI"])
    }),
    conceptos: z.array(z.object({
      descripcion: z.string().describe("Descripción del servicio/producto"),
      cantidad: z.number().positive(),
      precioUnitario: z.number().positive()
    })).min(1),
    tipoFactura: z.enum(["A", "B", "C"]),
    puntoVenta: z.number().default(1)
  };

  async execute(params: any): Promise<MCPResponse> {
    try {
      // 1. Validaciones
      this.validarParametros(params);

      // 2. Calcular totales
      const factura = this.construirFactura(params);

      // 3. Generar en AFIP
      const resultado = await this.afipClient.generarFactura(factura);

      // 4. Formatear respuesta
      return this.formatearRespuesta(factura, resultado);

    } catch (error) {
      return this.formatearError(error);
    }
  }
}
```

---

## 🚀 Ventajas de la Arquitectura

### ✅ **Escalabilidad**

**Agregar nuevas funcionalidades es trivial:**

```typescript
// Nueva herramienta: Anular facturas
src/tools/invoicing/cancel.ts

// Nuevo dominio: Gestión de clientes
src/tools/clients/create.ts
src/tools/clients/update.ts
src/tools/clients/list.ts

// Nuevos reportes
src/tools/reports/monthly.ts
src/tools/reports/annual.ts
```

### ✅ **Mantenibilidad**

**Cambios localizados:**

| Cambio Requerido | Archivo a Modificar | Impacto |
|------------------|---------------------|---------|
| Bug en validación CUIT | `utils/validation.ts` | Mínimo |
| Cambio en API AFIP | `services/afip/client.ts` | Aislado |
| Nueva herramienta MCP | `tools/nueva/herramienta.ts` | Ninguno |
| Cambio en formato respuesta | Herramienta específica | Local |

### ✅ **Testabilidad**

**Cada componente se puede testear independientemente:**

```typescript
// Test de validaciones
describe('FacturaValidator', () => {
  it('should validate CUIT correctly', () => {
    expect(FacturaValidator.validarCUIT('20-12345678-9')).toBe(true);
  });
});

// Test de cliente AFIP (con mock)
describe('AFIPClient', () => {
  it('should generate invoice', async () => {
    const mockConfig = { /* config de test */ };
    const client = new AFIPClient(mockConfig);
    const result = await client.generarFactura(mockFactura);
    expect(result.success).toBe(true);
  });
});

// Test de herramienta MCP
describe('GenerateInvoiceTool', () => {
  it('should execute successfully', async () => {
    const mockClient = new MockAFIPClient();
    const tool = new GenerateInvoiceTool(mockClient);
    const result = await tool.execute(validParams);
    expect(result.content[0].text).toContain('✅');
  });
});
```

---

## 🛠️ Cómo Implementar

### **Paso 1: Configurar Estructura**

```cmd
# Crear estructura de carpetas
mkdir src\core src\services\afip src\tools\invoicing src\utils src\config

# Instalar dependencias
pnpm add zod @modelcontextprotocol/sdk
pnpm add -D @types/node typescript tsx
```

### **Paso 2: Implementar por Capas**

**Orden recomendado:**

1. **Tipos base** (`core/types.ts`) ← Empezar aquí
2. **Validaciones** (`utils/validation.ts`)
3. **Cliente AFIP** (`services/afip/client.ts`)
4. **Herramientas MCP** (`tools/invoicing/generate.ts`)
5. **Servidor principal** (`index.ts`)

### **Paso 3: Configuración**

```typescript
// config/afip.ts
export const afipConfig = {
  cuit: process.env.AFIP_CUIT!,
  certificadoPath: process.env.AFIP_CERT_PATH!,
  privateKeyPath: process.env.AFIP_PRIVATE_KEY_PATH!,
  production: process.env.NODE_ENV === 'production',
  puntoVentaDefault: parseInt(process.env.AFIP_PUNTO_VENTA || '1')
};
```

### **Paso 4: Integración**

```typescript
// index.ts - Servidor STDIO
import { GenerateInvoiceTool } from './tools/invoicing/generate.js';
import { AFIPClient } from './services/afip/client.js';
import { afipConfig } from './config/afip.js';

const afipClient = new AFIPClient(afipConfig);
const generateTool = new GenerateInvoiceTool(afipClient);

// Registrar herramientas en el servidor MCP
server.tool(
  "generarFactura",
  "Generar una nueva factura en AFIP",
  GenerateInvoiceTool.schema,
  async (params) => await generateTool.execute(params)
);
```

---

## 💡 Consejos Específicos

### 🔐 **Seguridad**

```typescript
// ✅ Variables de entorno para credenciales
const config = {
  cuit: process.env.AFIP_CUIT!,
  certificado: process.env.AFIP_CERT_PATH!,
  // ❌ NUNCA hardcodear credenciales
};

// ✅ Validación de certificados
if (!fs.existsSync(config.certificado)) {
  throw new Error('Certificado AFIP no encontrado');
}
```

### 📝 **Logging Estructurado**

```typescript
// utils/logger.ts
export const logger = {
  info: (msg: string, data?: any) => 
    console.log(`[${new Date().toISOString()}] [INFO] ${msg}`, data || ''),
  
  error: (msg: string, error?: any) => 
    console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`, error || ''),
  
  debug: (msg: string, data?: any) => 
    process.env.NODE_ENV === 'development' && 
    console.debug(`[${new Date().toISOString()}] [DEBUG] ${msg}`, data || '')
};
```

### 🔄 **Manejo de Errores**

```typescript
// utils/errors.ts
export class AFIPError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AFIPError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### 🧪 **Configuración de Testing**

```typescript
// config/test.ts
export const testConfig = {
  cuit: '20-12345678-9',
  certificado: './test/fixtures/test-cert.pem',
  privateKey: './test/fixtures/test-key.pem',
  production: false,
  puntoVentaDefault: 1
};
```

### 📊 **Monitoreo y Métricas**

```typescript
// utils/metrics.ts
export class Metrics {
  private static counters = new Map<string, number>();

  static increment(metric: string) {
    const current = this.counters.get(metric) || 0;
    this.counters.set(metric, current + 1);
  }

  static getStats() {
    return Object.fromEntries(this.counters);
  }
}

// Uso en herramientas
Metrics.increment('facturas_generadas');
Metrics.increment('errores_afip');
```

---

## ✅ Checklist de Implementación

### **📋 Fase 1: Fundación**
- [ ] **Estructura de carpetas** creada
- [ ] **Tipos centrales** definidos (`core/types.ts`)
- [ ] **Validaciones básicas** implementadas (`utils/validation.ts`)
- [ ] **Manejo de errores** configurado (`utils/errors.ts`)
- [ ] **Configuración** organizada (`config/`)

### **📋 Fase 2: Servicios**
- [ ] **Cliente AFIP** implementado (`services/afip/client.ts`)
- [ ] **Autenticación** con certificados configurada
- [ ] **Mapeo de datos** AFIP implementado
- [ ] **Manejo de respuestas** AFIP configurado
- [ ] **Testing de servicios** implementado

### **📋 Fase 3: Herramientas MCP**
- [ ] **Generar facturas** (`tools/invoicing/generate.ts`)
- [ ] **Consultar facturas** (`tools/invoicing/query.ts`)
- [ ] **Listar facturas** (`tools/invoicing/list.ts`)
- [ ] **Schemas de validación** definidos
- [ ] **Formateo de respuestas** implementado

### **📋 Fase 4: Integración**
- [ ] **Servidor STDIO** configurado
- [ ] **Herramientas registradas** en MCP
- [ ] **Variables de entorno** configuradas
- [ ] **Logging** implementado
- [ ] **Testing end-to-end** funcionando

### **📋 Fase 5: Producción**
- [ ] **Certificados AFIP** configurados
- [ ] **Ambiente de testing** AFIP configurado
- [ ] **Migración SSE** preparada
- [ ] **Documentación** completa
- [ ] **Monitoreo** implementado

---

## 🔄 Migración STDIO → SSE

### **Ventajas de Empezar con STDIO**

| Aspecto | STDIO | SSE |
|---------|-------|-----|
| **Setup** | Cero configuración | Requiere servidor |
| **Desarrollo** | Instantáneo | Requiere `pnpm run dev` |
| **Debugging** | Directo | A través de HTTP |
| **Testing** | Simple | Más complejo |

### **Cuándo Migrar a SSE**

**Migrar cuando:**
- ✅ Quieras compartir con otros
- ✅ Necesites acceso remoto
- ✅ Quieras deploy en Cloudflare Workers
- ✅ Requieras persistencia en la nube

### **Proceso de Migración**

**La migración es trivial con esta arquitectura:**

```typescript
// STDIO (desarrollo)
const afipClient = new AFIPClient(localConfig);
const generateTool = new GenerateInvoiceTool(afipClient);

// SSE (producción) - MISMO CÓDIGO
export class MyMCP extends McpAgent {
  async init() {
    const afipClient = new AFIPClient((this as any).env);
    const generateTool = new GenerateInvoiceTool(afipClient);
    
    this.server.tool(
      "generarFactura",
      "Generar factura",
      GenerateInvoiceTool.schema,
      generateTool.execute.bind(generateTool)
    );
  }
}
```

### **Configuración MCP**

**STDIO (desarrollo):**
```json
{
  "mcpServers": {
    "afip-invoicing": {
      "command": "npx",
      "args": ["tsx", "d:/github/my-mcp-server/src/stdio-server.ts"],
      "env": {}
    }
  }
}
```

**SSE (producción):**
```json
{
  "mcpServers": {
    "afip-invoicing": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-fetch", "https://tu-worker.workers.dev/mcp"],
      "env": {}
    }
  }
}
```

---

## 🎯 Resultado Final

Con esta arquitectura tendrás:

### **🚀 Para Desarrollo**
- **Código organizado** sin espagueti
- **Desarrollo rápido** con STDIO
- **Testing fácil** de cada componente
- **Debugging simple** sin complejidad de red

### **🌐 Para Producción**
- **Migración trivial** a SSE
- **Deploy en Cloudflare Workers**
- **Escalabilidad** para múltiples usuarios
- **Persistencia** en la nube

### **🛠️ Para Mantenimiento**
- **Cambios localizados** sin efectos secundarios
- **Nuevas funcionalidades** sin tocar código existente
- **Testing independiente** de cada módulo
- **Documentación clara** de cada componente

### **💼 Para el Negocio**
- **Facturación automatizada** vía conversación
- **Cumplimiento AFIP** automático
- **Ahorro de tiempo** significativo
- **Reducción de errores** manuales

---

## 📚 Recursos Adicionales

### **Documentación AFIP**
- [Web Services AFIP](https://www.afip.gob.ar/ws/)
- [Facturación Electrónica](https://www.afip.gob.ar/facturacionalectronica/)
- [Certificados Digitales](https://www.afip.gob.ar/certificados/)

### **Herramientas Recomendadas**
- **pnpm**: Gestor de paquetes (preferencia del usuario)
- **tsx**: Ejecutor TypeScript
- **zod**: Validación de schemas
- **@modelcontextprotocol/sdk**: SDK oficial MCP

### **Testing**
- **Jest**: Framework de testing
- **Supertest**: Testing de APIs
- **MSW**: Mocking de servicios externos

---

*Esta arquitectura está diseñada específicamente para el desarrollo de un MCP de facturación AFIP, siguiendo las mejores prácticas de desarrollo y las preferencias del usuario (pnpm, cmd, desarrollo local con STDIO).*
