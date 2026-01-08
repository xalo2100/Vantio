import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const QuoteStatusChart = ({ data, loading = false }) => {
    if (loading) {
        return (
            <div className="glass-panel p-6 rounded-xl animate-pulse">
                <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
                <div className="h-80 bg-gray-200 rounded"></div>
            </div>
        );
    }

    // Filter out statuses with 0 value
    const filteredData = data?.filter(item => item.value > 0) || [];

    if (filteredData.length === 0) {
        return (
            <div className="glass-panel p-6 rounded-xl">
                <h3 className="text-xl font-bold text-petrol-800 mb-4">Distribución por Estado</h3>
                <div className="h-80 flex items-center justify-center">
                    <p className="text-gray-500">No hay datos disponibles</p>
                </div>
            </div>
        );
    }

    const COLORS = {
        'Borrador': '#94a3b8',
        'Pendiente': '#f97316',
        'Aceptada': '#22c55e',
        'Rechazada': '#ef4444'
    };

    // Custom label to show percentage
    const renderLabel = (entry) => {
        const total = filteredData.reduce((sum, item) => sum + item.value, 0);
        const percent = ((entry.value / total) * 100).toFixed(0);
        return `${percent}%`;
    };

    // Custom tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const total = filteredData.reduce((sum, item) => sum + item.value, 0);
            const percent = ((payload[0].value / total) * 100).toFixed(1);

            return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-600 mb-1">{payload[0].name}</p>
                    <p className="text-lg font-bold text-petrol-800">{payload[0].value} cotizaciones</p>
                    <p className="text-xs text-gray-500 mt-1">{percent}% del total</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass-panel p-6 rounded-xl">
            <h3 className="text-xl font-bold text-petrol-800 mb-4">Distribución por Estado</h3>
            <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                    <Pie
                        data={filteredData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderLabel}
                        outerRadius={100}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                    >
                        {filteredData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#94a3b8'} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default QuoteStatusChart;
