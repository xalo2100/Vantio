import React, { useState, useMemo } from 'react';
import { useQuotes } from '../context/QuoteContext';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Trash2, Clock, CheckCircle, XCircle, Edit, ExternalLink, Download, Mail, User, WifiOff, ClipboardCheck } from 'lucide-react';
import { generateQuotePDF } from '../utils/pdfGeneratorV6';
import { sendQuoteEmail } from '../utils/emailService';
import { useRole } from '../hooks/useRole';
import { useOffline } from '../context/OfflineContext';

const QuotesList = () => {
    const { quotes, deleteQuote } = useQuotes();
    const { offlineQuotes } = useOffline();
    const navigate = useNavigate();
    const { isAdmin } = useRole();
    const [sendingEmail, setSendingEmail] = useState(null);
    const [selectedSeller, setSelectedSeller] = useState('all');

    // Merge online and offline quotes
    const filteredQuotesRaw = useMemo(() => {
        // Sort offline quotes by date (newest first)
        const sortedOffline = [...offlineQuotes].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );
        return [...sortedOffline, ...quotes];
    }, [quotes, offlineQuotes]);

    const getStatusBadge = (quote) => {
        if (quote.is_offline) {
            return (
                <span className="px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 w-fit bg-yellow-100 text-yellow-800 border-yellow-200">
                    <WifiOff size={12} />
                    Offline (Local)
                </span>
            );
        }

        const statusConfig = {
            draft: {
                icon: Edit,
                label: 'Borrador',
                className: 'badge-draft'
            },
            pending: {
                icon: Clock,
                label: 'Pendiente',
                className: 'badge-pending'
            },
            accepted: {
                icon: CheckCircle,
                label: 'Aceptada',
                className: 'badge-accepted'
            },
            rejected: {
                icon: XCircle,
                label: 'Rechazada',
                className: 'badge-rejected'
            }
        };

        const config = statusConfig[quote.status] || statusConfig.draft;
        const Icon = config.icon;

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 w-fit ${config.className}`}>
                <Icon size={12} />
                {config.label}
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (window.confirm('¿Estás seguro de eliminar esta cotización?')) {
            try {
                await deleteQuote(id);
                alert('✅ Cotización eliminada exitosamente');
            } catch (error) {
                console.error('Error deleting quote:', error);
                alert(`❌ Error al eliminar la cotización: ${error.message || 'Error desconocido'}`);
            }
        }
    };

    const handleDownloadPDF = (quote, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        generateQuotePDF(quote);
    };

    const handleSendEmail = async (quote, e) => {
        e.stopPropagation();

        if (quote.is_offline) {
            alert('No puedes enviar emails de cotizaciones offline. Sincroniza primero.');
            return;
        }

        const customMessage = prompt(
            'Mensaje personalizado (opcional):\n\nDeja en blanco para usar el mensaje predeterminado.'
        );

        if (customMessage === null) return; // User cancelled

        setSendingEmail(quote.id);
        const result = await sendQuoteEmail(quote, customMessage || '');
        setSendingEmail(null);

        if (result.success) {
            alert(`✅ Email enviado exitosamente a ${quote.clientEmail}`);
        } else {
            alert(`❌ Error al enviar email: ${result.error}`);
        }
    };

    // Extract unique sellers for filter (admins only)
    const sellers = useMemo(() => {
        if (!isAdmin) return [];

        const sellerMap = new Map();
        quotes.forEach(quote => {
            if (quote.seller && !sellerMap.has(quote.user_id)) {
                sellerMap.set(quote.user_id, {
                    id: quote.user_id,
                    name: quote.seller.full_name || quote.seller.email,
                    email: quote.seller.email
                });
            }
        });
        return Array.from(sellerMap.values());
    }, [quotes, isAdmin]);

    const renderQuoteCard = (quote) => {
        const symbol = quote.currency === 'CLP' ? '$' : quote.currency === 'EUR' ? '€' : 'U$D';

        return (
            <div
                key={quote.id}
                className={`glass-panel p-6 rounded-xl card-hover cursor-pointer group ${quote.is_offline ? 'border-l-4 border-yellow-400' : ''}`}
                onClick={() => navigate(quote.is_offline ? '#' : `/microsite/${quote.id}`)}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-2xl font-bold text-petrol-800 group-hover:text-orange-500 transition-colors">
                                {quote.projectName || 'Sin nombre'}
                            </h3>
                            <span className="text-xs text-gray-500 font-mono bg-beige-100 px-2 py-1 rounded">
                                #{quote.quoteNumber || quote.quote_number}
                            </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">
                            Cliente: <span className="text-petrol-800 font-semibold">{quote.clientName}</span>
                        </p>

                        {/* Show seller info for admins */}
                        {isAdmin && quote.seller && (
                            <p className="text-gray-600 text-sm mb-3 flex items-center gap-2">
                                <User size={14} className="text-petrol-500" />
                                Vendedor: <span className="text-petrol-800 font-semibold">{quote.seller.full_name || quote.seller.email}</span>
                            </p>
                        )}

                        {getStatusBadge(quote)}

                        {/* Mostrar razón de rechazo si existe */}
                        {quote.status === 'rejected' && quote.rejectionReason && (
                            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-xs text-red-600 font-semibold mb-1">Razón del rechazo:</p>
                                <p className="text-sm text-red-800">{quote.rejectionReason}</p>
                            </div>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-bold text-orange-500">
                            {symbol} {quote.total?.toLocaleString('es-CL')}
                        </p>
                        {quote.currency !== 'CLP' && quote.exchangeRate > 1 && (
                            <p className="text-xs text-orange-600 font-bold mt-1">
                                Ref: $ {Math.round(quote.total * quote.exchangeRate).toLocaleString('es-CL')}
                            </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                            {formatDate(quote.created_at || quote.createdAt)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="font-medium">{quote.items?.length || 0} {quote.items?.length === 1 ? 'item' : 'items'}</span>
                        {quote.validUntil && (
                            <span>Válida hasta: {formatDate(quote.validUntil)}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={(e) => handleSendEmail(quote, e)}
                            disabled={sendingEmail === quote.id || quote.is_offline}
                            className="btn-secondary text-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        >
                            <Mail size={14} />
                            {sendingEmail === quote.id ? 'Enviando...' : 'Enviar Email'}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => handleDownloadPDF(quote, e)}
                            className="btn-secondary text-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Download size={14} />
                            PDF
                        </button>
                        {!quote.is_offline && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigate(`/microsite/${quote.id}`);
                                }}
                                className="btn-secondary text-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <ExternalLink size={14} />
                                Ver Micrositio
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/sales-notes/new?quoteId=${quote.id}`);
                            }}
                            className="btn-secondary text-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            title="Generar Nota de Venta"
                        >
                            <ClipboardCheck size={14} />
                            Nota Venta
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/builder/${quote.id}`);
                            }}
                            className="btn-secondary text-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Edit size={14} />
                            Editar
                        </button>
                        <button
                            type="button"
                            onClick={(e) => handleDelete(quote.id, e)}
                            className="text-red-500 hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100 p-2"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Filter quotes by selected seller
    const { activeQuotes, draftQuotes } = useMemo(() => {
        let filtered = filteredQuotesRaw;
        if (isAdmin && selectedSeller !== 'all') {
            filtered = filtered.filter(q => q.user_id === selectedSeller);
        }

        return {
            activeQuotes: filtered.filter(q => q.status !== 'draft'),
            draftQuotes: filtered.filter(q => q.status === 'draft')
        };
    }, [filteredQuotesRaw, selectedSeller, isAdmin]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-bold text-petrol-800">
                        {isAdmin ? 'Todas las Cotizaciones' : 'Mis Cotizaciones'}
                    </h2>
                    <p className="text-gray-600 mt-2">
                        {isAdmin ? 'Vista completa de cotizaciones de la organización' : 'Gestiona todas tus cotizaciones en un solo lugar'}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/builder')}
                    className="btn-primary flex items-center gap-2"
                >
                    <FileText size={18} />
                    Nueva Cotización
                </button>
            </div>

            {/* Seller filter for admins */}
            {isAdmin && sellers.length > 0 && (
                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-petrol-800 flex items-center gap-2">
                            <User size={18} />
                            Filtrar por vendedor:
                        </label>
                        <select
                            value={selectedSeller}
                            onChange={(e) => setSelectedSeller(e.target.value)}
                            className="flex-1 max-w-xs px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-petrol-500 focus:border-petrol-500"
                        >
                            <option value="all">Todos los vendedores ({quotes.length})</option>
                            {sellers.map(seller => (
                                <option key={seller.id} value={seller.id}>
                                    {seller.name} ({quotes.filter(q => q.user_id === seller.id).length})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {activeQuotes.length === 0 && draftQuotes.length === 0 ? (
                <div className="glass-panel p-12 rounded-xl text-center">
                    <FileText className="mx-auto text-gray-400 mb-4" size={64} />
                    <h3 className="text-2xl font-bold text-petrol-800 mb-2">No hay cotizaciones aún</h3>
                    <p className="text-gray-600 mb-6">Comienza creando tu primera cotización profesional</p>
                    <button
                        onClick={() => navigate('/builder')}
                        className="btn-primary inline-flex items-center gap-2"
                    >
                        <FileText size={18} />
                        Crear Primera Cotización
                    </button>
                </div>
            ) : (
                <div className="space-y-12 pb-12">
                    {/* Active Quotes Section */}
                    {activeQuotes.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-6 border-b-2 border-orange-100 pb-2">
                                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                                    <ClipboardCheck size={24} />
                                </div>
                                <h3 className="text-2xl font-bold text-petrol-800">Cotizaciones Activas</h3>
                                <span className="ml-auto text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    {activeQuotes.length} {activeQuotes.length === 1 ? 'cotización' : 'cotizaciones'}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {activeQuotes.map((quote) => renderQuoteCard(quote))}
                            </div>
                        </section>
                    )}

                    {/* Drafts Section */}
                    {draftQuotes.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-6 border-b-2 border-blue-100 pb-2">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <Edit size={24} />
                                </div>
                                <h3 className="text-2xl font-bold text-petrol-800">Borradores Guardados</h3>
                                <span className="ml-auto text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    {draftQuotes.length} {draftQuotes.length === 1 ? 'borrador' : 'borradores'}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {draftQuotes.map((quote) => renderQuoteCard(quote))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
};

export default QuotesList;
