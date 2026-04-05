[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/yoryoboy-arcamcp-badge.png)](https://mseep.ai/app/yoryoboy-arcamcp)

# ARCA MCP (Model Context Protocol) para AFIP/ARCA

Este proyecto implementa un servidor MCP (Model Context Protocol) orientado a integrarse con AFIP (Argentina) y automatizar tareas claves del flujo de facturación electrónica y consulta de padrones. Aprovecha la SDK oficial de AFIP (`@afipsdk/afip.js`) y automatizaciones para:

- Generar y gestionar certificados X.509 (dev y producción).
- Autorizar Web Services (ej. `wsfe`, `ws_sr_padron_a13`).
- Interactuar con servicios AFIP para emisión y consulta de comprobantes.
- Estandarizar configuraciones, variables de entorno y rutas de certificados.

Además, incluye scripts en `scripts/` que automatizan pasos críticos de onboarding en AFIP, reduciendo tiempos de configuración y posibles errores manuales.

## Requisitos

- Node.js 18 LTS o superior (recomendado 20+)
- npm 9+ o pnpm/yarn equivalente
- Acceso a tu CUIT y a tu cuenta de AFIP
- Clave Fiscal nivel 3 o superior
- (Opcional pero recomendado) Git para clonar el repositorio

## Instalación rápida

1. Clona el repositorio y entra al directorio del proyecto.
2. Instala dependencias:
   - Windows PowerShell/CMD:
     ```bash
     npm install
     ```
3. Copia/crea un archivo `.env` en la raíz con las variables necesarias (ver sección Configuración).
4. (Opcional) Inspecciona el servidor MCP con el Inspector:
   ```bash
   npm run inspector
   ```

## Configuración (.env)

El archivo `src/config.ts` lee las siguientes variables de entorno:

- `AFIP_CUIT` (obligatorio): CUIT del contribuyente.
- `AFIP_PASSWORD` (obligatorio): contraseña asociada para automatizaciones (AFIP).
- `AFIP_CERT_ALIAS` (obligatorio): alias que usarán las automatizaciones de certificados.
- `AFIP_DEV_CERT_PATH` (obligatorio): ruta absoluta o relativa al certificado `.crt` de desarrollo.
- `AFIP_DEV_KEY_PATH` (obligatorio): ruta al `.key` de desarrollo.
- `AFIP_PROD_CERT_PATH` (obligatorio): ruta al certificado `.crt` de producción.
- `AFIP_PROD_KEY_PATH` (obligatorio): ruta al `.key` de producción.
- `AFIP_PRODUCTION` (obligatorio): `true` para producción, `false` para homologación/dev.
- `AFIP_SDK_ACCESS_TOKEN` (obligatorio en producción): token de acceso de la SDK si corresponde.

Ejemplo de `.env` (plantilla):

```ini
# Identidad
AFIP_CUIT=20123456789
AFIP_PASSWORD=tu_password_afip
AFIP_CERT_ALIAS=mi-cert-prod

# Certificados (ajusta rutas según tu entorno)
AFIP_DEV_CERT_PATH=./certs/dev/dev_certificado.crt
AFIP_DEV_KEY_PATH=./certs/dev/dev_private.key
AFIP_PROD_CERT_PATH=./certs/prod/prod_certificado.crt
AFIP_PROD_KEY_PATH=./certs/prod/prod_private.key

# Modo
AFIP_PRODUCTION=false

# SDK (requerido cuando AFIP_PRODUCTION=true)
AFIP_SDK_ACCESS_TOKEN=
```

Notas:

- Verifica las rutas de certificados: el código los lee con `fs.readFileSync(...)` en `src/services/afip/client.ts`.
- Si `AFIP_PRODUCTION=true`, deben existir `AFIP_PROD_CERT_PATH`, `AFIP_PROD_KEY_PATH` y, si aplica, `AFIP_SDK_ACCESS_TOKEN`.

## Estructura del proyecto

- `src/config.ts`: carga `.env` y expone configuración.
- `src/services/afip/client.ts`: inicializa el cliente de `@afipsdk/afip.js` con certificados y CUIT.
- `scripts/`:
  - `getProdCerts.ts`: automatiza creación/descarga de certificados de producción.
  - `authService.ts`: automatiza la autorización de Web Services para tu CUIT.
- `certs/`: carpeta sugerida para ubicar certificados (`./certs/dev` y `./certs/prod`).

## Pasos para usar el MCP (guía completa)

A continuación se detalla, punto por punto, el flujo recomendado. Puedes ejecutar estos pasos desde Windows PowerShell o CMD.

### 1) Obtener Clave Fiscal nivel 3

AFIP requiere Clave Fiscal 3 para operar con Web Services. Guía oficial:

- https://www.afip.gob.ar/clavefiscal/ayuda/obtener-clave-fiscal.asp

Asegúrate de completar este paso antes de continuar.

### 2) Obtener API Key/Access Token de la SDK de AFIP

Este MCP utiliza automatizaciones provistas por la SDK de AFIP para simplificar tareas como: generación de certificados, autorización de servicios y recuperación de comprobantes.

- Sitio: https://afipsdk.com/

Si tu flujo de automatización requiere `AFIP_SDK_ACCESS_TOKEN`, colócalo en `.env` para producción.

### 3) Obtener certificados de producción (automatizado)

Usa el script `scripts/getProdCerts.ts` para crear/descargar el certificado y la clave privada en `./certs/prod/`.

- Requisitos previos: haber configurado `.env` con `AFIP_CUIT`, `AFIP_PASSWORD` y `AFIP_CERT_ALIAS`.
- Ejecuta:
  ```bash
  npx tsx scripts/getProdCerts.ts
  ```
- Salida esperada:
  - `./certs/prod/prod_certificado.crt`
  - `./certs/prod/prod_private.key`

El script invoca la automatización `create-cert-prod` vía `CreateAutomation(...)` del cliente AFIP. Si falla, revisa credenciales y permisos en AFIP.

### 4) Autorizar los Web Services (wsfe, ws_sr_padron_a13)

Con certificados listos, autoriza los servicios necesarios en AFIP. Este repo incluye `scripts/authService.ts` que llama a la automatización `auth-web-service-prod`.

- Sintaxis de ayuda:
  ```bash
  npx tsx scripts/authService.ts --help
  ```
- Ejemplos (PowerShell/CMD):

  ```bash
  # Facturación Electrónica
  npx tsx scripts/authService.ts wsfe

  # Padrón (A13)
  npx tsx scripts/authService.ts ws_sr_padron_a13
  ```

Si la respuesta indica `data.status = "created"`, la autorización fue creada correctamente para ese servicio.

### 5) Dar de alta un Punto de Venta para Facturación Electrónica

Sigue esta guía (referencia externa) para dar de alta el PDV que usarás con `wsfe`:

- https://ayuda.contabilium.com/hc/es/articles/360052114234-Alta-de-punto-de-venta-para-Facturas-Electr%C3%B3nicas

Asegúrate de asociar correctamente el PDV al servicio de facturación electrónica.

## Ejecución del servidor MCP

- Desarrollo:

  ```bash
  npm run dev
  ```

  Esto lanza `src/index.ts` con `tsx` en modo desarrollo.

- Inspector MCP (diagnóstico):
  ```bash
  npm run inspector
  ```
  Utiliza `@modelcontextprotocol/inspector` contra la misma entrada (`src/index.ts`).

## Scripts de automatización (detalle)

- `scripts/getProdCerts.ts`

  - Lee `CUIT`, `PASSWORD`, `CERT_ALIAS` de `src/config.ts`.
  - Llama `CreateAutomation("create-cert-prod", data, true)` y guarda los archivos en `./certs/prod/`.
  - Crea carpetas si no existen.

- `scripts/authService.ts`
  - Uso: `npx tsx scripts/authService.ts <service>`
  - Ejemplos de `<service>`: `wsfe`, `ws_sr_padron_a13`.
  - Valida que la automatización retorne `status="complete"` y `data.status="created"`.
  - Importante: Para que todas las herramientas funcionen correctamente, es obligatorio autorizar previamente los servicios `wsfe` y `ws_sr_padron_a13` en AFIP.

## Herramientas adicionales del MCP

### Mis Comprobantes (asíncrono con consulta por ID)

La tool `mis_comprobantes` inicia la automatización "Mis Comprobantes" de ARCA para listar comprobantes emitidos/recibidos. Por diseño, se ejecuta en modo asíncrono (wait=false):

- Entrada: filtros opcionales como `t`, `fechaEmision`, `puntosVenta`, `tiposComprobantes`, `comprobanteDesde`, `comprobanteHasta`, `tipoDoc`, `nroDoc`, `codigoAutorizacion`.
- Salida inmediata: un objeto con `id` y `status`. No contiene todavía los datos finales; es el identificador de la ejecución.
- Consulta del resultado: usa posteriormente el tool `get_automation_details` con ese `id` para verificar si finalizó y recuperar los datos.

Ejemplo de uso conceptual (cliente MCP):

```json
{
  "tool": "mis_comprobantes",
  "params": {
    "t": "emitidos",
    "fechaEmision": "2025-09-01..2025-09-22",
    "puntosVenta": [1],
    "tiposComprobantes": [11]
  }
}
```

Respuesta típica inicial:

```json
{
  "id": "abc123",
  "status": "running"
}
```

Luego, para consultar el resultado:

```json
{
  "tool": "get_automation_details",
  "params": { "id": "abc123" }
}
```

Notas:

- Las credenciales (`CUIT`, `username`, `password`) se leen de la configuración (`src/config.ts`).
- Mientras `status` indique ejecución en curso, vuelve a consultar más tarde con el mismo `id`.

### Crear PDF de comprobante (enlace válido 24 h)

La tool `create_pdf` genera un PDF a partir de un HTML dinámico y datos del comprobante (incluyendo QR AFIP). Internamente usa `ElectronicBilling.createPDF` de la SDK de AFIP.

- Entrada: datos del comprobante (emisor, receptor, importes, fechas, `CbteTipo`, `CbteLetra`, `PtoVta`, `CbteNro`, `CbteFch`, `CAE_NUMBER`, `CAE_EXPIRY_DATE`, moneda, cotización y los ítems de la factura, entre otros).
- Proceso recomendado: primero recupera los datos con las tools del MCP (voucher, emisor, receptor). El asistente debe mostrar un resumen y requerir confirmación explícita antes de generar el PDF.
- Salida: un objeto con `file` (URL descargable) y aviso de expiración. El enlace al PDF es válido por 24 horas.

Respuesta típica:

```json
{
  "success": true,
  "phase": "pdf_created",
  "message": "PDF generado correctamente. El enlace expira en 24 horas.",
  "file": "https://.../Factura_C_00001_00000001.pdf",
  "expiresInHours": 24
}
```

Recomendación:

- Usa la numeración automática al emitir el comprobante (ver sección del prompt) para asegurar que `CbteNro` sea el correcto antes de crear el PDF.

## Solución de problemas (troubleshooting)

- Certificados no encontrados o error `ENOENT`:
  - Revisa rutas en `.env` (`AFIP_*_CERT_PATH` y `AFIP_*_KEY_PATH`). Puedes usar rutas absolutas o relativas al raíz del proyecto.
- `AFIP_PRODUCTION=true` pero faltan variables:
  - Define `AFIP_PROD_CERT_PATH`, `AFIP_PROD_KEY_PATH` y `AFIP_SDK_ACCESS_TOKEN` si tu flujo lo requiere.
- Error de autorización de servicio:
  - Verifica que el CUIT tiene Clave Fiscal 3 y permisos para el servicio (ej. `wsfe`, `ws_sr_padron_a13`).
- Versiones de Node incompatibles:
  - Asegúrate de usar Node 18+ (recomendado 20+). Ejecuta `node -v`.
- Variables de entorno sin definir:
  - `src/config.ts` usa `!` (non-null assertion). Si falta una variable, el proceso puede fallar. Completa todas las requeridas.

## Configuración del cliente MCP (archivo JSON)

Muchos clientes MCP aceptan un archivo de configuración JSON (por ejemplo `mcp.json` o `mcp_config.json`) donde se definen los servidores. A continuación se muestra un ejemplo genérico para registrar este servidor como `arca-mcp`.

Ejemplo (Windows, con rutas absolutas):

```json
{
  "arca-mcp": {
    "command": "npx",
    "args": ["-y", "tsx", "C:\\ruta\\a\\ArcaMCP\\src\\index.ts"],
    "env": {
      "AFIP_CUIT": "20123456789",
      "AFIP_DEV_CERT_PATH": "C:\\ruta\\a\\ArcaMCP\\certs\\dev\\dev_certificado.crt",
      "AFIP_DEV_KEY_PATH": "C:\\ruta\\a\\ArcaMCP\\certs\\dev\\dev_private.key",
      "AFIP_PROD_CERT_PATH": "C:\\ruta\\a\\ArcaMCP\\certs\\prod\\prod_certificado.crt",
      "AFIP_PROD_KEY_PATH": "C:\\ruta\\a\\ArcaMCP\\certs\\prod\\prod_private.key",
      "AFIP_SDK_ACCESS_TOKEN": "apikey",
      "AFIP_PRODUCTION": "true"
    }
  }
}
```

Ejemplo (rutas relativas al repositorio):

```json
{
  "arca-mcp": {
    "command": "npx",
    "args": ["-y", "tsx", "./src/index.ts"],
    "env": {
      "AFIP_CUIT": "20123456789",
      "AFIP_DEV_CERT_PATH": "./certs/dev/dev_certificado.crt",
      "AFIP_DEV_KEY_PATH": "./certs/dev/dev_private.key",
      "AFIP_PROD_CERT_PATH": "./certs/prod/prod_certificado.crt",
      "AFIP_PROD_KEY_PATH": "./certs/prod/prod_private.key",
      "AFIP_SDK_ACCESS_TOKEN": "apikey",
      "AFIP_PRODUCTION": "true"
    }
  }
}
```

Notas importantes:

- Ajusta las rutas (`args` y `env`) a tu entorno. En Windows se debe escapar la barra invertida (`\\`) en JSON.
- Puedes usar rutas relativas si el cliente MCP ejecuta el comando desde la raíz del repo.
- Si trabajas en homologación, define `"AFIP_PRODUCTION": "false"` y usa los certificados de dev.

## Uso del prompt de creación de comprobantes

Este repositorio incluye un prompt para asistir en la creación de comprobantes: `src/prompts/CreateVoucherPrompt/CreateVoucherPrompt.ts`.

- Nombre del prompt: `wizard_crear_comprobante`.
- Objetivo: recopilar y validar datos para crear un comprobante en AFIP y ejecutar la tool correspondiente.
- Herramientas involucradas: `create_next_voucher` (numeración automática) o `create_voucher` (manual), además de herramientas auxiliares para tipos, puntos de venta, etc.

Recomendación:

- Pon la numeración en modo automático (campo `modoNumeracion="automatico"`) para que AFIP/ARCA asigne el número de voucher correcto y evites inconsistencias.

Ejemplo de invocación de argumentos (conceptual):

```json
{
  "prompt": "wizard_crear_comprobante",
  "args": {
    "tipoComprobante": 11,
    "puntoDeVenta": 1,
    "concepto": 1,
    "modoNumeracion": "automatico"
  }
}
```

El asistente completará datos faltantes, validará reglas (por ejemplo Factura C, condiciones del receptor) y, tras confirmación explícita, ejecutará `create_next_voucher` para obtener CAE, fecha de vencimiento del CAE y el número de comprobante.

## Seguridad

- No compartas tu `.env` ni subas certificados a repositorios públicos.
- Restrinje permisos del sistema de archivos a las claves privadas.
- Considera encriptar el almacenamiento de certificados en equipos compartidos.

## Contribuir

¡Las contribuciones son bienvenidas! La mejor forma de colaborar en este proyecto aquí en GitHub es la siguiente:

- **Reporta issues**: abre un Issue con un título claro, contexto, pasos para reproducir y comportamiento esperado.
- **Propón mejoras**: para nuevas features, abre primero un Issue/Discussion para alinear el alcance.
- **Envía Pull Requests (PRs)**:
  - Haz un fork del repo y crea una rama desde `main` (por ejemplo, `feat/mi-mejora` o `fix/mi-bug`).
  - Instala dependencias con `npm install` y prueba en local con `npm run dev`.
  - Asegúrate de que el código compile (`npm run build`) y que no rompa los scripts (`scripts/*.ts`).
  - Incluye documentación actualizada en `README.md` cuando aplique (por ejemplo, variables nuevas, pasos, comandos).
  - No incluyas secretos ni certificados en los commits (usa variables de entorno y rutas locales).
  - Describe claramente los cambios en el PR y referencia el Issue relacionado (`Fixes #<n>` si corresponde).

Estilo y buenas prácticas:

- **TypeScript** y **ES Modules** (ver `package.json` y `tsconfig.json`).
- Mantén el código y mensajes en español cuando ayuden a la comunidad local (AFIP/ARCA).
- Sigue convenciones de commits (p. ej. `feat:`, `fix:`, `docs:`) para facilitar el historial.

## Licencia y autor

- Licencia: MIT
- Autor: Jorge Diaz
