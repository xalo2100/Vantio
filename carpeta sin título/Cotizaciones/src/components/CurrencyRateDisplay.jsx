import React, { useState, useEffect } from 'react';

const CurrencyRateDisplay = ({ onRatesLoaded }) => {
    const [rates, setRates] = useState({
        CLP: 0,
        EUR: 0,
        lastUpdated: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchRates = async () => {
        try {
            setLoading(true);
            // Using a free API for demo purposes. In production, consider a paid plan or caching.
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await response.json();

            const newRates = {
                CLP: data.rates.CLP,
                EUR: data.rates.EUR,
                lastUpdated: new Date()
            };
            setRates(newRates);
            if (onRatesLoaded) onRatesLoaded(newRates);
            setError(null);
        } catch (err) {
            console.error('Error fetching rates:', err);
            setError('No se pudieron cargar las tasas de cambio.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRates();
        // Refresh every hour
        const interval = setInterval(fetchRates, 3600000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="text-xs text-gray-500">Cargando tasas...</div>;
    if (error) return <div className="text-xs text-red-500" title={error}>Error tasas</div>;

    return (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
            <h4 className="font-semibold text-blue-800 mb-1">Tipos de cambio:</h4>
            <div className="space-y-1 text-blue-700">
                <div className="flex justify-between">
                    <span>1 USD =</span>
                    <span className="font-medium">${rates.CLP?.toFixed(2)} CLP</span>
                </div>
                <div className="flex justify-between">
                    <span>1 USD =</span>
                    <span className="font-medium">€{rates.EUR?.toFixed(4)} EUR</span>
                </div>
                <div className="flex justify-between">
                    <span>1 EUR =</span>
                    <span className="font-medium">${(rates.CLP / rates.EUR)?.toFixed(2)} CLP</span>
                </div>
            </div>
            <div className="mt-2 text-xs text-blue-400 italic">
                Actualizado: {rates.lastUpdated?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    );
};

export default CurrencyRateDisplay;
