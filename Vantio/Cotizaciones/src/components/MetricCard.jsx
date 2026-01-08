import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const MetricCard = ({ title, value, previousValue, icon: Icon, color, format = 'number', loading = false }) => {
    // Calculate trend
    const calculateTrend = () => {
        if (!previousValue || previousValue === 0) return null;

        const change = ((value - previousValue) / previousValue) * 100;
        return {
            percentage: Math.abs(change).toFixed(1),
            isPositive: change >= 0
        };
    };

    const trend = calculateTrend();

    // Format value based on type
    const formatValue = (val) => {
        if (format === 'currency') {
            return `$${val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else if (format === 'percentage') {
            return `${val}%`;
        } else {
            return val.toLocaleString('es-AR');
        }
    };

    if (loading) {
        return (
            <div className="glass-panel p-6 rounded-xl animate-pulse">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="h-4 bg-gray-300 rounded w-1/2 mb-3"></div>
                        <div className="h-8 bg-gray-300 rounded w-3/4"></div>
                    </div>
                    <div className={`p-3 rounded-lg ${color}`}>
                        <div className="w-6 h-6 bg-white/30 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel p-6 rounded-xl card-hover">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-gray-600 text-sm font-medium mb-2">{title}</p>
                    <h3 className="text-3xl font-bold text-petrol-800">{formatValue(value)}</h3>

                    {trend && (
                        <div className="mt-3 flex items-center gap-2">
                            <div className={`flex items-center gap-1 text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {trend.isPositive ? (
                                    <TrendingUp size={16} />
                                ) : (
                                    <TrendingDown size={16} />
                                )}
                                <span>{trend.percentage}%</span>
                            </div>
                            <span className="text-gray-500 text-xs">vs período anterior</span>
                        </div>
                    )}
                </div>

                <div className={`p-3 rounded-lg ${color}`}>
                    {Icon && <Icon className="text-white" size={24} />}
                </div>
            </div>
        </div>
    );
};

export default MetricCard;
