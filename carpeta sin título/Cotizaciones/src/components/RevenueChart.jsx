import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const RevenueChart = ({ data, loading = false }) => {
    if (loading) {
        return (
            <div className="glass-panel p-6 rounded-xl animate-pulse">
                <div className="h-6 bg-gray-300 rounded w-1/4 mb-4"></div>
                <div className="h-80 bg-gray-200 rounded"></div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="glass-panel p-6 rounded-xl">
                <h3 className="text-xl font-bold text-petrol-800 mb-4">Tendencia de Ingresos</h3>
                <div className="h-80 flex items-center justify-center">
                    <p className="text-gray-500">No hay datos disponibles</p>
                </div>
            </div>
        );
    }

    // Format data for chart
    const chartData = data.map(item => ({
        ...item,
        displayDate: format(new Date(item.date), 'dd MMM', { locale: es })
    }));

    // Custom tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-600 mb-2">{payload[0].payload.displayDate}</p>
                    <p className="text-lg font-bold text-petrol-800">
                        ${payload[0].value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {payload[0].payload.count} cotización{payload[0].payload.count !== 1 ? 'es' : ''}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass-panel p-6 rounded-xl">
            <h3 className="text-xl font-bold text-petrol-800 mb-4">Tendencia de Ingresos</h3>
            <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="displayDate"
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
                        iconType="circle"
                    />
                    <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Ingresos"
                        stroke="#0e7490"
                        strokeWidth={3}
                        dot={{ fill: '#0e7490', r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default RevenueChart;
