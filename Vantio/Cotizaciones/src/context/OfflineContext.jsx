import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const OfflineContext = createContext();

export const useOffline = () => {
    return useContext(OfflineContext);
};

export const OfflineProvider = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [offlineQuotes, setOfflineQuotes] = useState([]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncOfflineQuotes();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Load existing offline quotes on mount
        const savedQuotes = localStorage.getItem('offline_quotes');
        if (savedQuotes) {
            setOfflineQuotes(JSON.parse(savedQuotes));
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const saveOfflineQuote = (quoteData) => {
        const newQuote = {
            ...quoteData,
            id: `temp-${Date.now()}`, // Temporary ID
            created_at: new Date().toISOString(),
            status: 'draft', // Always draft when offline
            is_offline: true
        };

        const updatedQuotes = [...offlineQuotes, newQuote];
        setOfflineQuotes(updatedQuotes);
        localStorage.setItem('offline_quotes', JSON.stringify(updatedQuotes));
        return newQuote;
    };

    const syncOfflineQuotes = async () => {
        const savedQuotes = localStorage.getItem('offline_quotes');
        if (!savedQuotes) return;

        const quotesToSync = JSON.parse(savedQuotes);
        if (quotesToSync.length === 0) return;

        console.log('Syncing offline quotes...', quotesToSync.length);

        const remainingQuotes = [];

        for (const quote of quotesToSync) {
            try {
                // Remove temporary fields
                const { id, is_offline, ...quotePayload } = quote;

                const { error } = await supabase
                    .from('quotes')
                    .insert([quotePayload]);

                if (error) throw error;
                console.log('Synced quote:', quote.quote_number);
            } catch (error) {
                console.error('Error syncing quote:', quote.quote_number, error);
                remainingQuotes.push(quote); // Keep failed ones
            }
        }

        setOfflineQuotes(remainingQuotes);
        localStorage.setItem('offline_quotes', JSON.stringify(remainingQuotes));

        if (remainingQuotes.length === 0) {
            alert('¡Conexión restaurada! Todas las cotizaciones offline se han sincronizado.');
        } else {
            alert(`Conexión restaurada. Se sincronizaron algunas cotizaciones, pero ${remainingQuotes.length} fallaron.`);
        }
    };

    // Product Caching Logic
    const cacheProducts = (products) => {
        localStorage.setItem('cached_products', JSON.stringify(products));
    };

    const getCachedProducts = () => {
        const cached = localStorage.getItem('cached_products');
        return cached ? JSON.parse(cached) : [];
    };

    const value = {
        isOnline,
        offlineQuotes,
        saveOfflineQuote,
        cacheProducts,
        getCachedProducts
    };

    return (
        <OfflineContext.Provider value={value}>
            {children}
        </OfflineContext.Provider>
    );
};
