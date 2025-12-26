/**
 * Email Template for AlfaQuote
 * Generates HTML email for sending quotes to clients
 */

export const generateQuoteEmailHTML = (quote, micrositeUrl, customMessage = '') => {
    const formattedDate = new Date(quote.createdAt).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    const validUntilFormatted = quote.validUntil
        ? new Date(quote.validUntil).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
        : null;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cotización ${quote.quoteNumber}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #F7F3E9;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .header {
            background: linear-gradient(135deg, #0A4D4E 0%, #0D6365 100%);
            padding: 40px 20px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 32px;
            font-weight: bold;
        }
        .header p {
            color: #F7F3E9;
            margin: 8px 0 0 0;
            font-size: 14px;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            color: #0A4D4E;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .message {
            color: #333333;
            line-height: 1.6;
            margin-bottom: 30px;
            font-size: 15px;
        }
        .quote-info {
            background-color: #F7F3E9;
            border-left: 4px solid #FF6B35;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        .quote-info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 14px;
        }
        .quote-info-row:last-child {
            margin-bottom: 0;
        }
        .quote-info-label {
            color: #666666;
            font-weight: 500;
        }
        .quote-info-value {
            color: #0A4D4E;
            font-weight: 700;
        }
        .total-row {
            border-top: 2px solid #0A4D4E;
            padding-top: 12px;
            margin-top: 12px;
        }
        .total-value {
            color: #FF6B35;
            font-size: 24px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #FF6B35 0%, #FF8555 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 40px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .footer {
            background-color: #0A4D4E;
            color: #F7F3E9;
            padding: 30px 20px;
            text-align: center;
            font-size: 13px;
        }
        .footer p {
            margin: 5px 0;
        }
        .footer-link {
            color: #FF6B35;
            text-decoration: none;
        }
        .divider {
            height: 1px;
            background-color: #e0e0e0;
            margin: 30px 0;
        }
        @media only screen and (max-width: 600px) {
            .content {
                padding: 30px 20px;
            }
            .quote-info {
                padding: 15px;
            }
            .cta-button {
                padding: 14px 30px;
                font-size: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>AlfaQuote</h1>
            <p>Cotización Profesional</p>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="greeting">
                Hola ${quote.clientName},
            </div>

            ${customMessage ? `
                <div class="message">
                    ${customMessage.replace(/\n/g, '<br>')}
                </div>
            ` : `
                <div class="message">
                    Nos complace enviarte la cotización para <strong>${quote.projectName}</strong>. 
                    Hemos preparado una propuesta detallada que esperamos sea de tu interés.
                </div>
            `}

            <!-- Quote Information -->
            <div class="quote-info">
                <div class="quote-info-row">
                    <span class="quote-info-label">Número de Cotización:</span>
                    <span class="quote-info-value">${quote.quoteNumber}</span>
                </div>
                <div class="quote-info-row">
                    <span class="quote-info-label">Proyecto:</span>
                    <span class="quote-info-value">${quote.projectName}</span>
                </div>
                <div class="quote-info-row">
                    <span class="quote-info-label">Fecha:</span>
                    <span class="quote-info-value">${formattedDate}</span>
                </div>
                ${validUntilFormatted ? `
                    <div class="quote-info-row">
                        <span class="quote-info-label">Válida hasta:</span>
                        <span class="quote-info-value">${validUntilFormatted}</span>
                    </div>
                ` : ''}
                <div class="quote-info-row total-row">
                    <span class="quote-info-label">Total:</span>
                    <span class="quote-info-value total-value">$${quote.total.toFixed(2)}</span>
                </div>
            </div>

            <div class="message">
                Puedes revisar todos los detalles, aceptar o rechazar la cotización directamente desde nuestro portal interactivo.
            </div>

            <!-- CTA Button -->
            <div class="button-container">
                <a href="${micrositeUrl}" class="cta-button">
                    Ver Cotización Completa
                </a>
            </div>

            <div class="divider"></div>

            <div class="message" style="font-size: 13px; color: #666;">
                Si tienes alguna pregunta o necesitas modificaciones, no dudes en contactarnos. 
                Estamos aquí para ayudarte.
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>AlfaQuote v2.0</strong></p>
            <p>Plataforma de Cotizaciones Profesionales</p>
            <p style="margin-top: 15px; font-size: 12px;">
                Este es un correo automático, por favor no respondas a esta dirección.
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();
};

export const generateQuoteEmailText = (quote, micrositeUrl, customMessage = '') => {
    const formattedDate = new Date(quote.createdAt).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    const validUntilFormatted = quote.validUntil
        ? new Date(quote.validUntil).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
        : null;

    return `
AlfaQuote - Cotización Profesional

Hola ${quote.clientName},

${customMessage || `Nos complace enviarte la cotización para ${quote.projectName}. Hemos preparado una propuesta detallada que esperamos sea de tu interés.`}

INFORMACIÓN DE LA COTIZACIÓN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Número de Cotización: ${quote.quoteNumber}
Proyecto: ${quote.projectName}
Fecha: ${formattedDate}
${validUntilFormatted ? `Válida hasta: ${validUntilFormatted}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: $${quote.total.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Puedes revisar todos los detalles, aceptar o rechazar la cotización directamente desde nuestro portal:

${micrositeUrl}

Si tienes alguna pregunta o necesitas modificaciones, no dudes en contactarnos.

---
AlfaQuote v2.0
Plataforma de Cotizaciones Profesionales
    `.trim();
};
