export interface PayerDetails {
  apellido: string;
  descripcionActividadPrincipal: string;
  estadoClave: string;
  fechaNacimiento: Date;
  idActividadPrincipal: number;
  idPersona: number;
  mesCierre: number;
  nombre: string;
  numeroDocumento: string;
  periodoActividadPrincipal: number;
  tipoClave: string;
  tipoDocumento: string;
  tipoPersona: string;
  domicilio: Domicilio[];
}

export interface Domicilio {
  calle: string;
  codigoPostal: string;
  descripcionProvincia: string;
  direccion: string;
  estadoDomicilio: string;
  idProvincia: number;
  numero: number;
  oficinaDptoLocal: string;
  piso: string;
  tipoDomicilio: string;
}
