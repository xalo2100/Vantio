// VERSION 6.8 - CRM CONNECT REFINED
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

console.log("💎 [v6.8] Professional PDF Logic Loaded");

const borderColor = '#072b3f'; // Standard Alfapack Navy

// Improved HTML to Text converter
// Improved HTML to Text converter with better spacing preservation
const stripHtml = (html) => {
  if (!html) return "";
  let text = String(html);

  // Convert list items to bullets
  text = text.replace(/<li[^>]*>/gi, '• ');

  // PRESERVE BOLD/HEADERS as **Text**
  // This regex captures content inside strong, b, or h1-h6 tags
  text = text.replace(/<(strong|b|h[1-6])(?:\s+[^>]*)?>(.*?)<\/\1>/gi, '**$2**');

  // Replace block tags with DOUBLE newline to separate paragraphs clearly
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');

  // Remove all other tags
  text = text.replace(/<[^>]*>/g, '');

  // Decode entities using a textarea hack
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  text = textarea.value;

  // Clean excessive newlines (max 2)
  return text.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
};

const fetchImageAsBase64 = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image base64:', error);
    return null;
  }
};

const getDataUri = (url) => {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('No URL provided'));
    const image = new Image();
    image.setAttribute('crossOrigin', 'anonymous');
    // ... kept for logo backward compatibility if needed, but fetch is preferred
    const timeout = setTimeout(() => {
      image.src = '';
      reject(new Error('Image load timeout (15s exceeded)'));
    }, 15000);

    image.onload = () => {
      clearTimeout(timeout);
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext('2d').drawImage(image, 0, 0);
      try {
        resolve({
          dataUri: canvas.toDataURL('image/png'),
          width: image.naturalWidth,
          height: image.naturalHeight
        });
      } catch (e) {
        reject(new Error('Canvas tainted or export failed: ' + e.message));
      }
    };
    image.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load image: ' + url));
    };
    image.src = url;
  });
};

const getColors = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) || 249;
  const g = parseInt(hex.slice(3, 5), 16) || 115;
  const b = parseInt(hex.slice(5, 7), 16) || 22;
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
    return (showSymbol ? '$ ' : '') + Math.round(amount || 0).toLocaleString('es-CL');
  }
  const symbol = currency === 'EUR' ? '€' : 'U$D';
  return (showSymbol ? symbol + ' ' : '') + (amount || 0).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(',', '.');
};

const drawHeader = (doc, quote, colors, pageWidth, margin = 25) => {
  // Use passed margin
  if (quote.logoBase64) {
    try {
      const maxWidth = 50;
      const maxHeight = 25;
      let width = maxWidth;
      let height = maxHeight;

      if (quote.logoWidth && quote.logoHeight) {
        const ratio = quote.logoWidth / quote.logoHeight;
        if (ratio > maxWidth / maxHeight) {
          height = maxWidth / ratio;
        } else {
          width = maxHeight * ratio;
        }
      }
      doc.addImage(quote.logoBase64, 'PNG', (pageWidth - width) / 2, 8, width, height);
    } catch (e) {
      console.warn("Logo draw failed", e);
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0);
  if (margin === 25 && doc.internal.getCurrentPageInfo().pageNumber === 1) {
    doc.text("COTIZACIÓN", margin, 48);
  }

  doc.setDrawColor(...colors.orange);
  doc.setLineWidth(1.5);
  doc.line(margin, 53, pageWidth - margin, 53);

  // SECTION SEPARATOR (Blue Bar style)
  doc.setFillColor(...colors.blue);
  const barWidth = pageWidth - (margin * 2);
  doc.rect(margin, 58, barWidth, 6, 'F');
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.text("ALFAPACK - SOLUCIONES DE ENVASADO", margin + 4, 62.2);
};

const drawFooter = (doc, pageWidth, pageHeight, colors, branding, margin = 25) => {
  const footerY = pageHeight - 15;
  // Use passed margin

  doc.setDrawColor(...colors.orange);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.setFont("helvetica", "normal");

  const address = branding?.address || "Av. presidente Jorge Alessandri R. Nº 24429, San Bernardo, Santiago";
  const web = branding?.web || branding?.website || "www.alfapack.cl";
  const phone = branding?.phone || "Tel: +56 232333610";

  doc.text(address, pageWidth / 2, footerY, { align: 'center' });

  doc.setTextColor(...colors.blue);
  doc.setFont("helvetica", "bold");
  doc.text(web, pageWidth / 2, footerY + 4, { align: 'center' });

  doc.setTextColor(120);
  doc.setFont("helvetica", "normal");
  doc.text(phone, pageWidth / 2, footerY + 8, { align: 'center' });
};

export const generateQuotePDF = async (quoteData, branding = {}, template = 'technical', returnBlob = false) => {
  const logoUrl = typeof branding === 'string' ? branding : branding?.logo_url || branding?.logo;
  const brandingInfo = typeof branding === 'object' ? branding : {};
  console.log("🚀 [v6.8] Generation Starting...");
  try {
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'wait';
    }
  } catch (e) { }

  try {
    const quote = { ...quoteData };
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const colors = getColors(quote.headerBorderColor || borderColor);
    const margin = 25;

    if (quote.organizationLogo) {
      try {
        const logoData = await getDataUri(quote.organizationLogo);
        quote.logoBase64 = logoData.dataUri;
        quote.logoWidth = logoData.width;
        quote.logoHeight = logoData.height;
      } catch (e) {
        console.warn("Could not load logo to data URI:", e);
      }
    }

    // Process Product Image if available (for the first item)
    console.log("🔍 Checking for Product Image:", quote.items?.[0]?.productMainImage);
    if (quote.items?.[0]?.productMainImage) {
      try {
        const url = quote.items[0].productMainImage;
        const base64 = await fetchImageAsBase64(url);
        if (base64) {
          quote.productImageBase64 = base64;
          // dummy load to get dims
          const img = new Image();
          img.src = base64;
          await new Promise(r => img.onload = r);
          quote.productImageWidth = img.width;
          quote.productImageHeight = img.height;
          console.log("✅ Product Image Loaded (Fetch):", { w: img.width, h: img.height });
        }
      } catch (e) {
        console.warn("❌ Could not load product image:", e);
      }
    }

    // --- PAGE 1: METADATA & SPECS ---
    drawHeader(doc, quote, colors, pageWidth, margin);

    let metadataY = 72; // Moved down from 63 to avoid overlap with blue bar (ends at 64)
    const drawMetadataRow = (label, value) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(0);
      doc.text(label, margin, metadataY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.blue);
      const wrappedValue = doc.splitTextToSize(`: ${value}`, pageWidth - margin - 60);
      doc.text(wrappedValue, margin + 35, metadataY);
      metadataY += (wrappedValue.length * 6) + 1;
    };

    drawMetadataRow("Cotización Nº", quote.quoteNumber || quote.quote_number || 'XXXXX');
    drawMetadataRow("Fecha", quote.date || new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }));

    // Executive block
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Ejecutivo", margin, metadataY);
    doc.setTextColor(...colors.blue);
    const execText = `: ${quote.salesPerson || '-'} / Cel: ${quote.salesPhone || '-'} / Email: ${quote.salesEmail || '-'}`;
    const wrappedExec = doc.splitTextToSize(execText, pageWidth - margin - 60);
    doc.text(wrappedExec, margin + 35, metadataY);
    metadataY += (wrappedExec.length * 6) + 6;

    drawMetadataRow("Empresa", quote.companyName || quote.clientName || '-');
    drawMetadataRow("RUT", quote.clientRut || '-');
    drawMetadataRow("Contacto", quote.clientName || '-');
    drawMetadataRow("Teléfono", quote.clientPhone || '-');
    drawMetadataRow("Ciudad", quote.clientCity || 'Santiago');

    metadataY += 8;
    doc.setDrawColor(...colors.blue);
    doc.setLineWidth(0.8);
    doc.line(margin, metadataY, pageWidth - margin, metadataY);
    metadataY += 12;

    // Standardized Font Size: 10.5 for uniformity
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Equipo", margin, metadataY);
    doc.setTextColor(...colors.blue);
    const itemName = quote.items?.[0]?.name || quote.projectName || 'EQUIPO';
    doc.text(`: ${String(itemName).toUpperCase()}`, margin + 35, metadataY); // Aligned with metadata
    metadataY += 8;

    doc.setTextColor(0);
    doc.text("Modelo", margin, metadataY);
    doc.setTextColor(...colors.blue);
    const modelName = quote.items?.[0]?.productModel || quote.items?.[0]?.name || 'N/A';
    doc.text(`: ${modelName}`, margin + 35, metadataY); // Aligned with metadata
    metadataY += 10;

    doc.setDrawColor(...colors.blue);
    doc.setLineWidth(1.2);
    doc.line(margin, metadataY, pageWidth - margin, metadataY);
    metadataY += 15;

    doc.setFontSize(10.5); // Standardized
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Especificaciones:", margin, metadataY);
    metadataY += 8;


    // Specifications List (LEFT COLUMN)
    const hasProductImage = !!quote.productImageBase64;

    // Force 2 columns if image exists: Specs (55%) | Image (45%)
    const col1Width = hasProductImage ? (pageWidth * 0.55) - margin : pageWidth - (margin * 2);
    const col2X = margin + col1Width + 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    const rawSpecs = quote.items?.[0]?.productTechnicalSpecs || "";
    const cleanSpecsLines = stripHtml(rawSpecs).split('\n').filter(s => s.trim() !== "");

    // Draw Specs
    const specsStartY = metadataY;
    let currentSpecY = metadataY;

    cleanSpecsLines.slice(0, 18).forEach((s) => {
      const lineText = s.trim();
      // Increase bullet hanging indent
      const wrappedLines = doc.splitTextToSize(lineText, col1Width - 5);

      doc.setTextColor(...colors.orange);
      doc.text("•", margin, currentSpecY);

      doc.setTextColor(60);
      doc.text(wrappedLines, margin + 5, currentSpecY);

      currentSpecY += (wrappedLines.length * 5) + 3; // More breathing room
    });

    // Draw Image (RIGHT COLUMN)
    if (hasProductImage) {
      try {
        // Center image in the right column
        const availableWidth = pageWidth - col2X - margin;
        const availableHeight = 85; // Max height similar to specs block

        let imgWidth = availableWidth;
        let imgHeight = 80;

        if (quote.productImageWidth && quote.productImageHeight) {
          const ratio = quote.productImageWidth / quote.productImageHeight;
          imgHeight = imgWidth / ratio;

          if (imgHeight > availableHeight) {
            imgHeight = availableHeight;
            imgWidth = imgHeight * ratio;
          }
        }

        // Center horizontally in its column
        const finalX = col2X + ((availableWidth - imgWidth) / 2);
        // Align top with specs
        const finalY = specsStartY;

        // Determine format from base64 header
        let format = 'PNG';
        if (quote.productImageBase64.includes('image/jpeg') || quote.productImageBase64.includes('image/jpg')) {
          format = 'JPEG';
        }
        // Note: getDataUri forces PNG, so this is mostly defensive if source logic changes

        console.log("✍️ Drawing Product Image:", {
          format,
          finalX: finalX.toFixed(2),
          finalY: finalY.toFixed(2),
          w: imgWidth.toFixed(2),
          h: imgHeight.toFixed(2)
        });

        try {
          doc.addImage(quote.productImageBase64, format, finalX, finalY, imgWidth, imgHeight);
        } catch (innerImgErr) {
          console.error("Failed to render image with specific format, trying fallback...", innerImgErr);
          // Fallback without specifying format/compression
          doc.addImage(quote.productImageBase64, finalX, finalY, imgWidth, imgHeight);
        }
      } catch (e) {
        console.error("Image draw error", e);
      }
    }

    // End of image block replacement

    drawFooter(doc, pageWidth, pageHeight, colors, brandingInfo, margin);

    // --- PAGE 2: ITEMS TABLE ---
    doc.addPage();
    drawHeader(doc, quote, colors, pageWidth, margin);

    doc.text("DETALLE DE LA PROPUESTA", margin, 75);

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
      startY: 81,
      head: [['Descripción / Equipo', 'Cant.', 'Precio Unit.', 'Total']],
      body: itemsData,
      theme: 'grid',
      headStyles: { fillColor: [7, 43, 63], textColor: 255, halign: 'center', fontStyle: 'bold' },
      styles: { fontSize: 8.5, textColor: 50 },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { halign: 'center' }
      }
    });

    const totalsY = doc.lastAutoTable.finalY + 10;
    const renderTotal = (label, value, refVal, y, bold = false) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(50);
      doc.text(label, pageWidth - margin - 55, y);
      doc.text(value, pageWidth - margin, y, { align: 'right' });
      if (refVal) {
        doc.setFontSize(8);
        doc.setTextColor(...colors.orange);
        doc.text(`Ref. ${refVal}`, pageWidth - margin, y + 4, { align: 'right' });
      }
    };

    let sRef, xRef, fRef;
    if (quote.currency !== 'CLP' && quote.exchangeRate > 0) {
      sRef = formatCurrency((quote.subtotal || 0) * quote.exchangeRate, 'CLP');
      xRef = formatCurrency((quote.tax || 0) * quote.exchangeRate, 'CLP');
      fRef = formatCurrency((quote.total || 0) * quote.exchangeRate, 'CLP');
    }

    renderTotal("Subtotal:", formatCurrency(quote.subtotal || 0, quote.currency), sRef, totalsY);
    renderTotal("IVA (19%):", formatCurrency(quote.tax || 0, quote.currency), xRef, totalsY + 10);
    renderTotal("TOTAL:", formatCurrency(quote.total || 0, quote.currency), fRef, totalsY + 20, true);

    drawFooter(doc, pageWidth, pageHeight, colors, brandingInfo, margin);

    // --- PAGE 3: CONDITIONS & BANK ---
    doc.addPage();
    drawHeader(doc, quote, colors, pageWidth, margin);

    doc.setFillColor(51, 122, 183);
    const tableWidth = pageWidth - (margin * 2);
    // Draw the blue bar with the EXACT width and position as the table
    doc.rect(margin, 75, tableWidth, 9, 'F');
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("Condiciones de Venta", margin + 5, 81);

    autoTable(doc, {
      startY: 84,
      body: [
        [{ content: "Valor del equipo", styles: { fillColor: colors.lightBlue, fontStyle: 'bold', textColor: 50, cellWidth: 50, fontSize: 9 } }, `${formatCurrency(quote.total || 0, quote.currency)} + IVA`],
        [{ content: "Forma de pago", styles: { fillColor: colors.lightBlue, fontStyle: 'bold', textColor: 50, fontSize: 9 } }, quote.paymentTerms || "Contado"],
        [{ content: "Disponibilidad", styles: { fillColor: colors.lightBlue, fontStyle: 'bold', textColor: 50, fontSize: 9 } }, quote.deliveryTime || "Inmediata"]
      ],
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: { fontSize: 9.5, cellPadding: 2 }
    });

    const ly = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0); // BLACK as requested
    doc.setFont("helvetica", "bold");
    doc.text("CONDICIONES GENERALES DE LA VENTA", margin, ly);
    // doc.setDrawColor(...colors.orange);
    // doc.setLineWidth(0.5);
    // doc.line(margin, ly + 2, pageWidth - margin, ly + 2);

    doc.setFontSize(8.5);
    doc.setTextColor(80);
    doc.setFont("helvetica", "normal");

    doc.setFontSize(8.5);
    doc.setTextColor(80);
    doc.setFont("helvetica", "normal");

    // AUTOMATICALLY EXTRACT "Validez" line to move it to Notes if present
    let rawConditions = quote.conditions || quote.salesTerms || "";

    // 1. VALIDEZ: Keep it in place but make it BOLD (**Text**)
    // Regex to find "Validez de la oferta..." and wrap it in **
    const validezRegex = /(Validez de la oferta.*?)(?=\n|$|<\/p>|<br>)/i;
    // We only replace to wrap in asterisks, we do NOT remove it.
    if (validezRegex.test(rawConditions)) {
      rawConditions = rawConditions.replace(validezRegex, "**$1**");
    }

    // 2. STRIP MANUAL BANK INFO (User dislikes the "simple" text version, prefers our Auto Block)
    // We remove common phrases they type manually so they don't print twice.
    const bankPhrases = [
      /Orden de compra a[\s\S]*?(\n\n|$)/i,
      /Cuenta Corriente[\s\S]*?(\n\n|$)/i,
      /Banco Itau/i,
      /77\.594\.656-\s*3/g,
      /Condiciones Generales de la Venta/i
    ];

    bankPhrases.forEach(regex => {
      rawConditions = rawConditions.replace(regex, "");
    });

    const legalLines = stripHtml(rawConditions).split('\n');

    let currentY = ly + 8;
    const footerMargin = 40; // Increased safety margin for footer

    legalLines.forEach(line => {
      let trimmed = line.trim();
      let isBold = false;

      // Check for BOLD marker (**Text**)
      // We look for roughly the pattern **...** but be careful of split lines
      // Simple heuristic: if the raw line from split starts/ends with **, treat as title
      // But wrapping might split it. 
      // Better: check if the PARAGRAPH (line) was marked bold.
      // Improved Bold Detection: Check inclusion, not just start/end
      if (trimmed.includes('**')) {
        isBold = true;
        trimmed = trimmed.replace(/\*\*/g, '').trim(); // Regex strip all asterisks
      }

      if (trimmed === "") {
        // Only add space if we are not at the top of a page (Y=75 is start)
        if (currentY > 75) currentY += 4;
        return;
      }

      if (isBold) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9); // Slightly larger/same for bold
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
      }



      const lSplit = doc.splitTextToSize(trimmed, pageWidth - (margin * 2));

      // Iterate over each wrapped line to ensure page breaks happen EXACTLY where needed
      lSplit.forEach((splitLine, index) => {
        // Check if adding this single line would exceed margins
        if (currentY + 5 > pageHeight - 50) {
          drawFooter(doc, pageWidth, pageHeight, colors, brandingInfo, margin);
          doc.addPage();
          drawHeader(doc, quote, colors, pageWidth, margin);
          currentY = 75;
          // Reset font state after page break if needed (though jspdf keeps it)
          // CRITICAL FIX: drawHeader sets textColor to White. We must reset it to Grey.
          doc.setTextColor(80);
          if (isBold) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
          } else {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
          }
        }

        doc.text(splitLine, margin, currentY, {
          align: 'left',
          maxWidth: pageWidth - (margin * 2),
          lineHeightFactor: 1.15
        });
        currentY += 4; // Line spacing
      });

      // Reset font back to normal just in case
      doc.setFont("helvetica", "normal");

      // Add extra spacing after paragraph ends
      currentY += 2;
    });

    // --- RENDER ADDITIONAL NOTES ---
    // --- RENDER ADDITIONAL NOTES ---
    // User requested specific Company/Bank info to ALWAYS appear here
    // "Orden de compra a ... Inversiones Lo Herrera... Banco Itau..."

    const hardcodedBankText = `Orden de compra a
Inversiones Lo Herrera SpA
77.594.656- 3
Presidente Jorge Alessandri R. 24429, San Bernardo – Santiago
Tel. + 56 2 3233 3610
Venta de maquinarias y Servicios de envasado
pagos@alfapack.cl
Cuenta Corriente
Banco Itau
Cuenta Corriente 0224316361
Rut: 77.594.656 - 3
Inversiones Lo Herrera SpA`.trim();

    // Combine user notes + fixed text
    // If user notes already exist, we append. If not, we just use fixed text.
    let fullNotes = (quote.notes || "").trim();

    // Avoid duplication if the text is partially there (unlikely if we strip it, but safe to check)
    // if (!fullNotes.includes("0224316361")) {
    //   if (fullNotes) fullNotes += "\n\n";
    //   fullNotes += hardcodedBankText;
    // }

    if (fullNotes !== "") {
      // Check for title space (approx 25 units needed for title + some text)
      // Relaxed buffer: Allow printing closer to bottom (margin 30 instead of 50)
      if (currentY + 25 > pageHeight - 30) {
        drawFooter(doc, pageWidth, pageHeight, colors, brandingInfo, margin);
        doc.addPage();
        drawHeader(doc, quote, colors, pageWidth, margin);
        currentY = 75;
        doc.setTextColor(80); // Reset color to grey
      }

      // Draw Title Background
      const titleWidth = pageWidth - (margin * 2);
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, currentY, titleWidth, 7, 'F');

      doc.setFontSize(9);
      doc.setFont("helvetica", "boldItalic");
      doc.setTextColor(...colors.blue);
      doc.text("Notas / Adicionales:", margin + 3, currentY + 5);
      currentY += 10;

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(60);

      const noteLines = doc.splitTextToSize(fullNotes, pageWidth - (margin * 2) - 5);

      // Line-by-line pagination for notes too
      noteLines.forEach((splitLine) => {
        if (currentY + 5 > pageHeight - 50) {
          drawFooter(doc, pageWidth, pageHeight, colors, brandingInfo, margin);
          doc.addPage();
          drawHeader(doc, quote, colors, pageWidth, margin);
          currentY = 75;
        }
        doc.text(splitLine, margin, currentY);
        currentY += 4;
      });
      currentY += 5;
    }

    // Define fixed height for bank block
    // Define fixed height for bank block
    const bankBlockHeight = 45;

    // CHECK IF BANK BLOCK FITS ON CURRENT PAGE
    if (currentY + bankBlockHeight + 35 > pageHeight) { // 35 includes margin/footer space
      drawFooter(doc, pageWidth, pageHeight, colors, brandingInfo, margin);
      doc.addPage();
      drawHeader(doc, quote, colors, pageWidth, margin);
      currentY = 75; // Reset top margin
    }

    let bankY = currentY + 10;
    // Removed Math.max logic to prevent pushing to bottom
    // if (pageHeight - bankBlockHeight - 25 > bankY) {
    //   bankY = Math.max(bankY, pageHeight - bankBlockHeight - 25);
    // }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Orden de compra a", margin, bankY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text([
      "Inversiones Lo Herrera SpA",
      "77.594.656- 3",
      "Presidente Jorge Alessandri R. 24429, San Bernardo – Santiago",
      "Tel. + 56 2 3233 3610",
      "Venta de maquinarias y Servicios de envasado",
      "pagos@alfapack.cl"
    ], margin, bankY + 5);

    const bankX = margin + 100;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Cuenta Corriente", bankX, bankY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text([
      "Banco Itau",
      "Cuenta Corriente 0224316361",
      "Rut: 77.594.656 - 3",
      "Inversiones Lo Herrera SpA"
    ], bankX, bankY + 5);

    drawFooter(doc, pageWidth, pageHeight, colors, brandingInfo, margin);

    const fName = `Cotizacion_${quote.quoteNumber || 'DOC'}.pdf`;
    if (returnBlob) return doc.output('blob');

    // Abrir en nueva pestaña en lugar de solo descargar
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');

    // También descargar opcionalmente si se prefiere
    // doc.save(fName);

    return { success: true };

  } catch (error) {
    console.error("💥 [v6.8] FAILED:", error);
    if (typeof alert !== 'undefined') {
      const detail = error.message || error.error_description || (typeof error === 'string' ? error : 'Error desconocido');
      alert('Error al generar la cotización: ' + detail);
    }
    return { success: false, error: error.message };
  } finally {
    try {
      if (typeof document !== 'undefined') {
        document.body.style.cursor = 'default';
      }
    } catch (e) { }
  }
};

/**
 * Generar PDF para Nota de Venta (Orden de Compra Interna)
 */
export const generateSalesNotePDF = async (noteData, branding = {}, returnBlob = false) => {
  const logoUrl = typeof branding === 'string' ? branding : branding?.logo_url || branding?.logo;
  const brandingInfo = typeof branding === 'object' ? branding : {};
  console.log("🚀 Generating Sales Note PDF...");
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const colors = getColors(borderColor);

    // Header - Logo and Company Info
    const organizationLogo = brandingInfo?.logo_url || brandingInfo?.logo || logoUrl;
    if (organizationLogo) {
      try {
        const logoData = await getDataUri(organizationLogo);
        const maxWidth = 50;
        const maxHeight = 25;
        let logoW = maxWidth;
        let logoH = maxHeight;

        if (logoData.width && logoData.height) {
          const ratio = logoData.width / logoData.height;
          if (ratio > maxWidth / maxHeight) {
            logoH = maxWidth / ratio;
          } else {
            logoW = maxHeight * ratio;
          }
        }
        doc.addImage(logoData.dataUri, 'PNG', margin, 10, logoW, logoH);
      } catch (e) {
        console.warn("Logo load failed", e);
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...colors.orange);
    doc.text("NOTA DE VENTA", pageWidth / 2, 48, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Versión 2025-01", pageWidth / 2, 53, { align: 'center' });

    doc.setDrawColor(...colors.orange);
    doc.setLineWidth(1.5);
    doc.line(margin, 58, pageWidth - margin, 58);

    doc.setFontSize(10);
    doc.text(`N°: ${noteData.number || noteData.note_number || 'BORRADOR'}`, pageWidth - margin, 26, { align: 'right' });
    doc.text(`Fecha: ${new Date(noteData.created_at).toLocaleDateString('es-CL')}`, pageWidth - margin, 31, { align: 'right' });

    // Company Details (Center)
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const companyLines = [
      brandingInfo?.name || "Alfapack SpA",
      brandingInfo?.slogan || "Soluciones Industriales",
      brandingInfo?.address || "Av. Presidente Jorge Alessandri R. 24429, San Bernardo, Santiago",
      `Telefono: ${brandingInfo?.phone || "+569 1234 5678"} | ${brandingInfo?.email || "contacto@alfapack.cl"}`,
      brandingInfo?.website || brandingInfo?.web || "www.alfapack.cl"
    ];
    companyLines.forEach((line, i) => {
      doc.text(line, pageWidth / 2, 38 + (i * 4), { align: 'center' });
    });

    // Client Section
    doc.setFillColor(...colors.blue);
    doc.rect(margin, 45, pageWidth - (margin * 2), 6, 'F');
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("CLIENTE", margin + 2, 49.5);

    doc.setDrawColor(...colors.blue);
    doc.setLineWidth(0.5);
    doc.rect(margin, 51, pageWidth - (margin * 2), 35);

    doc.setTextColor(0);
    doc.setFontSize(8.5);
    const clientY = 57;
    const col2Offset = 100;

    doc.text("Cliente:", margin + 5, clientY);
    doc.setFont("helvetica", "normal");
    doc.text(noteData.client_name || '-', margin + 25, clientY);

    doc.setFont("helvetica", "bold");
    doc.text("RUT:", margin + 5, clientY + 6);
    doc.setFont("helvetica", "normal");
    doc.text(noteData.client_rut || '-', margin + 25, clientY + 6);

    doc.setFont("helvetica", "bold");
    doc.text("Giro:", margin + 5, clientY + 12);
    doc.setFont("helvetica", "normal");
    doc.text(noteData.client_giro || '-', margin + 25, clientY + 12);

    doc.setFont("helvetica", "bold");
    doc.text("Email:", margin + 5, clientY + 18);
    doc.setFont("helvetica", "normal");
    doc.text(noteData.client_email || '-', margin + 25, clientY + 18);

    doc.setFont("helvetica", "bold");
    doc.text("Dirección:", margin + 5, clientY + 24);
    doc.setFont("helvetica", "normal");
    doc.text(noteData.client_address || '-', margin + 25, clientY + 24);

    // Column 2
    doc.setFont("helvetica", "bold");
    doc.text("Vendedor:", margin + col2Offset, clientY);
    doc.setFont("helvetica", "normal");
    doc.text(noteData.quote?.seller?.full_name || '-', margin + col2Offset + 25, clientY);

    doc.setFont("helvetica", "bold");
    doc.text("Cotización:", margin + col2Offset, clientY + 6);
    doc.setFont("helvetica", "normal");
    doc.text(noteData.quote?.quote_number || '-', margin + col2Offset + 25, clientY + 6);

    doc.setFont("helvetica", "bold");
    doc.text("Forma Pago:", margin + col2Offset, clientY + 12);
    doc.setFont("helvetica", "normal");
    doc.text(noteData.payment_method || '-', margin + col2Offset + 25, clientY + 12);

    // Items Table
    const items = noteData.items || noteData.quote?.items || [];
    const itemsData = items.map(item => [
      item.productSku || '.',
      item.description || '-',
      item.quantity || 1,
      formatCurrency(item.unitPrice || 0, 'CLP'),
      formatCurrency((item.quantity || 1) * (item.unitPrice || 0), 'CLP')
    ]);

    autoTable(doc, {
      startY: 95,
      head: [['Código', 'Descripción', 'Cant.', 'Precio Unit.', 'Total']],
      body: itemsData,
      theme: 'grid',
      headStyles: { fillColor: colors.blue, textColor: 255, halign: 'center' },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
    });

    // Totals and Comments
    const finalY = doc.lastAutoTable.finalY + 10;

    // Comments box
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.rect(margin, finalY, 110, 30);
    doc.setFillColor(...colors.blue);
    doc.rect(margin, finalY - 6, 110, 6, 'F');
    doc.setTextColor(255);
    doc.text("Comentarios", margin + 2, finalY - 2);

    doc.setTextColor(50);
    const commentLines = doc.splitTextToSize(noteData.comments || '-', 100);
    doc.text(commentLines, margin + 5, finalY + 7);

    // Totals box
    const totalX = pageWidth - margin - 60;
    const totalY = finalY;
    const drawTotalRow = (label, value, y, isBold = false) => {
      doc.setFillColor(...colors.blue);
      doc.rect(totalX, y, 30, 6, 'F');
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.text(label, totalX + 2, y + 4.5);

      doc.setTextColor(0);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.text(value, pageWidth - margin - 2, y + 4.5, { align: 'right' });
      doc.setDrawColor(0);
      doc.rect(totalX, y, 60, 6);
    };

    drawTotalRow("Subtotal", formatCurrency(noteData.subtotal || 0, 'CLP'), totalY);
    drawTotalRow("IVA (19%)", formatCurrency(noteData.tax || 0, 'CLP'), totalY + 6);
    drawTotalRow("TOTAL", formatCurrency(noteData.total || 0, 'CLP'), totalY + 12, true);

    drawFooter(doc, pageWidth, pageHeight, colors);

    if (returnBlob) return doc.output('blob');

    // Abrir en nueva pestaña
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');

    // doc.save(`Nota_Venta_${noteData.number || 'DOC'}.pdf`);
    return { success: true };

  } catch (error) {
    console.error("Error generating sales note PDF:", error);
    return { success: false, error: error.message };
  }
};
