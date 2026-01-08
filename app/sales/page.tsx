'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Ticket, Priority } from '@/types/database';
import { useAuth } from '@/components/AuthContext';
import { Plus, AlertCircle, Clock, CheckCircle, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function SalesDashboard() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTicket, setNewTicket] = useState({
        cliente_nombre: '',
        descripcion_falla: '',
        prioridad: 'media' as Priority,
    });

    useEffect(() => {
        fetchTickets();

        const channel = supabase
            .channel('tickets_sales')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tickets' },
                (payload) => {
                    fetchTickets();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchTickets = async () => {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching tickets:', error);
        else setTickets(data || []);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return alert('Must be logged in');

        const { error } = await supabase.from('tickets').insert([
            {
                ...newTicket,
                creado_por: user.id,
                estado: 'abierto',
            },
        ]);

        if (error) {
            alert('Error creating ticket: ' + error.message);
        } else {
            setNewTicket({
                cliente_nombre: '',
                descripcion_falla: '',
                prioridad: 'media',
            });
            fetchTickets();
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgente': return 'bg-red-100 text-red-800 border-red-200';
            case 'alta': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'media': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-green-100 text-green-800 border-green-200';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'abierto': return 'bg-blue-100 text-blue-800';
            case 'en_proceso': return 'bg-purple-100 text-purple-800';
            case 'finalizado': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-8">
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Panel de Ventas</h1>
                    <p className="mt-2 text-lg text-gray-600">
                        Gestión de tickets y seguimiento en tiempo real.
                    </p>
                </div>
                <div className="hidden sm:block">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <Activity className="w-4 h-4 mr-2" />
                        Sistema Operativo
                    </span>
                </div>
            </motion.header>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Ticket Creation Form */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-1"
                >
                    <div className="glass-card rounded-2xl p-6 sticky top-24">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                            <Plus className="w-5 h-5 mr-2 text-indigo-600" />
                            Nuevo Ticket
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cliente
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 bg-white/50 backdrop-blur-sm transition-all"
                                    placeholder="Nombre del cliente"
                                    value={newTicket.cliente_nombre}
                                    onChange={(e) =>
                                        setNewTicket({ ...newTicket, cliente_nombre: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción de la Falla
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 bg-white/50 backdrop-blur-sm transition-all"
                                    placeholder="Detalles del problema..."
                                    value={newTicket.descripcion_falla}
                                    onChange={(e) =>
                                        setNewTicket({
                                            ...newTicket,
                                            descripcion_falla: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Prioridad
                                </label>
                                <select
                                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 bg-white/50 backdrop-blur-sm transition-all"
                                    value={newTicket.prioridad}
                                    onChange={(e) =>
                                        setNewTicket({
                                            ...newTicket,
                                            prioridad: e.target.value as Priority,
                                        })
                                    }
                                >
                                    <option value="baja">Baja</option>
                                    <option value="media">Media</option>
                                    <option value="alta">Alta</option>
                                    <option value="urgente">Urgente</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="w-full inline-flex justify-center items-center rounded-xl border border-transparent shadow-lg px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-base font-medium text-white hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                Crear Ticket
                            </button>
                        </form>
                    </div>
                </motion.div>

                {/* Live Tracking List */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-2"
                >
                    <div className="glass-card rounded-2xl overflow-hidden min-h-[600px] flex flex-col">
                        <div className="px-6 py-5 border-b border-gray-200/50 bg-white/30 backdrop-blur-md flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                <Clock className="w-5 h-5 mr-2 text-indigo-600" />
                                Seguimiento en Vivo
                            </h3>
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {tickets.length} Tickets
                            </span>
                        </div>

                        <ul className="divide-y divide-gray-200/50 overflow-y-auto flex-1 p-2">
                            <AnimatePresence>
                                {loading ? (
                                    <motion.li
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="p-8 text-center text-gray-500"
                                    >
                                        Cargando tickets...
                                    </motion.li>
                                ) : tickets.length === 0 ? (
                                    <motion.li
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="p-8 text-center text-gray-500"
                                    >
                                        No hay tickets recientes.
                                    </motion.li>
                                ) : (
                                    tickets.map((ticket) => (
                                        <motion.li
                                            key={ticket.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="p-4 hover:bg-white/40 rounded-xl transition-colors mb-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col flex-1 mr-4">
                                                    <div className="flex items-center mb-1">
                                                        <span className="text-sm font-bold text-gray-900 mr-2">
                                                            {ticket.cliente_nombre}
                                                        </span>
                                                        <span className={clsx(
                                                            "px-2 py-0.5 text-xs font-medium rounded-full border",
                                                            getPriorityColor(ticket.prioridad || 'media')
                                                        )}>
                                                            {ticket.prioridad}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 line-clamp-2">
                                                        {ticket.descripcion_falla}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end min-w-[100px]">
                                                    <span
                                                        className={clsx(
                                                            "px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider mb-1",
                                                            getStatusColor(ticket.estado || 'abierto')
                                                        )}
                                                    >
                                                        {ticket.estado?.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-xs text-gray-400 flex items-center">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.li>
                                    ))
                                )}
                            </AnimatePresence>
                        </ul>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
