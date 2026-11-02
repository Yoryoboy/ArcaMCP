import { z } from "zod";

// AFIP A13 values are typed `any` by the SDK: identifiers and dates may arrive as text or numbers.
const TextOrNumber = z.union([z.string(), z.number()]);

const DomicilioOutputSchema = z.looseObject({
  calle: z.string().optional().describe("Calle"),
  codigoPostal: TextOrNumber.optional().describe("Código postal"),
  descripcionProvincia: z.string().optional().describe("Provincia"),
  direccion: z.string().optional().describe("Dirección completa"),
  estadoDomicilio: z.string().optional().describe("Estado del domicilio, por ejemplo ACTIVO"),
  idProvincia: TextOrNumber.optional().describe("Código AFIP de la provincia"),
  numero: TextOrNumber.optional().describe("Altura de la calle"),
  oficinaDptoLocal: z.string().optional().describe("Oficina, departamento o local"),
  piso: TextOrNumber.optional().describe("Piso"),
  tipoDomicilio: z.string().optional().describe("Tipo de domicilio, por ejemplo FISCAL"),
});

// Known A13 fields are optional and the rest is accepted, so a valid AFIP response never fails validation.
export const GetTaxpayerDetailsOutputSchema = z.looseObject({
  apellido: z.string().optional().describe("Apellido (personas humanas)"),
  nombre: z.string().optional().describe("Nombre (personas humanas)"),
  razonSocial: z.string().optional().describe("Razón social (personas jurídicas)"),
  descripcionActividadPrincipal: z.string().optional().describe("Actividad principal"),
  estadoClave: z.string().optional().describe("Estado de la clave, por ejemplo ACTIVO"),
  fechaNacimiento: TextOrNumber.optional().describe("Fecha de nacimiento"),
  idActividadPrincipal: TextOrNumber.optional().describe("Código AFIP de la actividad principal"),
  idPersona: TextOrNumber.optional().describe("CUIT de la persona"),
  mesCierre: TextOrNumber.optional().describe("Mes de cierre del ejercicio"),
  numeroDocumento: TextOrNumber.optional().describe("Número de documento"),
  periodoActividadPrincipal: TextOrNumber.optional().describe("Período de inicio de la actividad principal (AAAAMM)"),
  tipoClave: z.string().optional().describe("Tipo de clave, por ejemplo CUIT"),
  tipoDocumento: z.string().optional().describe("Tipo de documento"),
  tipoPersona: z.string().optional().describe("Tipo de persona, FISICA o JURIDICA"),
  domicilio: z.array(DomicilioOutputSchema).optional().describe("Domicilios registrados"),
  message: z.string().optional().describe("Aviso informativo cuando no se consulta AFIP, por ejemplo en testing"),
});

export const GetTaxpayerDetailsSchema = z.object({
  taxId: z.number().describe("CUIT del contribuyente a consultar"),
});
