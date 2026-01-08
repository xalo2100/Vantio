import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      })
    }

    const { pdfBase64, organizationId } = await req.json()

    if (!pdfBase64) {
      throw new Error('PDF file is required')
    }

    if (!organizationId) {
      throw new Error('Organization ID is required')
    }

    console.log('Received PDF, size:', pdfBase64.length)

    // Get Gemini API key from database using direct SQL query
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    const settingsResponse = await fetch(
      `${supabaseUrl}/rest/v1/organization_settings?organization_id=eq.${organizationId}&select=gemini_api_key`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        }
      }
    )

    const settings = await settingsResponse.json()

    if (!settings || settings.length === 0 || !settings[0]?.gemini_api_key) {
      throw new Error('API key de Gemini no configurada. Por favor configúrala en Settings → API Key de Gemini AI')
    }

    const GEMINI_API_KEY = settings[0].gemini_api_key

    // Decode base64 PDF
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))
    
    console.log('Decoded PDF bytes:', pdfBytes.length)
    
    // Extract text from PDF using a simple approach
    const decoder = new TextDecoder('utf-8', { fatal: false })
    let rawText = decoder.decode(pdfBytes)
    
    // Extract readable text between stream objects
    const textMatches = rawText.match(/\(([^)]+)\)/g) || []
    let extractedText = textMatches
      .map(match => match.slice(1, -1))
      .join(' ')
      .replace(/\\[nrt]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    console.log('Extracted text length:', extractedText.length)
    console.log('First 500 chars:', extractedText.substring(0, 500))

    if (!extractedText || extractedText.length < 20) {
      throw new Error('No se pudo extraer texto del PDF. El archivo puede estar vacío, ser una imagen escaneada, o estar protegido.')
    }

    // Call Gemini AI to extract product data
    const prompt = `Extrae información de producto de este texto de cotización y devuelve SOLO un objeto JSON válido con estos campos exactos:
{
  "name": "nombre del producto",
  "description": "descripción detallada del producto",
  "model": "número de modelo o SKU",
  "technical_specs": "especificaciones técnicas como texto",
  "unit_price": valor numérico del precio,
  "currency": "CLP" o "USD" o "EUR"
}

Reglas:
- Devuelve SOLO el objeto JSON, sin texto adicional
- Si no encuentras un campo, usa string vacío "" para campos de texto o 0 para unit_price
- unit_price debe ser un número sin símbolos de moneda
- Extrae la información de producto más relevante

Texto a analizar:
${extractedText.substring(0, 8000)}
`

    console.log('Calling Gemini AI...')

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          }
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Gemini API error:', error)
      throw new Error('Error al procesar con IA: ' + error)
    }

    const data = await response.json()
    const generatedText = data.candidates[0]?.content?.parts[0]?.text

    console.log('Gemini response:', generatedText)

    if (!generatedText) {
      throw new Error('No se recibió respuesta de la IA')
    }

    // Parse the JSON response
    let productData
    try {
      const cleanText = generatedText.replace(/```json\n?|\n?```/g, '').trim()
      productData = JSON.parse(cleanText)
    } catch (e) {
      console.error('Failed to parse AI response:', generatedText)
      throw new Error('Error al interpretar la respuesta de la IA')
    }

    // Validate required fields
    if (!productData.name && !productData.description) {
      throw new Error('No se pudo extraer información de producto del PDF')
    }

    console.log('Successfully extracted product data:', productData)

    return new Response(
      JSON.stringify({
        success: true,
        data: productData
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error desconocido al procesar el PDF'
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
})
