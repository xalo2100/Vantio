import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, ArrowLeft, Calendar, Mail, FileText, Download } from 'lucide-react';
import { generateQuotePDF } from '../utils/pdfGeneratorV6';

const Microsite = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [action, setAction] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [orgLogo, setOrgLogo] = useState(null);
    const [debugError, setDebugError] = useState(null); // New debug state

    // Fetch quote from Supabase (public access)
    useEffect(() => {
        const fetchQuote = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('quotes')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                // Convert from Supabase format to app format
                if (data) {
                    setQuote({
                        id: data.id,
                        quoteNumber: data.quote_number,
                        clientName: data.client_name,
                        clientEmail: data.client_email,
                        projectName: data.project_name,
                        validUntil: data.valid_until,
                        items: data.items,
                        notes: data.notes,
                        subtotal: parseFloat(data.subtotal),
                        tax: parseFloat(data.tax),
                        total: parseFloat(data.total),
                        status: data.status,
                        rejectionReason: data.rejection_reason,
                        createdAt: data.created_at,
                        statusUpdatedAt: data.status_updated_at || data.updated_at,
                        currency: data.currency || 'CLP',
                        exchangeRate: parseFloat(data.exchange_rate || 1.0)
                    });

                    // Fetch organization logo from SETTINGS
                    if (data.organization_id) {
                        const { data: settingsData } = await supabase
                            .from('organization_settings')
                            .select('quote_logo_url')
                            .eq('organization_id', data.organization_id)
                            .maybeSingle();

                        if (settingsData?.quote_logo_url) {
                            setOrgLogo(settingsData.quote_logo_url);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching quote:', error);
                setDebugError(error.message || JSON.stringify(error));
                setQuote(null);
            } finally {
                setLoading(false);
            }
        };

        fetchQuote();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-beige-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-petrol-800 font-semibold">Cargando cotización...</p>
                </div>
            </div>
        );
    }

    if (!quote) {
        return (
            <div className="min-h-screen bg-beige-50 flex items-center justify-center p-4">
                <div className="glass-panel p-8 rounded-xl text-center max-w-md">
                    <FileText className="mx-auto text-gray-400 mb-4" size={64} />
                    <h2 className="text-2xl font-bold text-petrol-800 mb-2">Cotización no encontrada</h2>
                    <p className="text-gray-600 mb-6">Esta cotización no existe o ha sido eliminada.</p>
                    {debugError && (
                        <div className="mb-6 p-3 bg-red-100 text-red-700 text-xs font-mono rounded overflow-auto max-w-full text-left">
                            <strong>Debug Error:</strong> {debugError}
                            <br />
                            <strong>ID buscado:</strong> {id}
                        </div>
                    )}
                    <button
                        onClick={() => navigate('/')}
                        className="btn-primary inline-flex items-center gap-2"
                    >
                        <ArrowLeft size={18} />
                        Volver al inicio
                    </button>
                </div>
            </div>
        );
    }

    const handleAction = (actionType) => {
        setAction(actionType);
        setRejectionReason('');
        setShowModal(true);
    };

    const confirmAction = async () => {
        try {
            const updates = {
                status: action,
                status_updated_at: new Date().toISOString()
            };

            if (action === 'rejected' && rejectionReason) {
                updates.rejection_reason = rejectionReason;
            }

            const { error } = await supabase
                .from('quotes')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            setShowModal(false);

            // Update local state
            setQuote(prev => ({
                ...prev,
                status: action,
                rejectionReason: action === 'rejected' ? rejectionReason : prev.rejectionReason,
                statusUpdatedAt: updates.status_updated_at
            }));
        } catch (error) {
            console.error('Error updating quote status:', error);
            alert('Error al actualizar el estado. Por favor, intenta nuevamente.');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const handleDownloadPDF = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        generateQuotePDF(quote);
    };

    const isActionTaken = quote.status === 'accepted' || quote.status === 'rejected';

    return (
        <div className="min-h-screen bg-beige-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    {orgLogo ? (
                        <img
                            src={orgLogo}
                            alt="Logo"
                            className="h-24 mx-auto mb-4 object-contain"
                        />
                    ) : (
                        <h1 className="text-5xl font-bold text-petrol-800 mb-2">
                            AlfaQuote
                        </h1>
                    )}
                </div>

                {/* Main Quote Card */}
                <div className="glass-panel p-8 md:p-12 rounded-2xl mb-6 shadow-xl">
                    {/* Quote Number & Status */}
                    <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-gray-200">
                        <div>
                            <p className="text-xs text-gray-500 mb-1 font-semibold">COTIZACIÓN</p>
                            <p className="text-3xl font-bold text-petrol-800">#{quote.quoteNumber}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDownloadPDF(e);
                                }}
                                className="btn-secondary flex items-center gap-2"
                            >
                                <Download size={18} />
                                Descargar PDF
                            </button>
                            {isActionTaken && (
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${quote.status === 'accepted'
                                    ? 'bg-green-50 text-green-700 border-green-300'
                                    : 'bg-red-50 text-red-700 border-red-300'
                                    }`}>
                                    {quote.status === 'accepted' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                    <span className="font-semibold">
                                        {quote.status === 'accepted' ? 'Aceptada' : 'Rechazada'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Client Info */}
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <p className="text-xs text-gray-500 mb-2 font-semibold">CLIENTE</p>
                            <p className="text-xl font-bold text-petrol-800 mb-1">{quote.clientName}</p>
                            <div className="flex items-center gap-2 text-gray-600">
                                <Mail size={14} />
                                <p className="text-sm">{quote.clientEmail}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-2 font-semibold">PROYECTO</p>
                            <p className="text-xl font-bold text-petrol-800 mb-1">{quote.projectName}</p>
                            {quote.validUntil && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Calendar size={14} />
                                    <p className="text-sm">Válida hasta: {formatDate(quote.validUntil)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items */}
                    <div className="mb-8">
                        <p className="text-xs text-gray-500 mb-4 font-semibold">DETALLE DE SERVICIOS</p>
                        <div className="space-y-3">
                            {quote.items?.map((item, index) => (
                                <div key={index} className="bg-beige-100 p-4 rounded-lg border border-gray-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <p className="text-petrol-800 font-semibold">{item.description}</p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {item.quantity} × {quote.currency === 'CLP' ? '$' : quote.currency === 'EUR' ? '€' : 'U$D'} {item.unitPrice?.toLocaleString('es-CL')}
                                                {quote.currency !== 'CLP' && quote.exchangeRate > 1 && (
                                                    <span className="block text-xs text-orange-600 font-medium">
                                                        Ref: $ {Math.round(item.unitPrice * quote.exchangeRate).toLocaleString('es-CL')}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-petrol-800 ml-4">
                                                {quote.currency === 'CLP' ? '$' : quote.currency === 'EUR' ? '€' : 'U$D'} {(item.quantity * item.unitPrice).toLocaleString('es-CL')}
                                            </p>
                                            {quote.currency !== 'CLP' && quote.exchangeRate > 1 && (
                                                <p className="text-xs text-orange-600 font-medium">
                                                    $ {Math.round(item.quantity * item.unitPrice * quote.exchangeRate).toLocaleString('es-CL')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="bg-petrol-50 p-6 rounded-lg border-2 border-petrol-200">
                        <div className="space-y-3">
                            <div className="flex justify-between text-petrol-700">
                                <span>Subtotal:</span>
                                <div className="text-right">
                                    <p className="font-semibold">{quote.currency === 'CLP' ? '$' : quote.currency === 'EUR' ? '€' : 'U$D'} {quote.subtotal?.toLocaleString('es-CL')}</p>
                                    {quote.currency !== 'CLP' && quote.exchangeRate > 1 && (
                                        <p className="text-xs text-orange-600 font-medium">Ref: $ {Math.round(quote.subtotal * quote.exchangeRate).toLocaleString('es-CL')}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between text-petrol-700">
                                <span>IVA (19%):</span>
                                <div className="text-right">
                                    <p className="font-semibold">{quote.currency === 'CLP' ? '$' : quote.currency === 'EUR' ? '€' : 'U$D'} {quote.tax?.toLocaleString('es-CL')}</p>
                                    {quote.currency !== 'CLP' && quote.exchangeRate > 1 && (
                                        <p className="text-xs text-orange-600 font-medium">Ref: $ {Math.round(quote.tax * quote.exchangeRate).toLocaleString('es-CL')}</p>
                                    )}
                                </div>
                            </div>
                            <div className="h-px bg-petrol-300 my-2"></div>
                            <div className="flex justify-between text-2xl font-bold">
                                <span className="text-petrol-800">Total:</span>
                                <div className="text-right">
                                    <p className="text-orange-500">{quote.currency === 'CLP' ? '$' : quote.currency === 'EUR' ? '€' : 'U$D'} {quote.total?.toLocaleString('es-CL')}</p>
                                    {quote.currency !== 'CLP' && quote.exchangeRate > 1 && (
                                        <p className="text-sm text-orange-600 font-bold">Total Ref. CLP: $ {Math.round(quote.total * quote.exchangeRate).toLocaleString('es-CL')}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {quote.notes && (
                        <div className="mt-8 pt-8 border-t-2 border-gray-200">
                            <p className="text-xs text-gray-500 mb-3 font-semibold">NOTAS ADICIONALES</p>
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {quote.notes}
                            </p>
                        </div>
                    )}

                    {/* Rejection Reason */}
                    {quote.status === 'rejected' && quote.rejectionReason && (
                        <div className="mt-8 pt-8 border-t-2 border-gray-200">
                            <p className="text-xs text-gray-500 mb-3 font-semibold">RAZÓN DEL RECHAZO</p>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-red-800">{quote.rejectionReason}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {!isActionTaken && (
                    <div className="grid md:grid-cols-2 gap-4">
                        <button
                            onClick={() => handleAction('rejected')}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-300 hover:border-red-400 font-semibold px-6 py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <XCircle size={20} />
                            Rechazar Cotización
                        </button>
                        <button
                            onClick={() => handleAction('accepted')}
                            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                            <CheckCircle size={20} />
                            Aceptar Cotización
                        </button>
                    </div>
                )}

                {isActionTaken && (
                    <div className="glass-panel p-6 rounded-xl text-center">
                        <p className="text-gray-700">
                            Esta cotización ya ha sido {quote.status === 'accepted' ? 'aceptada' : 'rechazada'}.
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            Fecha: {formatDate(quote.statusUpdatedAt || quote.createdAt)}
                        </p>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center mt-8 text-sm text-gray-500">
                    <p>Generado el {formatDate(quote.createdAt)}</p>
                    <p className="mt-1">Powered by AlfaQuote v2.0</p>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-8 rounded-2xl max-w-md w-full shadow-2xl border-2 border-gray-200">
                        <div className="text-center mb-6">
                            {action === 'accepted' ? (
                                <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
                            ) : (
                                <XCircle className="mx-auto text-red-500 mb-4" size={64} />
                            )}
                            <h3 className="text-2xl font-bold text-petrol-800 mb-2">
                                {action === 'accepted' ? '¿Aceptar cotización?' : '¿Rechazar cotización?'}
                            </h3>
                            <p className="text-gray-600">
                                {action === 'accepted'
                                    ? 'Confirmarás que aceptas los términos y condiciones de esta cotización.'
                                    : 'Por favor, indícanos la razón del rechazo.'}
                            </p>
                        </div>

                        {/* Rejection Reason Field */}
                        {action === 'rejected' && (
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Razón del rechazo *
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="input-field w-full min-h-[100px] resize-none"
                                    placeholder="Ej: El precio está fuera de nuestro presupuesto..."
                                    required
                                />
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="btn-secondary flex-1"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmAction}
                                disabled={action === 'rejected' && !rejectionReason.trim()}
                                className={`flex-1 font-semibold px-6 py-3 rounded-lg transition-all ${action === 'accepted'
                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                    : 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                                    }`}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Microsite;
