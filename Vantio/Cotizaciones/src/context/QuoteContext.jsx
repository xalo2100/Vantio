import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useRole } from '../hooks/useRole';
import { pipedriveService } from '../services/pipedriveService';

const QuoteContext = createContext();

export const useQuotes = () => {
    const context = useContext(QuoteContext);
    if (!context) {
        throw new Error('useQuotes must be used within a QuoteProvider');
    }
    return context;
};

export const QuoteProvider = ({ children }) => {
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { isAdmin } = useRole();

    // Cargar cotizaciones desde Supabase
    useEffect(() => {
        if (user) {
            fetchQuotes();

            // Suscribirse a cambios en tiempo real
            // Para admins: todas las cotizaciones de la org
            // Para vendedores: solo sus cotizaciones
            const channelConfig = {
                event: '*',
                schema: 'public',
                table: 'quotes'
            };

            // Solo filtrar por user_id si NO es admin
            if (!isAdmin) {
                channelConfig.filter = `user_id=eq.${user.id}`;
            }

            const subscription = supabase
                .channel('quotes_changes')
                .on('postgres_changes', channelConfig, (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setQuotes(prev => [payload.new, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setQuotes(prev => prev.map(q => q.id === payload.new.id ? payload.new : q));
                    } else if (payload.eventType === 'DELETE') {
                        setQuotes(prev => prev.filter(q => q.id !== payload.old.id));
                    }
                })
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        } else {
            setQuotes([]);
            setLoading(false);
        }
    }, [user, isAdmin]);

    const fetchQuotes = async () => {
        try {
            setLoading(true);

            // Primero, obtener el perfil del usuario actual para verificar si es admin
            const { data: currentProfile } = await supabase
                .from('profiles')
                .select('role, organization_id')
                .eq('id', user.id)
                .single();

            const userIsAdmin = currentProfile?.role === 'admin' || currentProfile?.role === 'super_admin';

            // Para admins: obtener todas las cotizaciones de la org
            // Para vendedores: solo sus cotizaciones
            let query = supabase
                .from('quotes')
                .select('*')
                .order('created_at', { ascending: false });

            // Solo filtrar por user_id si NO es admin
            if (!userIsAdmin) {
                query = query.eq('user_id', user.id);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Si es admin, obtener info de los vendedores
            if (userIsAdmin && data && data.length > 0) {
                const userIds = [...new Set(data.map(q => q.user_id))];
                const { data: sellers } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, role')
                    .in('id', userIds);

                // Agregar info del vendedor a cada cotización
                const quotesWithSellers = data.map(quote => ({
                    ...quote,
                    seller: sellers?.find(s => s.id === quote.user_id)
                }));

                setQuotes(quotesWithSellers || []);
            } else {
                setQuotes(data || []);
            }
        } catch (error) {
            console.error('Error fetching quotes:', error);
            setQuotes([]); // Asegurar que siempre haya un array
        } finally {
            setLoading(false);
        }
    };

    const addQuote = async (quoteData) => {
        try {
            const newQuote = {
                user_id: user.id,
                quote_number: quoteData.quote_number || quoteData.quoteNumber || `QT-${Date.now().toString().slice(-6)}`,
                // Robust mapping: Check camelCase AND snake_case AND possible fallbacks
                client_name: quoteData.clientName || quoteData.client_name || 'Cliente Genérico',
                client_email: quoteData.clientEmail || quoteData.client_email || 'sin@email.com',
                project_name: quoteData.projectName || quoteData.project_name || 'Nueva Cotización',
                valid_until: (quoteData.validUntil && quoteData.validUntil.trim() !== "") ? quoteData.validUntil : null,
                items: quoteData.items,
                notes: quoteData.notes,
                subtotal: quoteData.subtotal,
                tax: quoteData.tax,
                total: quoteData.total,
                status: quoteData.status || 'pending',
                conditions: quoteData.conditions,
                internal_notes: quoteData.internal_notes || quoteData.internalNotes,
                currency: quoteData.currency || 'USD',
                exchange_rate: quoteData.exchangeRate || quoteData.exchange_rate || 1.0,
                payment_terms: quoteData.paymentTerms || quoteData.payment_terms,
                delivery_time: quoteData.deliveryTime || quoteData.delivery_time,
                organization_id: quoteData.organization_id || quoteData.organizationId,
                client_phone: quoteData.clientPhone || quoteData.client_phone,
                company_name: quoteData.companyName || quoteData.company_name,
                // Add missing fields to ensure persistence
                client_rut: quoteData.clientRut || quoteData.rut,
                client_city: quoteData.clientCity || quoteData.city,
                client_address: quoteData.clientAddress || quoteData.address,
                client_contact: quoteData.clientContact || quoteData.contactName || quoteData.contact_name
            };

            const { data, error } = await supabase
                .from('quotes')
                .insert([newQuote])
                .select()
                .single();

            if (error) {
                console.error("❌ Supabase INSERT error details:", error);
                throw error;
            }

            // Convertir formato de Supabase a formato de la app
            const formattedQuote = {
                id: data.id,
                quoteNumber: data.quote_number,
                clientName: data.client_name,
                clientEmail: data.client_email,
                projectName: data.project_name,
                validUntil: data.valid_until,
                items: data.items,
                notes: data.notes,
                subtotal: parseFloat(data.subtotal),
                tax: parseFloat(data.tax),
                total: parseFloat(data.total),
                status: data.status,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                conditions: data.conditions,
                internalNotes: data.internal_notes,
                currency: data.currency,
                exchangeRate: parseFloat(data.exchange_rate || 1.0),
                paymentTerms: data.payment_terms,
                deliveryTime: data.delivery_time,
                clientPhone: data.client_phone,
                companyName: data.company_name
            };

            // Sync to Pipedrive if enabled (Background process)
            // OPTIMISTIC UPDATE: Add to local state immediately with hybrid keys to satisfy all consumers
            const optimisticQuote = {
                ...data, // snake_case from DB
                ...formattedQuote, // camelCase from app logic
                seller: isAdmin ? { full_name: user.email /* placeholder until refresh */ } : undefined
            };

            setQuotes(prev => [optimisticQuote, ...prev]);
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();

                const { data: orgSettings } = await supabase
                    .from('organization_settings')
                    .select('pipedrive_sync_enabled')
                    .eq('organization_id', profile.organization_id)
                    .single();

                if (orgSettings?.pipedrive_sync_enabled) {
                    console.log('Syncing client and quote to Pipedrive...');

                    // First, sync client to Pipedrive (with vendor assignment)
                    supabase.functions.invoke('sync-client-to-pipedrive', {
                        body: {
                            quoteId: data.id,
                            clientName: quoteData.clientName,
                            clientEmail: quoteData.clientEmail,
                            companyName: quoteData.companyName,
                            clientPhone: quoteData.clientPhone,
                            clientRut: quoteData.clientRut || quoteData.rut,
                            clientCity: quoteData.clientCity || quoteData.city,
                            clientAddress: quoteData.clientAddress || quoteData.address,
                            sellerEmail: user.email,
                            organizationId: profile.organization_id
                        }
                    }).then(res => {
                        console.log('Client sync result:', res);

                        // Then, sync quote as deal to Pipedrive
                        return pipedriveService.syncQuoteToPipedrive(data.id, user.email);
                    }).then(res => {
                        console.log('Quote sync result:', res);
                    }).catch(err => {
                        console.error('Pipedrive sync error:', err);
                    });
                }
            } catch (syncError) {
                console.error('Error checking Pipedrive settings:', syncError);
            }


            return formattedQuote;
        } catch (error) {
            console.error('Error adding quote:', error);
            throw error;
        }
    };

    const updateQuote = async (id, updates) => {
        try {
            // Convertir formato de la app a formato de Supabase
            const supabaseUpdates = {};
            if (updates.clientName) supabaseUpdates.client_name = updates.clientName;
            if (updates.clientEmail) supabaseUpdates.client_email = updates.clientEmail;
            if (updates.projectName) supabaseUpdates.project_name = updates.projectName;
            if (updates.validUntil !== undefined) {
                // Sanitize valid_until: prevent empty string causing invalid input syntax
                supabaseUpdates.valid_until = (updates.validUntil && updates.validUntil.trim() !== "") ? updates.validUntil : null;
            }
            if (updates.items) supabaseUpdates.items = updates.items;
            if (updates.notes !== undefined) supabaseUpdates.notes = updates.notes;
            if (updates.subtotal !== undefined) supabaseUpdates.subtotal = updates.subtotal;
            if (updates.tax !== undefined) supabaseUpdates.tax = updates.tax;
            if (updates.total !== undefined) supabaseUpdates.total = updates.total;
            if (updates.status) supabaseUpdates.status = updates.status;
            if (updates.rejectionReason) supabaseUpdates.rejection_reason = updates.rejectionReason;
            if (updates.statusUpdatedAt) supabaseUpdates.status_updated_at = updates.statusUpdatedAt;
            if (updates.conditions !== undefined) supabaseUpdates.conditions = updates.conditions;
            if (updates.internalNotes !== undefined) supabaseUpdates.internal_notes = updates.internalNotes;
            if (updates.paymentTerms !== undefined) supabaseUpdates.payment_terms = updates.paymentTerms;
            if (updates.deliveryTime !== undefined) supabaseUpdates.delivery_time = updates.deliveryTime;
            if (updates.currency) supabaseUpdates.currency = updates.currency;
            if (updates.exchangeRate !== undefined) supabaseUpdates.exchange_rate = updates.exchangeRate;
            if (updates.clientPhone !== undefined) supabaseUpdates.client_phone = updates.clientPhone;
            if (updates.companyName !== undefined) supabaseUpdates.company_name = updates.companyName;
            // Add missing persistence fields
            if (updates.clientRut !== undefined) supabaseUpdates.client_rut = updates.clientRut;
            if (updates.clientCity !== undefined) supabaseUpdates.client_city = updates.clientCity;
            if (updates.clientAddress !== undefined) supabaseUpdates.client_address = updates.clientAddress;
            if (updates.clientContact !== undefined) supabaseUpdates.client_contact = updates.clientContact;

            const { error } = await supabase
                .from('quotes')
                .update(supabaseUpdates)
                .eq('id', id);

            if (error) throw error;

            // Sync to Pipedrive if enabled (Background process)
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();

                const { data: orgSettings } = await supabase
                    .from('organization_settings')
                    .select('pipedrive_sync_enabled')
                    .eq('organization_id', profile.organization_id)
                    .single();

                if (orgSettings?.pipedrive_sync_enabled) {
                    console.log('Syncing updated quote to Pipedrive...');
                    pipedriveService.syncQuoteToPipedrive(id, user.email)
                        .then(res => console.log('Quote update sync result:', res))
                        .catch(err => console.error('Pipedrive update sync error:', err));
                }
            } catch (syncError) {
                console.error('Error checking Pipedrive settings on update:', syncError);
            }
        } catch (error) {
            console.error('Error updating quote:', error);
            throw error;
        }
    };

    const deleteQuote = async (id) => {
        try {
            const { error } = await supabase
                .from('quotes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Optimistic update: Remove from local state immediately
            setQuotes(prev => prev.filter(q => q.id !== id));
        } catch (error) {
            console.error('Error deleting quote:', error);
            throw error;
        }
    };

    const getQuoteById = (id) => {
        const quote = quotes.find(q => q.id === id);
        if (!quote) return null;

        // Convertir formato de Supabase a formato de la app
        return {
            id: quote.id,
            quoteNumber: quote.quote_number || quote.quoteNumber,
            clientName: quote.client_name || quote.clientName,
            clientEmail: quote.client_email || quote.clientEmail,
            projectName: quote.project_name || quote.projectName,
            validUntil: quote.valid_until || quote.validUntil,
            items: quote.items,
            notes: quote.notes,
            subtotal: parseFloat(quote.subtotal),
            tax: parseFloat(quote.tax),
            total: parseFloat(quote.total),
            status: quote.status,
            rejectionReason: quote.rejection_reason || quote.rejectionReason,
            createdAt: quote.created_at || quote.createdAt,
            updatedAt: quote.updated_at || quote.updatedAt,
            statusUpdatedAt: quote.status_updated_at || quote.statusUpdatedAt,
            conditions: quote.conditions,
            internalNotes: quote.internal_notes || quote.internalNotes,
            paymentTerms: quote.payment_terms || quote.paymentTerms,

            deliveryTime: quote.delivery_time || quote.deliveryTime,
            companyName: quote.company_name || quote.companyName
        };
    };

    const updateQuoteStatus = async (id, status, rejectionReason = null) => {
        const updates = {
            status,
            statusUpdatedAt: new Date().toISOString()
        };

        if (status === 'rejected' && rejectionReason) {
            updates.rejectionReason = rejectionReason;
        }

        await updateQuote(id, updates);
    };

    return (
        <QuoteContext.Provider value={{
            quotes: quotes.map(q => ({
                id: q.id,
                quoteNumber: q.quote_number || q.quoteNumber,
                clientName: q.client_name || q.clientName,
                clientEmail: q.client_email || q.clientEmail,
                projectName: q.project_name || q.projectName,
                validUntil: q.valid_until || q.validUntil,
                items: q.items,
                notes: q.notes,
                subtotal: parseFloat(q.subtotal),
                tax: parseFloat(q.tax),
                total: parseFloat(q.total),
                status: q.status,
                rejectionReason: q.rejection_reason || q.rejectionReason,
                createdAt: q.created_at || q.createdAt,
                updatedAt: q.updated_at || q.updatedAt,
                statusUpdatedAt: q.status_updated_at || q.statusUpdatedAt,
                conditions: q.conditions,
                internalNotes: q.internal_notes || q.internalNotes,
                currency: q.currency,
                exchangeRate: parseFloat(q.exchange_rate || 1.0),
                paymentTerms: q.payment_terms || q.paymentTerms,

                deliveryTime: q.delivery_time || q.deliveryTime,
                companyName: q.company_name || q.companyName
            })),
            loading,
            addQuote,
            updateQuote,
            deleteQuote,
            getQuoteById,
            updateQuoteStatus
        }}>
            {children}
        </QuoteContext.Provider>
    );
};
