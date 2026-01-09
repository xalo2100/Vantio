import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Helper to convert images to base64
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
    gray: [107, 114, 128],
    lightGray: [243, 244, 246]
  };
};

const formatCurrency = (amount, currency = 'CLP') => {
  if (currency === 'CLP') {
    return '$ ' + Math.round(amount).toLocaleString('es-CL');
  }
  const symbol = currency === 'EUR' ? '€' : 'USD';
  return symbol + ' ' + amount.toLocaleString('es-CL', { minimumFractionDigits: 2 });
};

const generateStandardPDF = async (doc, quote, colors) => {
  const margin = 15;
  doc.setFontSize(20);
  doc.setTextColor(...colors.primary);
  doc.text(`COTIZACIÓN #${quote.quoteNumber || quote.quote_number || 'DOC'}`, margin, margin + 10);

  const tableData = (quote.items || []).map(item => [
    item.description || item.name || 'Sin descripción',
    item.quantity || 1,
    formatCurrency(item.unitPrice || item.unit_price || 0, quote.currency),
    formatCurrency((item.quantity || 1) * (item.unitPrice || item.unit_price || 0), quote.currency)
  ]);

  doc.autoTable({
    startY: margin + 25,
    head: [['Descripción', 'Cant.', 'P. Unitario', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: colors.primary }
  });
};

const generateTechnicalPDF = async (doc, quote, colors) => {
  const margin = 15;
  doc.setFontSize(18);
  doc.setTextColor(...colors.primary);
  doc.text(`COTIZACIÓN #${quote.quoteNumber || quote.quote_number || 'DOC'}`, margin, margin + 10);

  // Client Info
  doc.setFontSize(10);
  doc.setTextColor(...colors.gray);
  doc.text('CLIENTE:', margin, margin + 25);
  doc.setTextColor(0, 0, 0);
  doc.text(quote.clientName || 'N/A', margin + 20, margin + 25);

  const tableData = (quote.items || []).map(item => [
    item.description || item.name || 'Sin descripción',
    item.quantity || 1,
    formatCurrency(item.unitPrice || item.unit_price || 0, quote.currency),
    formatCurrency((item.quantity || 1) * (item.unitPrice || item.unit_price || 0), quote.currency)
  ]);

  doc.autoTable({
    startY: margin + 35,
    head: [['Ítem', 'Cant.', 'Precio', 'Subtotal']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: colors.primary }
  });
};

export const generateQuotePDF = async (quoteData, borderColor = '#F97316', template = 'technical', returnBlob = false) => {
  console.log("🚀 [v5.6] PDF Generation Started");
  document.body.style.cursor = 'wait';

  try {
    const quote = quoteData || {};
    const doc = new jsPDF();
    const colors = getColors(quote.headerBorderColor || borderColor);

    if (quote.organizationLogo) {
      try {
        const base64 = await getDataUri(quote.organizationLogo);
        if (base64) quote.logoBase64 = base64;
      } catch (e) {
        console.warn("Logo conversion failed:", e);
      }
    }

    if (template === 'standard') {
      await generateStandardPDF(doc, quote, colors);
    } else {
      await generateTechnicalPDF(doc, quote, colors);
    }

    if (returnBlob) return doc.output('blob');

    const rawNumber = quote.quoteNumber || quote.quote_number || 'DOC';
    const cleanNumber = String(rawNumber).replace(/[^a-zA-Z0-9]/g, '');
    const finalFileName = `Cotizacion_${cleanNumber}.pdf`;

    console.log("💾 [v5.6] Saving as:", finalFileName);

    // Direct save - most reliable standard method
    doc.save(finalFileName);

    return { success: true };
  } catch (error) {
    console.error("💥 [v5.6] CRITICAL ERROR:", error);
    return { success: false, error: error.message };
  } finally {
    document.body.style.cursor = 'default';
  }
};
