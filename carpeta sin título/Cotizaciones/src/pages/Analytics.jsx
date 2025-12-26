import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, TrendingUp, Users, Download, Calendar } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import RevenueChart from '../components/RevenueChart';
import QuoteStatusChart from '../components/QuoteStatusChart';
import SellerPerformanceChart from '../components/SellerPerformanceChart';
import {
    getQuotes,
    calculateKPIs,
    calculatePreviousPeriodKPIs,
    getRevenueTrends,
    getStatusDistribution,
    getSellerPerformance,
    subscribeToQuoteUpdates,
    unsubscribeFromQuoteUpdates,
    getDateRangePresets
} from '../services/analyticsService';

const Analytics = () => {
    const [loading, setLoading] = useState(true);
    const [quotes, setQuotes] = useState([]);
    const [kpis, setKpis] = useState(null);
    const [previousKpis, setPreviousKpis] = useState(null);
    const [revenueTrends, setRevenueTrends] = useState([]);
    const [statusDistribution, setStatusDistribution] = useState([]);
    const [sellerPerformance, setSellerPerformance] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
    const [dateRange, setDateRange] = useState(null);

    const periods = getDateRangePresets();

    // Load analytics data
    const loadAnalytics = async () => {
        try {
            setLoading(true);

            // Get date range
            const period = periods[selectedPeriod];
            const filters = {};

            if (period.startDate) {
                filters.startDate = period.startDate.toISOString();
            }
            if (period.endDate) {
                filters.endDate = period.endDate.toISOString();
            }

            setDateRange(period);

            // Fetch quotes
            const quotesData = await getQuotes(filters);
            setQuotes(quotesData);

            // Calculate current period KPIs
            const currentKpis = calculateKPIs(quotesData);
            setKpis(currentKpis);

            // Calculate previous period KPIs for comparison
            if (period.startDate && period.endDate) {
                const prevKpis = await calculatePreviousPeriodKPIs(period.startDate, period.endDate);
                setPreviousKpis(prevKpis);
            } else {
                setPreviousKpis(null);
            }

            // Get revenue trends
            const trends = getRevenueTrends(quotesData, 'day');
            setRevenueTrends(trends);

            // Get status distribution
            const distribution = getStatusDistribution(quotesData);
            setStatusDistribution(distribution);

            // Get seller performance
            const performance = await getSellerPerformance(quotesData);
            setSellerPerformance(performance);

        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        loadAnalytics();
    }, [selectedPeriod]);

    // Subscribe to real-time updates
    useEffect(() => {
        const subscription = subscribeToQuoteUpdates((payload) => {
            console.log('Real-time update received:', payload);
            // Reload analytics when quotes change
            loadAnalytics();
        });

        return () => {
            unsubscribeFromQuoteUpdates(subscription);
        };
    }, [selectedPeriod]);

    const handleExport = () => {
        // TODO: Implement CSV/Excel export
        console.log('Export analytics data');
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-bold text-petrol-800">Analytics</h2>
                    <p className="text-gray-600 mt-2">Panel de rendimiento y estadísticas de ventas</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Period selector */}
                    <div className="relative">
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-petrol-800 hover:border-petrol-500 focus:outline-none focus:ring-2 focus:ring-petrol-500 transition-all"
                        >
                            {Object.entries(periods).map(([key, period]) => (
                                <option key={key} value={key}>
                                    {period.label}
                                </option>
                            ))}
                        </select>
                        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                    </div>

                    {/* Export button */}
                    <button
                        onClick={handleExport}
                        className="btn-secondary flex items-center gap-2 justify-center"
                    >
                        <Download size={18} />
                        Exportar
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Ingresos Totales"
                    value={kpis?.totalRevenue || 0}
                    previousValue={previousKpis?.totalRevenue}
                    icon={DollarSign}
                    color="bg-green-500"
                    format="currency"
                    loading={loading}
                />
                <MetricCard
                    title="Cotizaciones Aceptadas"
                    value={kpis?.acceptedQuotes || 0}
                    previousValue={previousKpis?.acceptedQuotes}
                    icon={FileText}
                    color="bg-petrol-500"
                    format="number"
                    loading={loading}
                />
                <MetricCard
                    title="Tasa de Conversión"
                    value={kpis?.conversionRate || 0}
                    previousValue={previousKpis?.conversionRate}
                    icon={TrendingUp}
                    color="bg-orange-500"
                    format="percentage"
                    loading={loading}
                />
                <MetricCard
                    title="Clientes Únicos"
                    value={kpis?.uniqueClients || 0}
                    previousValue={previousKpis?.uniqueClients}
                    icon={Users}
                    color="bg-blue-500"
                    format="number"
                    loading={loading}
                />
            </div>

            {/* Additional metrics row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-600 text-sm font-medium">Ticket Promedio</p>
                        <DollarSign className="text-petrol-500" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-petrol-800">
                        {loading ? '...' : `$${(kpis?.avgDealSize || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
                    </p>
                </div>

                <div className="glass-panel p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-600 text-sm font-medium">Ingresos Potenciales</p>
                        <TrendingUp className="text-orange-500" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-petrol-800">
                        {loading ? '...' : `$${(kpis?.potentialRevenue || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {kpis?.pendingQuotes || 0} cotizaciones pendientes
                    </p>
                </div>

                <div className="glass-panel p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-600 text-sm font-medium">Total Cotizaciones</p>
                        <FileText className="text-blue-500" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-petrol-800">
                        {loading ? '...' : kpis?.totalQuotes || 0}
                    </p>
                    <div className="flex gap-3 mt-2 text-xs">
                        <span className="text-green-600">{kpis?.acceptedQuotes || 0} aceptadas</span>
                        <span className="text-red-600">{kpis?.rejectedQuotes || 0} rechazadas</span>
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RevenueChart data={revenueTrends} loading={loading} />
                <QuoteStatusChart data={statusDistribution} loading={loading} />
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 gap-6">
                <SellerPerformanceChart data={sellerPerformance} loading={loading} />
            </div>

            {/* Real-time indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Actualizando en tiempo real</span>
            </div>
        </div>
    );
};

export default Analytics;
