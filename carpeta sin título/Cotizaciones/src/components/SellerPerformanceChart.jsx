import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SellerPerformanceChart = ({ data, loading = false }) => {
    if (loading) {
        return (
            <div className="glass-panel p-6 rounded-xl animate-pulse">
                <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
                <div className="h-80 bg-gray-200 rounded"></div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="glass-panel p-6 rounded-xl">
                <h3 className="text-xl font-bold text-petrol-800 mb-4">Rendimiento por Vendedor</h3>
                <div className="h-80 flex items-center justify-center">
                    <p className="text-gray-500">No hay datos disponibles</p>
                </div>
            </div>
        );
    }

    // Custom tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const seller = payload[0].payload;
            return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-600 mb-2">{seller.name}</p>
                    <p className="text-lg font-bold text-petrol-800">
                        ${seller.revenue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                        <p>{seller.quotesCount} cotizaciones totales</p>
                        <p>{seller.acceptedCount} aceptadas</p>
                        <p className="font-semibold text-green-600">{seller.conversionRate}% conversión</p>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Color scale based on performance
    const getBarColor = (index) => {
        const colors = ['#0e7490', '#0891b2', '#06b6d4', '#22d3ee', '#67e8f9'];
        return colors[index % colors.length];
    };

    return (
        <div className="glass-panel p-6 rounded-xl">
            <h3 className="text-xl font-bold text-petrol-800 mb-4">Rendimiento por Vendedor</h3>
            <ResponsiveContainer width="100%" height={320}>
                <BarChart
                    data={data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    layout="horizontal"
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="name"
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                    />
                    <YAxis
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                        dataKey="revenue"
                        radius={[8, 8, 0, 0]}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SellerPerformanceChart;
