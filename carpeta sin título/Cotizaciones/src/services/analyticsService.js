import { supabase } from '../lib/supabase';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

/**
 * Analytics Service
 * Provides data aggregation and real-time subscriptions for analytics dashboard
 */

// Get quotes with filters
export const getQuotes = async (filters = {}) => {
    try {
        let query = supabase
            .from('quotes')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply filters
        if (filters.startDate) {
            query = query.gte('created_at', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('created_at', filters.endDate);
        }
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching quotes:', error);
        return [];
    }
};

// Get profiles/users for seller performance
export const getProfiles = async () => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching profiles:', error);
        return [];
    }
};

// Calculate KPIs
export const calculateKPIs = (quotes) => {
    const totalQuotes = quotes.length;
    const acceptedQuotes = quotes.filter(q => q.status === 'accepted');
    const pendingQuotes = quotes.filter(q => q.status === 'pending');
    const rejectedQuotes = quotes.filter(q => q.status === 'rejected');

    const totalRevenue = acceptedQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
    const potentialRevenue = pendingQuotes.reduce((sum, q) => sum + (q.total || 0), 0);

    const conversionRate = totalQuotes > 0
        ? (acceptedQuotes.length / totalQuotes * 100).toFixed(1)
        : 0;

    const avgDealSize = acceptedQuotes.length > 0
        ? totalRevenue / acceptedQuotes.length
        : 0;

    const uniqueClients = new Set(quotes.map(q => q.client_email)).size;

    return {
        totalQuotes,
        acceptedQuotes: acceptedQuotes.length,
        pendingQuotes: pendingQuotes.length,
        rejectedQuotes: rejectedQuotes.length,
        totalRevenue,
        potentialRevenue,
        conversionRate: parseFloat(conversionRate),
        avgDealSize,
        uniqueClients
    };
};

// Calculate previous period KPIs for comparison
export const calculatePreviousPeriodKPIs = async (currentStartDate, currentEndDate) => {
    const periodDuration = currentEndDate - currentStartDate;
    const previousStartDate = new Date(currentStartDate.getTime() - periodDuration);
    const previousEndDate = currentStartDate;

    const previousQuotes = await getQuotes({
        startDate: previousStartDate.toISOString(),
        endDate: previousEndDate.toISOString()
    });

    return calculateKPIs(previousQuotes);
};

// Get revenue trends (daily or monthly)
export const getRevenueTrends = (quotes, groupBy = 'day') => {
    const trends = {};

    quotes.forEach(quote => {
        if (quote.status === 'accepted' && quote.created_at) {
            const date = new Date(quote.created_at);
            let key;

            if (groupBy === 'day') {
                key = format(date, 'yyyy-MM-dd');
            } else if (groupBy === 'month') {
                key = format(date, 'yyyy-MM');
            }

            if (!trends[key]) {
                trends[key] = {
                    date: key,
                    revenue: 0,
                    count: 0
                };
            }

            trends[key].revenue += quote.total || 0;
            trends[key].count += 1;
        }
    });

    // Convert to array and sort by date
    return Object.values(trends).sort((a, b) => a.date.localeCompare(b.date));
};

// Get quote status distribution
export const getStatusDistribution = (quotes) => {
    const distribution = {
        draft: 0,
        pending: 0,
        accepted: 0,
        rejected: 0
    };

    quotes.forEach(quote => {
        if (distribution.hasOwnProperty(quote.status)) {
            distribution[quote.status]++;
        }
    });

    return [
        { name: 'Borrador', value: distribution.draft, color: '#94a3b8' },
        { name: 'Pendiente', value: distribution.pending, color: '#f97316' },
        { name: 'Aceptada', value: distribution.accepted, color: '#22c55e' },
        { name: 'Rechazada', value: distribution.rejected, color: '#ef4444' }
    ];
};

// Get seller performance
export const getSellerPerformance = async (quotes) => {
    const profiles = await getProfiles();
    const performanceMap = {};

    // Initialize performance for each seller
    profiles.forEach(profile => {
        performanceMap[profile.id] = {
            id: profile.id,
            name: profile.full_name || profile.email,
            revenue: 0,
            quotesCount: 0,
            acceptedCount: 0,
            conversionRate: 0
        };
    });

    // Aggregate quote data by seller
    quotes.forEach(quote => {
        if (performanceMap[quote.user_id]) {
            performanceMap[quote.user_id].quotesCount++;

            if (quote.status === 'accepted') {
                performanceMap[quote.user_id].acceptedCount++;
                performanceMap[quote.user_id].revenue += quote.total || 0;
            }
        }
    });

    // Calculate conversion rates
    Object.values(performanceMap).forEach(seller => {
        if (seller.quotesCount > 0) {
            seller.conversionRate = (seller.acceptedCount / seller.quotesCount * 100).toFixed(1);
        }
    });

    // Filter out sellers with no activity and sort by revenue
    return Object.values(performanceMap)
        .filter(seller => seller.quotesCount > 0)
        .sort((a, b) => b.revenue - a.revenue);
};

// Get product category breakdown
export const getCategoryBreakdown = (quotes) => {
    const categoryRevenue = {};

    quotes.forEach(quote => {
        if (quote.status === 'accepted' && quote.items) {
            quote.items.forEach(item => {
                const category = item.category || 'Sin categoría';
                if (!categoryRevenue[category]) {
                    categoryRevenue[category] = 0;
                }
                categoryRevenue[category] += (item.price * item.quantity) || 0;
            });
        }
    });

    return Object.entries(categoryRevenue)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
};

// Get recent activity timeline
export const getRecentActivity = (quotes, limit = 10) => {
    return quotes
        .slice(0, limit)
        .map(quote => ({
            id: quote.id,
            type: 'quote',
            action: `Cotización ${quote.status === 'accepted' ? 'aceptada' : quote.status === 'rejected' ? 'rechazada' : 'creada'}`,
            client: quote.client_name,
            amount: quote.total,
            status: quote.status,
            timestamp: quote.status_updated_at || quote.created_at
        }));
};

// Subscribe to real-time quote updates
export const subscribeToQuoteUpdates = (callback) => {
    const subscription = supabase
        .channel('quotes_channel')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'quotes'
            },
            (payload) => {
                callback(payload);
            }
        )
        .subscribe();

    return subscription;
};

// Unsubscribe from real-time updates
export const unsubscribeFromQuoteUpdates = (subscription) => {
    if (subscription) {
        supabase.removeChannel(subscription);
    }
};

// Get date range presets
export const getDateRangePresets = () => {
    const now = new Date();

    return {
        today: {
            label: 'Hoy',
            startDate: startOfDay(now),
            endDate: endOfDay(now)
        },
        thisMonth: {
            label: 'Este mes',
            startDate: startOfMonth(now),
            endDate: endOfMonth(now)
        },
        lastMonth: {
            label: 'Mes pasado',
            startDate: startOfMonth(subMonths(now, 1)),
            endDate: endOfMonth(subMonths(now, 1))
        },
        last3Months: {
            label: 'Últimos 3 meses',
            startDate: startOfMonth(subMonths(now, 2)),
            endDate: endOfDay(now)
        },
        last6Months: {
            label: 'Últimos 6 meses',
            startDate: startOfMonth(subMonths(now, 5)),
            endDate: endOfDay(now)
        },
        allTime: {
            label: 'Todo el tiempo',
            startDate: null,
            endDate: null
        }
    };
};
