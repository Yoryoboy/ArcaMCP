# ARCA MCP (Model Context Protocol) para AFIP/ARCA

Este proyecto implementa un servidor MCP (Model Context Protocol) orientado a integrarse con AFIP (Argentina) y automatizar tareas claves del flujo de facturación electrónica y consulta de padrones. Aprovecha la SDK oficial de AFIP (`@afipsdk/afip.js`) y automatizaciones para:

- Generar y gestionar certificados X.509 (dev y producción).
- Autorizar Web Services (ej. `wsfe`, `ws_sr_padron_a13`).
- Interactuar con servicios AFIP para emisión y consulta de comprobantes.
- Estandarizar configuraciones, variables de entorno y rutas de certificados.

Además, el paquete incluye los comandos `arcamcp setup` y `arcamcp doctor`, que automatizan y diagnostican el onboarding en AFIP, reduciendo tiempos de configuración y posibles errores manuales.

## Requisitos

- Node.js 20 o superior
- pnpm (la versión canónica la define el campo `packageManager` de `package.json`)
- Acceso a tu CUIT y a tu cuenta de AFIP
- Clave Fiscal nivel 3 o superior
- (Opcional pero recomendado) Git para clonar el repositorio

## Instalación rápida

No necesitás clonar el repositorio ni instalar el paquete globalmente. Con Node.js
20 o superior, ejecutá la última versión publicada directamente con `npx`:

```bash
npx -y @yoryoboy/arcamcp@latest
```

Antes de iniciarlo, configurá las variables de entorno requeridas y las rutas a
tus certificados (ver la sección [Configuración](#configuración-env)). El
servidor también carga un archivo `.env` desde el directorio donde ejecutás el
comando.

Para desarrollar el proyecto localmente:

1. Cloná el repositorio y entrá en su directorio.
2. Ejecutá `pnpm install`.
3. Creá el archivo `.env` con las variables necesarias.
4. Iniciá el servidor con `pnpm run dev` o el Inspector con `pnpm run inspector`.

## Configuración (.env)

El archivo `src/config.ts` lee las siguientes variables de entorno:

- `AFIP_CUIT` (obligatorio): CUIT del contribuyente.
- `AFIP_PASSWORD` (solo para automatizaciones): clave fiscal usada por las automatizaciones de certificados y autorización.
- `AFIP_CERT_ALIAS` (solo para automatizaciones): alias que usarán las automatizaciones de certificados.
- `AFIP_DEV_CERT_PATH` (obligatorio con `AFIP_PRODUCTION=false`): ruta absoluta o relativa al certificado `.crt` de desarrollo.
- `AFIP_DEV_KEY_PATH` (obligatorio con `AFIP_PRODUCTION=false`): ruta al `.key` de desarrollo.
- `AFIP_PROD_CERT_PATH` (obligatorio con `AFIP_PRODUCTION=true`): ruta al certificado `.crt` de producción.
- `AFIP_PROD_KEY_PATH` (obligatorio con `AFIP_PRODUCTION=true`): ruta al `.key` de producción.
- `AFIP_PRODUCTION`: `true` para producción, `false` para homologación/dev.
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
- `src/index.ts`: punto de entrada del bin `arcamcp` (servidor MCP o comandos `setup`/`doctor`).
- `src/server.ts`: registra tools y prompts e inicia el servidor MCP por stdio.
- `src/cli/`: comandos `setup` (certificado + autorización de servicios + `.env`) y `doctor`.
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

### 3) Obtener el certificado y autorizar los Web Services (automatizado)

Desde el directorio donde querés guardar los certificados y el `.env`, ejecutá:

```bash
# Homologación (por defecto si AFIP_PRODUCTION no es "true")
npx -y @yoryoboy/arcamcp@latest setup --dev

# Producción
npx -y @yoryoboy/arcamcp@latest setup --prod
```

`setup`:

1. Toma `AFIP_CUIT`, `AFIP_CERT_ALIAS`, `AFIP_SDK_ACCESS_TOKEN` y `AFIP_PASSWORD` del entorno o de `.env`. Si falta alguno y estás en una terminal, lo pide; el token y la clave fiscal se piden sin eco.
2. Crea el certificado con la automatización `create-cert-dev` o `create-cert-prod` y lo guarda en `./certs/dev/` o `./certs/prod/` (`<env>_certificado.crt` y `<env>_private.key`, esta última con permisos `600`).
3. Crea o actualiza `.env` con `AFIP_CUIT`, `AFIP_CERT_ALIAS`, `AFIP_SDK_ACCESS_TOKEN` y las rutas absolutas `AFIP_<DEV|PROD>_CERT_PATH` / `AFIP_<DEV|PROD>_KEY_PATH`, conservando el resto de las líneas. Solo agrega `AFIP_PRODUCTION` si no existe. **La clave fiscal nunca se guarda.**
4. Autoriza `wsfe` y `ws_sr_padron_a13` con `auth-web-service-dev` o `auth-web-service-prod`.
5. Imprime el bloque JSON listo para pegar en la configuración de tu cliente MCP.

Si ya existe un certificado en `./certs/<env>/`, `setup` no hace nada y termina con error antes de contactar a ARCA. Usá `--force` para crear uno nuevo y reemplazarlo.

> **Nota:** el servidor carga `.env` desde su directorio de trabajo. Si tu cliente MCP lo inicia desde otro directorio, copiá las variables al bloque `env` del cliente (el que imprime `setup`).

### 4) Verificar la configuración

```bash
npx -y @yoryoboy/arcamcp@latest doctor
```

`doctor` no modifica nada. Revisa las variables del ambiente activo, que los archivos de certificado y clave existan, que el certificado sea válido y no esté vencido, y que la clave corresponda al certificado. Si todo eso está bien, consulta a ARCA que `wsfe` esté autorizado y, en producción, también el padrón A13 y los puntos de venta. Termina con código `0` si no hay errores (`✖`) y `1` si los hay.

### 5) Dar de alta un Punto de Venta para Facturación Electrónica

Sigue esta guía (referencia externa) para dar de alta el PDV que usarás con `wsfe`:

- https://ayuda.contabilium.com/hc/es/articles/360052114234-Alta-de-punto-de-venta-para-Facturas-Electr%C3%B3nicas

Asegúrate de asociar correctamente el PDV al servicio de facturación electrónica.

## Ejecución del servidor MCP

### Uso con npx

Para ejecutar la versión publicada sin clonar el repositorio ni instalarla
globalmente:

```bash
npx -y @yoryoboy/arcamcp@latest
```

`-y` permite que `npx` descargue el paquete sin pedir confirmación, algo
necesario cuando un cliente MCP inicia el proceso sin una terminal interactiva.
El tag `latest` mantiene el cliente en la última versión estable publicada.
Configurá las variables de entorno requeridas antes de ejecutarlo. El servidor
carga `.env` desde el directorio de trabajo actual.

Ejemplo de configuración de un cliente MCP:

```json
{
  "arca-mcp": {
    "command": "npx",
    "args": ["-y", "@yoryoboy/arcamcp@latest"],
    "env": {
      "AFIP_CUIT": "20123456789",
      "AFIP_PASSWORD": "tu_password_afip",
      "AFIP_CERT_ALIAS": "mi-cert-prod",
      "AFIP_DEV_CERT_PATH": "/ruta/local/dev.crt",
      "AFIP_DEV_KEY_PATH": "/ruta/local/dev.key",
      "AFIP_PROD_CERT_PATH": "/ruta/local/prod.crt",
      "AFIP_PROD_KEY_PATH": "/ruta/local/prod.key",
      "AFIP_PRODUCTION": "false",
      "AFIP_SDK_ACCESS_TOKEN": ""
    }
  }
}
```

No incluyas credenciales, tokens, certificados ni claves privadas en archivos
del proyecto o en repositorios públicos.

- Desarrollo:

  ```bash
  pnpm run dev
  ```

  Esto lanza `src/index.ts` con `tsx` en modo desarrollo.

- Inspector MCP (diagnóstico):
  ```bash
  pnpm run inspector
  ```
  Utiliza `@modelcontextprotocol/inspector` contra la misma entrada (`src/index.ts`).

### Estado del certificado X.509

La tool read-only `get_certificate_status` informa el ambiente, las fechas de
validez, los días restantes y el estado del certificado X.509 efectivamente
cargado por el cliente. No lee ni accede a la clave privada y no expone PEM,
identidad, subject, issuer ni rutas locales.

Las tools que usan WSAA/WSN se bloquean si el certificado todavía no es válido o
ya venció. Si faltan exactamente 90 días o menos, continúan normalmente y se
emite una advertencia visible una sola vez por proceso. La fecha se compara con
un límite exacto de 90 días, no con meses calendario. Para inspeccionar las
fechas manualmente, ejecuta:

```bash
openssl x509 -in /ruta/al/certificado.crt -noout -dates
```

Después de renovar o reemplazar el certificado, reinicia ArcaMCP para que el
cliente cargue el nuevo PEM.

## Comandos de línea de comandos

```text
arcamcp                                   Inicia el servidor MCP por stdio.
arcamcp setup [--dev | --prod] [--force]  Crea el certificado, actualiza .env y autoriza wsfe y ws_sr_padron_a13.
arcamcp doctor                            Diagnostica la configuración sin modificar nada.
arcamcp help                              Muestra la ayuda.
```

Con npx, anteponé `npx -y @yoryoboy/arcamcp@latest`. Desde un clone del repositorio, usá `pnpm run dev <comando>` (por ejemplo `pnpm run dev doctor`). Un comando u opción desconocidos terminan con código `2`.

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
  - Asegúrate de usar Node 20+ y confirma la versión con `node -v`.
- Variables de entorno sin definir o certificados ilegibles:
  - El servidor arranca igual y cada tool responde con `kind: "configuration"`,
    `code: "CONFIGURATION_ERROR"` y la lista de problemas en `details.issues`
    (por ejemplo `Falta AFIP_PROD_CERT_PATH.`). `get_certificate_status` también
    los informa. Corregí la configuración y reiniciá el servidor MCP.
  - `AFIP_PASSWORD` y `AFIP_CERT_ALIAS` no son necesarias para el servidor; solo
    las usan las automatizaciones de certificados y autorización.

## Configuración del cliente MCP (archivo JSON)

Muchos clientes MCP aceptan un archivo de configuración JSON (por ejemplo `mcp.json` o `mcp_config.json`) donde se definen los servidores. A continuación se muestra un ejemplo genérico para registrar este servidor como `arca-mcp`.

Ejemplo (Windows, con rutas absolutas a los certificados):

```json
{
  "arca-mcp": {
    "command": "npx",
    "args": ["-y", "@yoryoboy/arcamcp@latest"],
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

Ejemplo (rutas relativas al directorio de trabajo del cliente MCP):

```json
{
  "arca-mcp": {
    "command": "npx",
    "args": ["-y", "@yoryoboy/arcamcp@latest"],
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

- Ajustá las rutas de certificados de `env` a tu entorno. En Windows se debe escapar la barra invertida (`\\`) en JSON.
- Podés usar rutas relativas si conocés el directorio de trabajo del cliente MCP; las rutas absolutas suelen ser más confiables.
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
  - Instala dependencias con `pnpm install` y prueba en local con `pnpm run dev`.
  - Asegúrate de que el código compile (`pnpm run build`) y que pase `pnpm run quality`.
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
