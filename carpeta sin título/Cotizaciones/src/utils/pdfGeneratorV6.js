import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// VERSION 6.5 - ULTRA REFINEMENT
console.log("💎 [v6.5] Professional PDF Logic Loaded");

// Improved HTML to Text converter
const stripHtml = (html) => {
  if (!html) return "";
  let text = html;
  // Replace block tags with newlines
  text = text.replace(/<\/p>|<br\s*\/?>|<\/div>|<\/li>|<\/h[1-6]>/gi, '\n');
  // Remove all remaining tags
  text = text.replace(/<[^>]*>/g, '');
  // Decode common entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  return text.trim();
};

const getDataUri = (url) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.setAttribute('crossOrigin', 'anonymous');
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext('2d').drawImage(image, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = url;
  });
};

const getColors = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    primary: [r, g, b],
    gray: [100, 100, 100],
    lightGray: [240, 240, 240],
    blue: [0, 82, 114],
    lightBlue: [232, 244, 255],
    orange: [249, 115, 22]
  };
};

const formatCurrency = (amount, currency = 'CLP', showSymbol = true) => {
  if (currency === 'CLP') {
    return (showSymbol ? '$ ' : '') + Math.round(amount).toLocaleString('es-CL');
  }
  const symbol = currency === 'EUR' ? '€' : 'U$D';
  return (showSymbol ? symbol + ' ' : '') + amount.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(',', '.');
};

const drawHeader = (doc, quote, colors, pageWidth) => {
  const margin = 15;
  if (quote.logoBase64) {
    try {
      doc.addImage(quote.logoBase64, 'PNG', (pageWidth - 50) / 2, 8, 50, 25);
    } catch (e) {
      console.warn("Logo draw failed", e);
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...colors.orange);
  doc.text("COTIZACIÓN", pageWidth / 2, 48, { align: 'center' });

  doc.setDrawColor(...colors.orange);
  doc.setLineWidth(2);
  doc.line(margin, 55, pageWidth - margin, 55);
};

const drawFooter = (doc, pageWidth, pageHeight, colors) => {
  const footerText = "Av. presidente Jorge Alessandri R. Nº 24429, San Bernardo, Santiago";
  const webText = "www.alfapack.cl";
  const phoneText = "Tel: +56 232333610";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100);
  doc.text(footerText, pageWidth / 2, pageHeight - 14, { align: 'center' });
  doc.setTextColor(51, 122, 183);
  doc.text(webText, pageWidth / 2, pageHeight - 9, { align: 'center' });
  doc.setTextColor(100);
  doc.text(phoneText, pageWidth / 2, pageHeight - 4, { align: 'center' });
};

export const generateQuotePDF = async (quoteData, borderColor = '#F97316', template = 'technical', returnBlob = false) => {
  console.log("🚀 [v6.5] Generation Starting...");
  document.body.style.cursor = 'wait';

  try {
    const quote = { ...quoteData };
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const colors = getColors(quote.headerBorderColor || borderColor);
    const margin = 20;

    if (quote.organizationLogo) {
      try {
        quote.logoBase64 = await getDataUri(quote.organizationLogo);
      } catch (e) { }
    }

    // --- PAGE 1 ---
    drawHeader(doc, quote, colors, pageWidth);

    // Client Info Alignment
    const infoData = [
      [{ content: "Cotización Nº", styles: { fontStyle: 'bold' } }, { content: `: ${quote.quoteNumber || quote.quote_number || 'DOC'}`, styles: { textColor: colors.blue, fontStyle: 'bold' } }],
      [{ content: "Fecha", styles: { fontStyle: 'bold' } }, { content: `: ${quote.date || new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}`, styles: { textColor: colors.blue, fontStyle: 'bold' } }],
      [{ content: "Ejecutivo", styles: { fontStyle: 'bold' } }, { content: `: ${quote.salesPerson || '-'} / Cel: ${quote.salesPhone || '-'} / Email: ${quote.salesEmail || '-'}`, styles: { textColor: colors.blue, fontStyle: 'bold' } }],
      [" ", " "],
      [{ content: "Empresa", styles: { fontStyle: 'bold' } }, { content: `: ${quote.clientName || '-'}`, styles: { textColor: colors.blue, fontStyle: 'bold' } }],
      [{ content: "RUT", styles: { fontStyle: 'bold' } }, { content: `: ${quote.clientRut || '-'}`, styles: { textColor: colors.blue, fontStyle: 'bold' } }],
      [{ content: "Contacto", styles: { fontStyle: 'bold' } }, { content: `: ${quote.clientContact || '-'}`, styles: { textColor: colors.blue, fontStyle: 'bold' } }],
      [{ content: "Teléfono", styles: { fontStyle: 'bold' } }, { content: `: ${quote.clientPhone || '-'}`, styles: { textColor: colors.blue, fontStyle: 'bold' } }],
      [{ content: "Ciudad", styles: { fontStyle: 'bold' } }, { content: `: ${quote.clientCity || 'Santiago'}`, styles: { textColor: colors.blue, fontStyle: 'bold' } }]
    ];

    autoTable(doc, {
      startY: 65,
      body: infoData,
      theme: 'plain',
      styles: { fontSize: 9.5, cellPadding: 0.5, textColor: 0 },
      columnStyles: { 0: { cellWidth: 45 } }
    });

    const projectY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(7, 43, 63);
    doc.text(`PROYECTO: ${String(quote.projectName || 'DOSIFICADOR').toUpperCase()}`, margin, projectY);

    // Main Table
    const itemsData = (quote.items || []).map(item => {
      const pUnit = formatCurrency(item.unitPrice || 0, quote.currency);
      const pTotal = formatCurrency((item.quantity || 1) * (item.unitPrice || 0), quote.currency);
      let pUnitCell = pUnit;
      let pTotalCell = pTotal;

      if (quote.currency !== 'CLP' && quote.exchangeRate > 0) {
        const refUnit = formatCurrency((item.unitPrice || 0) * quote.exchangeRate, 'CLP');
        const refTotal = formatCurrency((item.quantity || 1) * (item.unitPrice || 0) * quote.exchangeRate, 'CLP');
        pUnitCell = `${pUnit}\n(${refUnit})`;
        pTotalCell = `${pTotal}\n(${refTotal})`;
      }

      return [
        item.description || item.name || 'Sin nombre',
        item.quantity || 1,
        { content: pUnitCell, styles: { halign: 'right', valign: 'middle' } },
        { content: pTotalCell, styles: { halign: 'right', valign: 'middle' } }
      ];
    });

    autoTable(doc, {
      startY: projectY + 5,
      head: [['Descripción / Equipo', 'Cant.', 'Precio Unit.', 'Total']],
      body: itemsData,
      theme: 'grid',
      headStyles: { fillColor: [7, 43, 63], textColor: 255, halign: 'center', fontStyle: 'bold' },
      styles: { fontSize: 8.5, textColor: 50 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { halign: 'center' }
      }
    });

    const footerY = doc.lastAutoTable.finalY + 8;

    // Conditions Box Page 1
    doc.setFillColor(...colors.lightBlue);
    doc.rect(margin, footerY, 95, 24, 'F');
    doc.setDrawColor(51, 122, 183);
    doc.setLineWidth(0.3);
    doc.rect(margin, footerY, 95, 24, 'D');

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 122, 183);
    doc.text("Condiciones de Venta", margin + 4, footerY + 5);

    const cFields = [
      ["Valor del Equipo", `${quote.currency} ${formatCurrency(quote.total || 0, quote.currency, false)} + IVA`],
      ["Forma de Pago", quote.paymentTerms || "A convenir"],
      ["Disponibilidad", quote.deliveryTime || "A confirmar"]
    ];

    cFields.forEach((c, i) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50);
      doc.text(c[0], margin + 4, footerY + 11 + (i * 5));
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.blue);
      doc.text(c[1], margin + 91, footerY + 11 + (i * 5), { align: 'right' });
    });

    // Totals Block
    const tX = pageWidth - margin;
    const renderTotal = (label, value, refVal, y, bold = false) => {
      doc.setFontSize(9.5);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(50);
      doc.text(label, tX - 55, y);
      doc.text(value, tX, y, { align: 'right' });
      if (refVal) {
        doc.setFontSize(7.5);
        doc.setTextColor(...colors.orange);
        doc.text(`Ref. ${refVal}`, tX, y + 4, { align: 'right' });
      }
    };

    let sRef, xRef, fRef;
    if (quote.currency !== 'CLP' && quote.exchangeRate > 0) {
      sRef = formatCurrency((quote.subtotal || 0) * quote.exchangeRate, 'CLP');
      xRef = formatCurrency((quote.tax || 0) * quote.exchangeRate, 'CLP');
      fRef = formatCurrency((quote.total || 0) * quote.exchangeRate, 'CLP');
    }

    renderTotal("Subtotal:", formatCurrency(quote.subtotal || 0, quote.currency), sRef, footerY + 5);
    renderTotal("IVA (19%):", formatCurrency(quote.tax || 0, quote.currency), xRef, footerY + 13);
    doc.setFontSize(11.5);
    renderTotal("TOTAL:", formatCurrency(quote.total || 0, quote.currency), fRef, footerY + 23, true);

    drawFooter(doc, pageWidth, pageHeight, colors);

    if (template === 'technical') {
      // --- PAGE 2 FICHA TECNICA ---
      doc.addPage();
      drawHeader(doc, quote, colors, pageWidth);

      doc.setFontSize(14.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(7, 43, 63);
      doc.text(`FICHA TÉCNICA: ${String(quote.projectName || 'EQUIPO').toUpperCase()}`, margin, 65);
      doc.setDrawColor(...colors.orange);
      doc.line(margin, 67, pageWidth - margin, 67);

      const ty = 76;
      doc.setFontSize(11.5);
      doc.text("Información General", margin, ty);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(60);
      doc.text(`Modelo: ${quote.items?.[0]?.productModel || 'ALFA - PACK'}`, margin + 5, ty + 7);
      doc.text(`SKU: -`, margin + 5, ty + 13);

      const dText = stripHtml(quote.items?.[0]?.productDescription || "Detalles técnicos.");
      const dSplit = doc.splitTextToSize(dText, pageWidth - (margin * 2) - 10);
      doc.text(dSplit, margin + 5, ty + 24);

      const sy = ty + 68;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.orange);
      doc.text("Especificaciones:", margin, sy);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60);

      const rawSpecs = quote.items?.[0]?.productTechnicalSpecs || "";
      const cleanSpecs = stripHtml(rawSpecs).split('\n').filter(s => s.trim() !== "");

      cleanSpecs.forEach((s, i) => {
        doc.text("✓", margin + 2, sy + 8 + (i * 6));
        doc.text(s.trim(), margin + 10, sy + 8 + (i * 6));
      });

      drawFooter(doc, pageWidth, pageHeight, colors);

      // --- PAGE 3 CONDICIONES ---
      doc.addPage();
      drawHeader(doc, quote, colors, pageWidth);

      // Compact Summary Box at top of Page 3
      doc.setFillColor(51, 122, 183);
      doc.rect(margin, 60, pageWidth - (margin * 2), 8, 'F');
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Condiciones de Venta", margin + 4, 65.5);

      autoTable(doc, {
        startY: 68,
        body: [
          [{ content: "Valor del equipo", styles: { fillColor: colors.lightBlue, fontStyle: 'bold', textColor: 50, cellWidth: 50, fontSize: 9 } }, `${quote.items?.[0]?.description || 'Equipo'}\n${formatCurrency(quote.total || 0, quote.currency)} + IVA`],
          [{ content: "Forma de pago", styles: { fillColor: colors.lightBlue, fontStyle: 'bold', textColor: 50, fontSize: 9 } }, quote.paymentTerms || "Contado"],
          [{ content: "Disponibilidad", styles: { fillColor: colors.lightBlue, fontStyle: 'bold', textColor: 50, fontSize: 9 } }, quote.deliveryTime || "Inmediata"]
        ],
        theme: 'grid',
        styles: { fontSize: 9.5, cellPadding: 2 }
      });

      const ly = doc.lastAutoTable.finalY + 12;
      doc.setFontSize(11);
      doc.setTextColor(...colors.orange);
      doc.setFont("helvetica", "bold");
      doc.text("CONDICIONES GENERALES DE VENTA", margin, ly);
      doc.setDrawColor(...colors.orange);
      doc.setLineWidth(0.5);
      doc.line(margin, ly + 2, pageWidth - margin, ly + 2);

      // Legal Content Rendering
      doc.setFontSize(7);
      doc.setTextColor(80);
      doc.setFont("helvetica", "normal");

      const legalRaw = quote.conditions || "";
      const legalLines = stripHtml(legalRaw).split('\n');

      let currentY = ly + 8;
      legalLines.forEach(line => {
        if (line.trim() === "") {
          currentY += 2;
          return;
        }
        const lSplit = doc.splitTextToSize(line.trim(), pageWidth - (margin * 2));
        doc.text(lSplit, margin, currentY, { align: 'justify', lineHeightFactor: 1.1 });
        currentY += (lSplit.length * 3) + 1;

        // Basic page overflow handling for legal
        if (currentY > pageHeight - 20) {
          doc.addPage();
          drawHeader(doc, quote, colors, pageWidth);
          currentY = 65;
        }
      });

      drawFooter(doc, pageWidth, pageHeight, colors);
    }

    const fName = `Cotizacion_${quote.quoteNumber || 'DOC'}.pdf`;
    if (returnBlob) return doc.output('blob');
    doc.save(fName);
    return { success: true };

  } catch (error) {
    console.error("💥 [v6.5] FAILED:", error);
    alert("FATAL v6.5: " + error.message);
    return { success: false, error: error.message };
  } finally {
    document.body.style.cursor = 'default';
  }
};
