import React, { useState } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { geminiRateLimiter } from '../utils/geminiRateLimiter';

const PDFProductImporter = ({ onDataExtracted, onClose, organizationId }) => {
    const [file, setFile] = useState(null);
    const [extracting, setExtracting] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (selectedFile) => {
        if (selectedFile.type !== 'application/pdf') {
            setError('Por favor selecciona un archivo PDF');
            return;
        }

        if (selectedFile.size > 5 * 1024 * 1024) {
            setError('El archivo es demasiado grande (máximo 5MB)');
            return;
        }

        setFile(selectedFile);
        setError(null);
        await extractTextFromPDF(selectedFile);
    };

    const extractTextFromPDF = async (pdfFile) => {
        setExtracting(true);
        setError(null);

        try {
            // Get Gemini API key from database
            const { data: settings, error: settingsError } = await supabase
                .from('organization_settings')
                .select('gemini_api_key')
                .eq('organization_id', organizationId)
                .single();

            if (settingsError || !settings?.gemini_api_key) {
                throw new Error('API key de Gemini no configurada. Por favor configúrala en Settings → API Key de Gemini AI');
            }

            const GEMINI_API_KEY = settings.gemini_api_key;

            // Convert PDF to base64
            const arrayBuffer = await pdfFile.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    ''
                )
            );

            console.log('📄 PDF size:', base64.length, 'bytes');

            // Send PDF directly to Gemini (it has native PDF support)
            const prompt = `Analiza este PDF de cotización y extrae información de producto. Devuelve SOLO un objeto JSON válido con estos campos exactos:
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
- Busca información de productos, precios, modelos, especificaciones técnicas`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                {
                                    inline_data: {
                                        mime_type: 'application/pdf',
                                        data: base64
                                    }
                                }
                            ]
                        }],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 2048,
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Gemini API error:', errorText);
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    throw new Error(`Error de Gemini API: ${errorText.substring(0, 200)}`);
                }
                throw new Error(`Error de Gemini API: ${errorData.error?.message || errorText.substring(0, 200)}`);
            }

            const data = await response.json();
            console.log('Gemini raw response:', data);

            const generatedText = data.candidates[0]?.content?.parts[0]?.text;

            if (!generatedText) {
                console.error('No generated text in response:', data);
                throw new Error('No se recibió respuesta de la IA');
            }

            console.log('Generated text:', generatedText);

            // Parse JSON response
            const cleanText = generatedText.replace(/```json\n?|\n?```/g, '').trim();
            console.log('Clean text to parse:', cleanText);

            const productData = JSON.parse(cleanText);

            if (!productData.name && !productData.description) {
                throw new Error('No se pudo extraer información de producto del PDF');
            }

            setExtractedData(productData);
        } catch (err) {
            console.error('Error extracting PDF:', err);
            setError(err.message || 'Error al procesar el PDF');
        } finally {
            setExtracting(false);
        }
    };

    const handleApply = () => {
        if (extractedData) {
            onDataExtracted(extractedData);
            onClose();
        }
    };

    const handleFieldChange = (field, value) => {
        setExtractedData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                        <FileText className="text-orange-500" size={24} />
                        <h2 className="text-xl font-bold text-gray-900">Importar Producto desde PDF</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {!file && !extractedData && (
                        <div
                            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${dragActive
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-300 hover:border-orange-400'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                            <p className="text-lg font-medium text-gray-700 mb-2">
                                Arrastra un PDF aquí o haz click para seleccionar
                            </p>
                            <p className="text-sm text-gray-500 mb-4">
                                Máximo 5MB
                            </p>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileInput}
                                className="hidden"
                                id="pdf-upload"
                            />
                            <label
                                htmlFor="pdf-upload"
                                className="inline-block px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 cursor-pointer transition-colors"
                            >
                                Seleccionar PDF
                            </label>
                        </div>
                    )}

                    {extracting && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
                            <p className="text-lg font-medium text-gray-700">Extrayendo información...</p>
                            <p className="text-sm text-gray-500">Esto puede tomar unos segundos</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                            <div>
                                <p className="font-medium text-red-800">Error</p>
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        </div>
                    )}

                    {extractedData && (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                                <CheckCircle className="text-green-500" size={20} />
                                <p className="text-sm text-green-700">
                                    Datos extraídos exitosamente. Revisa y edita si es necesario.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nombre del Producto
                                    </label>
                                    <input
                                        type="text"
                                        value={extractedData.name || ''}
                                        onChange={(e) => handleFieldChange('name', e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Descripción
                                    </label>
                                    <textarea
                                        value={extractedData.description || ''}
                                        onChange={(e) => handleFieldChange('description', e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Modelo
                                    </label>
                                    <input
                                        type="text"
                                        value={extractedData.model || ''}
                                        onChange={(e) => handleFieldChange('model', e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Especificaciones Técnicas
                                    </label>
                                    <textarea
                                        value={extractedData.technical_specs || ''}
                                        onChange={(e) => handleFieldChange('technical_specs', e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Precio
                                        </label>
                                        <input
                                            type="number"
                                            value={extractedData.unit_price || 0}
                                            onChange={(e) => handleFieldChange('unit_price', parseFloat(e.target.value))}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Moneda
                                        </label>
                                        <select
                                            value={extractedData.currency || 'CLP'}
                                            onChange={(e) => handleFieldChange('currency', e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        >
                                            <option value="CLP">CLP</option>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {extractedData && (
                    <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleApply}
                            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                        >
                            Aplicar Datos
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PDFProductImporter;
