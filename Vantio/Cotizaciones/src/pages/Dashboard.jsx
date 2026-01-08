import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, TrendingUp, Users, Eye, Download, Sparkles, ArrowRight } from 'lucide-react';
import { useQuotes } from '../context/QuoteContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { generateQuotePDF } from '../utils/pdfGeneratorV6';
import { insightsService } from '../services/insightsService';
import InsightCard from '../components/InsightCard';
import KaizenModal from '../components/KaizenModal';

const StatCard = ({ title, value, change, icon: Icon, color }) => (
    <div className="glass-panel p-6 rounded-xl card-hover">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-gray-600 text-sm font-medium">{title}</p>
                <h3 className="text-3xl font-bold text-petrol-800 mt-2">{value}</h3>
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon className="text-white" size={24} />
            </div>
        </div>
        {change && (
            <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium flex items-center gap-1">
                    <TrendingUp size={14} /> {change}
                </span>
                <span className="text-gray-500 ml-2">vs mes anterior</span>
            </div>
        )}
    </div>
);

const Dashboard = () => {
    const { quotes } = useQuotes();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [kaizenInsights, setKaizenInsights] = useState([]);
    const [loadingInsights, setLoadingInsights] = useState(true);
    const [isGeneratingAuto, setIsGeneratingAuto] = useState(false);
    const [showMandatoryKaizen, setShowMandatoryKaizen] = useState(false);
    const [activeMandatoryInsight, setActiveMandatoryInsight] = useState(null);

    useEffect(() => {
        if (user) {
            fetchInsights();
        }
    }, [user]);

    const fetchInsights = async () => {
        try {
            setLoadingInsights(true);
            const { insights } = await insightsService.getUserInsights(10, false);
            setKaizenInsights(insights || []);

            // Check for unread insights to show mandatory modal
            const unreadInsight = (insights || []).find(ins => !ins.is_read);
            if (unreadInsight) {
                // Show modal if it's the first time in this session or after some time
                const lastDismissed = sessionStorage.getItem(`kaizen_dismissed_${unreadInsight.id}`);
                if (!lastDismissed) {
                    setActiveMandatoryInsight(unreadInsight);
                    setShowMandatoryKaizen(true);
                }
            }

            // Background check for stale data (24h)
            if (user) {
                const lastGenKey = `kaizen_last_auto_gen_${user.id}`;
                const lastGen = localStorage.getItem(lastGenKey);
                const now = Date.now();
                const oneDay = 24 * 60 * 60 * 1000;
                const isStale = !lastGen || (now - parseInt(lastGen)) > oneDay;

                if (isStale || insights?.length === 0) {
                    console.log("✨ Dashboard: Background Kaizen update triggered...");

                    // Only show global loading if we have 0 insights
                    if (insights?.length === 0) {
                        setIsGeneratingAuto(true);
                    }

                    try {
                        await insightsService.generateWeeklyInsights(user.id);
                        localStorage.setItem(lastGenKey, now.toString());
                        // Refresh after generation
                        const refreshed = await insightsService.getUserInsights(3, false);
                        setKaizenInsights(refreshed.insights || []);
                    } catch (e) {
                        console.error("Auto-gen error:", e);
                    } finally {
                        setIsGeneratingAuto(false);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching insights for dashboard:', error);
        } finally {
            setLoadingInsights(false);
        }
    };

    const handleMarkAsRead = async (id) => {
        await insightsService.markAsRead(id);
        if (activeMandatoryInsight?.id === id) {
            setShowMandatoryKaizen(false);
            setActiveMandatoryInsight(null);
            // Mark as dismissed for this session to avoid reappear
            sessionStorage.setItem(`kaizen_dismissed_${id}`, 'true');
        }
        fetchInsights(); // Refresh list
    };

    // Calcular estadísticas reales
    const totalRevenue = quotes.reduce((sum, quote) => sum + (quote.total || 0), 0);
    const activeQuotes = quotes.filter(q => q.status === 'pending').length;
    const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length;
    const conversionRate = quotes.length > 0 ? ((acceptedQuotes / quotes.length) * 100).toFixed(1) : 0;
    const uniqueClients = new Set(quotes.map(q => q.clientEmail)).size;

    // Obtener las 5 cotizaciones más recientes
    const recentQuotes = [...quotes].slice(0, 5);

    const getStatusBadge = (status) => {
        const statusConfig = {
            draft: { label: 'Borrador', className: 'badge-draft' },
            pending: { label: 'Pendiente', className: 'badge-pending' },
            accepted: { label: 'Aceptada', className: 'badge-accepted' },
            rejected: { label: 'Rechazada', className: 'badge-rejected' }
        };
        const config = statusConfig[status] || statusConfig.draft;
        return <span className={`px-3 py-1 rounded-full text-xs font-medium border ${config.className}`}>{config.label}</span>;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `Hace ${diffDays} días`;
        return date.toLocaleDateString('es-AR');
    };

    const handleDownloadPDF = (quote, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        generateQuotePDF(quote);
    };

    return (
        <div className="space-y-8 relative">
            {/* Kaizen Mandatory Modal */}
            {showMandatoryKaizen && activeMandatoryInsight && (
                <KaizenModal
                    insight={activeMandatoryInsight}
                    onConfirm={handleMarkAsRead}
                />
            )}

            <div>
                <h2 className="text-4xl font-bold text-petrol-800">Dashboard</h2>
                <p className="text-gray-600 mt-2">Bienvenido de nuevo, aquí está el resumen de hoy.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Ingresos Totales"
                    value={`$${totalRevenue.toFixed(2)}`}
                    change={null}
                    icon={DollarSign}
                    color="bg-green-500"
                />
                <StatCard
                    title="Cotizaciones Activas"
                    value={activeQuotes.toString()}
                    change={null}
                    icon={FileText}
                    color="bg-orange-500"
                />
                <StatCard
                    title="Tasa de Conversión"
                    value={`${conversionRate}%`}
                    change={null}
                    icon={TrendingUp}
                    color="bg-petrol-500"
                />
                <StatCard
                    title="Clientes"
                    value={uniqueClients.toString()}
                    change={null}
                    icon={Users}
                    color="bg-blue-500"
                />
            </div>

            {/* Kaizen Insights Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-purple-600" size={24} />
                        <h3 className="text-2xl font-bold text-petrol-800">Insights Kaizen</h3>
                    </div>
                    <button
                        onClick={() => navigate('/kaizen')}
                        className="text-petrol-600 hover:text-petrol-800 font-medium flex items-center gap-1 text-sm"
                    >
                        Ver todos <ArrowRight size={16} />
                    </button>
                </div>

                {loadingInsights || isGeneratingAuto ? (
                    <div className="glass-panel p-12 text-center rounded-xl border border-purple-100 shadow-sm">
                        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <h4 className="text-xl font-bold text-petrol-800 mb-2">
                            {isGeneratingAuto ? 'Generando tus insights con IA...' : 'Cargando insights...'}
                        </h4>
                        <p className="text-gray-600">Esto puede tomar unos segundos, estamos analizando tu rendimiento.</p>
                    </div>
                ) : kaizenInsights.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {kaizenInsights.map(insight => (
                            <InsightCard
                                key={insight.id}
                                insight={insight}
                                onMarkAsRead={handleMarkAsRead}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="glass-panel p-12 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                        <Sparkles className="mx-auto text-gray-300 mb-4 animate-pulse" size={48} />
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">Preparando tus recomendaciones...</h4>
                        <p className="text-gray-600 max-w-md mx-auto">
                            Estamos analizando tus ventas recientes para ofrecerte consejos personalizados. Esto ocurre automáticamente.
                        </p>
                    </div>
                )}
            </div>

            <div className="glass-panel rounded-xl p-6">
                <h3 className="text-2xl font-bold text-petrol-800 mb-6">Cotizaciones Recientes</h3>
                {recentQuotes.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="mx-auto text-gray-400 mb-3" size={48} />
                        <p className="text-gray-600 mb-4">No hay cotizaciones todavía</p>
                        <button
                            onClick={() => navigate('/builder')}
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            <FileText size={18} />
                            Crear Primera Cotización
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-gray-600 text-sm border-b-2 border-gray-200">
                                    <th className="py-3 font-semibold">Cliente</th>
                                    <th className="py-3 font-semibold">Proyecto</th>
                                    <th className="py-3 font-semibold">Monto</th>
                                    <th className="py-3 font-semibold">Estado</th>
                                    <th className="py-3 font-semibold">Fecha</th>
                                    <th className="py-3 font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {recentQuotes.map((quote) => (
                                    <tr key={quote.id} className="border-b border-gray-100 hover:bg-beige-100 transition-colors">
                                        <td className="py-4 text-petrol-800 font-medium">{quote.clientName}</td>
                                        <td className="py-4 text-gray-700">{quote.projectName}</td>
                                        <td className="py-4 text-petrol-800 font-semibold">${quote.total?.toFixed(2)}</td>
                                        <td className="py-4">{getStatusBadge(quote.status)}</td>
                                        <td className="py-4 text-gray-600">{formatDate(quote.createdAt)}</td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/microsite/${quote.id}`)}
                                                    className="text-petrol-500 hover:text-petrol-700 transition-colors flex items-center gap-1 text-sm"
                                                >
                                                    <Eye size={16} />
                                                    Ver
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDownloadPDF(quote, e);
                                                    }}
                                                    className="text-orange-500 hover:text-orange-700 transition-colors flex items-center gap-1 text-sm"
                                                >
                                                    <Download size={16} />
                                                    PDF
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
