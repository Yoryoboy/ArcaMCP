import { MCPResponse } from "../../core/types.js";
import {
  GetInvoicesInDateRangeParams,
  DateRangeResult,
  VoucherSummary,
} from "../types.js";
import { GetInvoicesInDateRangeSchema } from "./GetInvoicesInDateRangeTool.schemas.js";
import afip from "../../services/afip/client.js";

export class GetInvoicesInDateRangeTool {
  static readonly name = "get_invoices_in_date_range";

  static readonly metadata = {
    title: "Obtener facturas en rango de fechas",
    description:
      "Recupera todas las facturas emitidas en un rango de fechas usando búsqueda binaria optimizada y consultas en lotes paralelos",
    inputSchema: GetInvoicesInDateRangeSchema.shape,
  };

  static async execute(
    params: GetInvoicesInDateRangeParams
  ): Promise<MCPResponse> {
    const startTime = Date.now();
    let totalQueries = 0;
    let binarySearchQueries = 0;
    let batchQueries = 0;

    try {
      const validatedParams = GetInvoicesInDateRangeSchema.parse(params);
      const {
        PtoVta,
        CbteTipo,
        fechaDesde,
        fechaHasta,
        batchSize = 20,
        includeDetails = false,
        maxVouchers = 500,
      } = validatedParams;

      console.log(
        `Iniciando búsqueda optimizada de facturas desde ${fechaDesde} hasta ${fechaHasta}...`
      );

      // 1. Obtener el último comprobante autorizado
      console.log("Paso 1: Obteniendo último comprobante autorizado...");
      let ultimoNro: number;

      try {
        const lastVoucherResult = await afip.ElectronicBilling.getLastVoucher(
          PtoVta,
          CbteTipo
        );
        totalQueries++;
        ultimoNro = lastVoucherResult.CbteNro || lastVoucherResult;
        console.log(`Último comprobante: ${ultimoNro}`);
      } catch (error) {
        // Fallback: usar búsqueda hacia atrás desde un número alto
        console.warn(
          `Error obteniendo último comprobante, usando búsqueda hacia atrás: ${error}`
        );
        ultimoNro = await GetInvoicesInDateRangeTool.findLastVoucherBySearch(
          PtoVta,
          CbteTipo
        );
        totalQueries += 10; // Estimación de consultas adicionales
        console.log(`Último comprobante encontrado por búsqueda: ${ultimoNro}`);
      }

      if (ultimoNro === 0) {
        return GetInvoicesInDateRangeTool.createEmptyResult(
          fechaDesde,
          fechaHasta,
          totalQueries,
          binarySearchQueries,
          batchQueries,
          startTime
        );
      }

      // 2. Determinar si el rango es histórico
      console.log("Paso 2: Analizando tipo de rango de fechas...");

      // Obtener fecha del último comprobante para determinar estrategia
      let fechaUltimoComprobante = "";
      try {
        const ultimoVoucherData = await afip.ElectronicBilling.getVoucherInfo(
          ultimoNro,
          PtoVta,
          CbteTipo
        );
        totalQueries++;
        binarySearchQueries++;
        fechaUltimoComprobante = ultimoVoucherData?.CbteFch || "";
      } catch (error) {
        console.warn(`Error obteniendo fecha del último comprobante: ${error}`);
      }

      const esRangoHistorico =
        fechaUltimoComprobante && fechaHasta < fechaUltimoComprobante;
      console.log(
        `Rango ${
          esRangoHistorico ? "histórico" : "reciente"
        } detectado. Última fecha: ${fechaUltimoComprobante}`
      );

      // 3. Búsqueda binaria para encontrar límites del rango
      let primerEnRango = ultimoNro + 1;
      let ultimoEnRango = 0;

      if (esRangoHistorico) {
        // Para rangos históricos: buscar hacia atrás desde el último comprobante
        console.log(
          "Paso 3a: Búsqueda binaria hacia atrás para rango histórico..."
        );

        // Primero encontrar el último comprobante del rango (fechaHasta)
        let inicio = 1;
        let fin = ultimoNro;

        while (inicio <= fin) {
          const medio = Math.floor((inicio + fin) / 2);

          try {
            const voucherData = await afip.ElectronicBilling.getVoucherInfo(
              medio,
              PtoVta,
              CbteTipo
            );
            totalQueries++;
            binarySearchQueries++;

            if (!voucherData?.CbteFch) {
              inicio = medio + 1;
              continue;
            }

            const fechaVoucher = voucherData.CbteFch;
            if (!fechaVoucher) {
              inicio = medio + 1;
              continue;
            }

            if (fechaVoucher <= fechaHasta) {
              ultimoEnRango = medio;
              inicio = medio + 1;
            } else {
              fin = medio - 1;
            }
          } catch (error) {
            console.warn(`Error consultando comprobante ${medio}: ${error}`);
            inicio = medio + 1;
          }
        }

        // Luego encontrar el primer comprobante del rango (fechaDesde)
        if (ultimoEnRango > 0) {
          inicio = 1;
          fin = ultimoEnRango;

          while (inicio <= fin) {
            const medio = Math.floor((inicio + fin) / 2);

            try {
              const voucherData = await afip.ElectronicBilling.getVoucherInfo(
                medio,
                PtoVta,
                CbteTipo
              );
              totalQueries++;
              binarySearchQueries++;

              if (!voucherData?.CbteFch) {
                inicio = medio + 1;
                continue;
              }

              const fechaVoucher = voucherData.CbteFch;
              if (!fechaVoucher) {
                inicio = medio + 1;
                continue;
              }

              if (fechaVoucher >= fechaDesde) {
                primerEnRango = medio;
                fin = medio - 1;
              } else {
                inicio = medio + 1;
              }
            } catch (error) {
              console.warn(`Error consultando comprobante ${medio}: ${error}`);
              inicio = medio + 1;
            }
          }
        }
      } else {
        // Para rangos recientes: búsqueda normal hacia adelante
        console.log(
          "Paso 3b: Búsqueda binaria hacia adelante para rango reciente..."
        );

        let inicio = 1;
        let fin = ultimoNro;

        while (inicio <= fin) {
          const medio = Math.floor((inicio + fin) / 2);

          try {
            const voucherData = await afip.ElectronicBilling.getVoucherInfo(
              medio,
              PtoVta,
              CbteTipo
            );
            totalQueries++;
            binarySearchQueries++;

            if (!voucherData?.CbteFch) {
              inicio = medio + 1;
              continue;
            }

            const fechaVoucher = voucherData.CbteFch;
            if (!fechaVoucher) {
              inicio = medio + 1;
              continue;
            }

            if (fechaVoucher < fechaDesde) {
              inicio = medio + 1;
            } else {
              primerEnRango = medio;
              fin = medio - 1;
            }
          } catch (error) {
            console.warn(`Error consultando comprobante ${medio}: ${error}`);
            inicio = medio + 1;
          }
        }
        ultimoEnRango = ultimoNro; // Para rangos recientes, procesamos hasta el final
      }

      console.log(
        `Rango encontrado: comprobantes ${primerEnRango} a ${ultimoEnRango}`
      );

      if (primerEnRango > ultimoEnRango || primerEnRango > ultimoNro) {
        console.log(
          "No se encontraron comprobantes en el rango de fechas especificado"
        );
        return GetInvoicesInDateRangeTool.createEmptyResult(
          fechaDesde,
          fechaHasta,
          totalQueries,
          binarySearchQueries,
          batchQueries,
          startTime
        );
      }

      // 4. Aplicar límite de seguridad
      const rangoTotal = ultimoEnRango - primerEnRango + 1;
      if (rangoTotal > maxVouchers) {
        const mensaje =
          `El rango contiene ${rangoTotal} comprobantes, pero el límite es ${maxVouchers}. ` +
          `Ajuste el rango de fechas o aumente maxVouchers.`;
        throw new Error(mensaje);
      }

      // 5. Procesar comprobantes en lotes paralelos
      console.log(
        `Paso 4: Procesando ${rangoTotal} comprobantes en lotes de ${batchSize}...`
      );
      const vouchers: VoucherSummary[] = [];
      let totalAmount = 0;

      for (let i = primerEnRango; i <= ultimoEnRango; i += batchSize) {
        const lotePromises: Promise<any>[] = [];

        // Crear lote de consultas paralelas
        for (let j = i; j < i + batchSize && j <= ultimoEnRango; j++) {
          lotePromises.push(
            afip.ElectronicBilling.getVoucherInfo(j, PtoVta, CbteTipo)
              .then((result) => ({ voucherNumber: j, data: result }))
              .catch((error) => ({ voucherNumber: j, error: error.message }))
          );
        }

        // Ejecutar lote en paralelo
        const loteResults = await Promise.all(lotePromises);
        totalQueries += lotePromises.length;
        batchQueries += lotePromises.length;

        // Procesar resultados del lote
        for (const result of loteResults) {
          if (result.error) {
            console.warn(
              `Error en comprobante ${result.voucherNumber}: ${result.error}`
            );
            continue;
          }

          const voucher = result.data;
          if (!voucher?.CbteFch) continue;

          const fechaVoucher = voucher.CbteFch;
          if (!fechaVoucher) continue;

          // Filtrar por rango de fechas
          if (fechaVoucher >= fechaDesde && fechaVoucher <= fechaHasta) {
            const voucherSummary: VoucherSummary = {
              cbteNro: result.voucherNumber,
              cbteFch: fechaVoucher,
              impTotal: voucher.ImpTotal || 0,
              cae: voucher.CAE || "",
              caeExpiry: voucher.CAEFchVto || "",
              docTipo: voucher.DocTipo,
              docNro: voucher.DocNro,
            };

            vouchers.push(voucherSummary);
            totalAmount += voucherSummary.impTotal;
          }
        }

        // Reporte de progreso
        const progreso = Math.min(i + batchSize - primerEnRango, rangoTotal);
        console.log(
          `Progreso: ${progreso}/${rangoTotal} comprobantes procesados`
        );
      }

      // 5. Ordenar por número de comprobante
      vouchers.sort((a, b) => a.cbteNro - b.cbteNro);

      const executionTime = Date.now() - startTime;
      console.log(
        `Búsqueda completada en ${executionTime}ms. Encontrados: ${vouchers.length} comprobantes`
      );

      // 6. Crear resultado
      const result: DateRangeResult = {
        summary: {
          totalVouchers: vouchers.length,
          totalAmount: totalAmount,
          dateRange: {
            from: fechaDesde,
            to: fechaHasta,
          },
          voucherRange: {
            first: vouchers.length > 0 ? vouchers[0].cbteNro : 0,
            last:
              vouchers.length > 0 ? vouchers[vouchers.length - 1].cbteNro : 0,
          },
        },
        vouchers: includeDetails
          ? vouchers
          : vouchers.map((v) => ({
              cbteNro: v.cbteNro,
              cbteFch: v.cbteFch,
              impTotal: v.impTotal,
              cae: v.cae,
              caeExpiry: v.caeExpiry,
            })),
        performance: {
          totalQueries,
          binarySearchQueries,
          batchQueries,
          executionTimeMs: executionTime,
        },
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error:
                  error instanceof Error ? error.message : "Error desconocido",
                performance: {
                  totalQueries,
                  binarySearchQueries,
                  batchQueries,
                  executionTimeMs: executionTime,
                },
                details: error,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  private static createEmptyResult(
    fechaDesde: string,
    fechaHasta: string,
    totalQueries: number,
    binarySearchQueries: number,
    batchQueries: number,
    startTime: number
  ): MCPResponse {
    const result: DateRangeResult = {
      summary: {
        totalVouchers: 0,
        totalAmount: 0,
        dateRange: {
          from: fechaDesde,
          to: fechaHasta,
        },
        voucherRange: {
          first: 0,
          last: 0,
        },
      },
      vouchers: [],
      performance: {
        totalQueries,
        binarySearchQueries,
        batchQueries,
        executionTimeMs: Date.now() - startTime,
      },
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private static async findLastVoucherBySearch(
    PtoVta: number,
    CbteTipo: number
  ): Promise<number> {
    // Búsqueda hacia atrás desde un número estimado alto
    let maxTest = 100;
    let lastFound = 0;

    for (let i = maxTest; i >= 1; i--) {
      try {
        const voucherData = await afip.ElectronicBilling.getVoucherInfo(
          i,
          PtoVta,
          CbteTipo
        );
        if (voucherData?.CbteFch) {
          lastFound = i;
          break;
        }
      } catch (error) {
        // Continuar buscando
        continue;
      }
    }

    return lastFound;
  }

  private static formatDate(dateStr: string): string {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(6, 8)}/${dateStr.substring(
      4,
      6
    )}/${dateStr.substring(0, 4)}`;
  }
}
