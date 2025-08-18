import { MCPResponse } from '../core/types';
import { CreatePDFParams } from './types';
import { CreatePDFSchema } from './schemas';
import afip from '../services/afip/client';
import * as fs from 'fs';
import * as path from 'path';

export class CreatePDFTool {
  static readonly name = "create_pdf";

  static readonly metadata = {
    title: "Crear PDF de comprobante",
    description: "Genera un PDF dinámico de un comprobante electrónico combinando datos del voucher, emisor y receptor desde AFIP",
    inputSchema: CreatePDFSchema.shape,
  };

  static async execute(params: CreatePDFParams): Promise<MCPResponse> {
    try {
      const { PtoVta, CbteTipo, CbteNro, fileName } = params;

      // 1. Obtener información del comprobante
      console.log(`Obteniendo información del comprobante ${CbteNro}...`);
      const voucherInfo = await afip.ElectronicBilling.getVoucherInfo(
        CbteNro,
        PtoVta,
        CbteTipo
      );

      if (!voucherInfo || !voucherInfo.FECompConsResp) {
        throw new Error("No se pudo obtener información del comprobante");
      }

      const voucher = voucherInfo.FECompConsResp.ResultGet;
      if (!voucher) {
        throw new Error("Comprobante no encontrado");
      }

      // 2. Obtener datos del emisor (desde variable de entorno AFIP_CUIT)
      const issuerCuit = process.env.AFIP_CUIT;
      if (!issuerCuit) {
        throw new Error("AFIP_CUIT no configurado en variables de entorno");
      }

      console.log(`Obteniendo datos del emisor CUIT: ${issuerCuit}...`);
      const issuerDetails = await afip.RegisterScopeThirteen.getTaxpayerDetails(parseInt(issuerCuit));

      // 3. Obtener datos del receptor
      let recipientDetails = null;
      const docNro = voucher.DocNro;
      const docTipo = voucher.DocTipo;

      if (docNro && docNro !== 0 && docTipo !== 99) { // No es consumidor final
        try {
          console.log(`Obteniendo datos del receptor DocNro: ${docNro}, DocTipo: ${docTipo}...`);
          
          if (docTipo === 80) { // CUIT
            recipientDetails = await afip.RegisterScopeThirteen.getTaxpayerDetails(docNro);
          } else if (docTipo === 96) { // DNI
            const taxId = await afip.RegisterScopeThirteen.getTaxIDByDocument(docNro);
            if (taxId && taxId.idPersona) {
              recipientDetails = await afip.RegisterScopeThirteen.getTaxpayerDetails(taxId.idPersona);
            }
          }
        } catch (error) {
          console.warn(`No se pudieron obtener datos del receptor: ${error}`);
        }
      }

      // 4. Leer template HTML
      const templatePath = path.join(__dirname, '../../templates/bill.html');
      let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

      // 5. Formatear fechas
      const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr.length !== 8) return dateStr;
        return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
      };

      // 6. Preparar datos para reemplazar placeholders
      const issuerName = (issuerDetails as any)?.persona?.razonSocial || 
                        `${(issuerDetails as any)?.persona?.nombre || ''} ${(issuerDetails as any)?.persona?.apellido || ''}`.trim() ||
                        'Empresa no identificada';
      
      const issuerAddress = (issuerDetails as any)?.persona?.domicilio?.[0]?.direccion || 'Dirección no disponible';
      
      const recipientName = (recipientDetails as any)?.persona?.razonSocial || 
                           `${(recipientDetails as any)?.persona?.nombre || ''} ${(recipientDetails as any)?.persona?.apellido || ''}`.trim() ||
                           (docTipo === 99 ? 'Consumidor Final' : 'Cliente no identificado');

      const recipientAddress = (recipientDetails as any)?.persona?.domicilio?.[0]?.direccion || 
                              (docTipo === 99 ? '' : 'Dirección no disponible');

      // Formatear montos
      const formatAmount = (amount: number) => {
        return amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      // 7. Reemplazar placeholders en el HTML
      const replacements = {
        '{{ISSUER_COMPANY_NAME}}': issuerName,
        '{{ISSUER_CUIT}}': issuerCuit,
        '{{ISSUER_ADDRESS}}': issuerAddress,
        '{{RECIPIENT_NAME}}': recipientName,
        '{{RECIPIENT_CUIT}}': docNro && docNro !== 0 ? docNro.toString() : '',
        '{{RECIPIENT_ADDRESS}}': recipientAddress,
        '{{VOUCHER_TYPE}}': this.getVoucherTypeName(CbteTipo),
        '{{SALES_POINT}}': PtoVta.toString().padStart(5, '0'),
        '{{VOUCHER_NUMBER}}': CbteNro.toString().padStart(8, '0'),
        '{{INVOICE_DATE}}': formatDate(voucher.CbteFch || ''),
        '{{SUBTOTAL}}': formatAmount(voucher.ImpNeto || 0),
        '{{OTHER_TAXES}}': formatAmount(voucher.ImpTrib || 0),
        '{{TOTAL_AMOUNT}}': formatAmount(voucher.ImpTotal || 0),
        '{{CAE_NUMBER}}': voucher.CAE || '',
        '{{CAE_EXPIRY_DATE}}': formatDate(voucher.CAEFchVto || ''),
        '{{QR_CODE_DATA}}': this.generateQRCodeData(voucher, issuerCuit),
        '{{INVOICE_ITEMS}}': this.generateInvoiceItems(voucher)
      };

      // Aplicar reemplazos
      for (const [placeholder, value] of Object.entries(replacements)) {
        htmlTemplate = htmlTemplate.replace(new RegExp(placeholder, 'g'), value);
      }

      // 8. Generar PDF
      const pdfFileName = fileName || `factura_${PtoVta}_${CbteNro}_${Date.now()}.pdf`;
      
      console.log(`Generando PDF: ${pdfFileName}...`);
      const pdfResult = await afip.ElectronicBilling.createPDF({
        html: htmlTemplate,
        file_name: pdfFileName,
        options: {
          format: 'A4',
          margin: {
            top: '1cm',
            right: '1cm',
            bottom: '1cm',
            left: '1cm'
          }
        }
      });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            message: "PDF generado exitosamente",
            fileName: pdfFileName,
            pdfUrl: (pdfResult as any).file_url || (pdfResult as any).url || pdfResult.file,
            voucherInfo: {
              type: this.getVoucherTypeName(CbteTipo),
              number: CbteNro,
              salesPoint: PtoVta,
              total: voucher.ImpTotal,
              cae: voucher.CAE,
              caeExpiry: formatDate(voucher.CAEFchVto || '')
            },
            issuer: {
              name: issuerName,
              cuit: issuerCuit
            },
            recipient: {
              name: recipientName,
              document: docNro && docNro !== 0 ? docNro.toString() : 'N/A'
            }
          }, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: error instanceof Error ? error.message : "Error desconocido",
            details: error
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  private static getVoucherTypeName(type: number): string {
    const types: { [key: number]: string } = {
      1: "Factura A",
      2: "Nota de Débito A",
      3: "Nota de Crédito A",
      6: "Factura B",
      7: "Nota de Débito B",
      8: "Nota de Crédito B",
      11: "Factura C",
      12: "Nota de Débito C",
      13: "Nota de Crédito C"
    };
    return types[type] || `Tipo ${type}`;
  }

  private static generateQRCodeData(voucher: any, issuerCuit: string): string {
    // Generar datos básicos para QR (simplificado)
    const qrData = {
      ver: 1,
      fecha: voucher.CbteFch,
      cuit: issuerCuit,
      ptoVta: voucher.PtoVta,
      tipoCmp: voucher.CbteTipo,
      nroCmp: voucher.CbteNro,
      importe: voucher.ImpTotal,
      moneda: voucher.MonId || 'PES',
      ctz: voucher.MonCotiz || 1,
      cae: voucher.CAE
    };
    
    // En producción, esto debería generar un QR real
    // Por ahora retornamos un placeholder
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  }

  private static generateInvoiceItems(voucher: any): string {
    // Para facturas C simples, generar una línea básica
    const total = voucher.ImpTotal || 0;
    const description = "Servicios profesionales";
    
    return `
      <tr>
        <td>001</td>
        <td>${description}</td>
        <td>1,00</td>
        <td>Unidad</td>
        <td>${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
        <td>0,00</td>
        <td>0,00</td>
        <td>${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  }
}
