'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Ticket, Status } from '@/types/database';
import { useAuth } from '@/components/AuthContext';
import { model } from '@/utils/gemini';
import { CheckCircle, Play, FileText, Sparkles, AlertTriangle, MessageSquare, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function TechnicianDashboard() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [notes, setNotes] = useState('');
    const [generatedReport, setGeneratedReport] = useState('');
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchTickets();

        const channel = supabase
            .channel('tickets_tech')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tickets' },
                () => fetchTickets()
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
    };

    const updateStatus = async (ticketId: number, newStatus: Status) => {
        const { error } = await supabase
            .from('tickets')
            .update({ estado: newStatus })
            .eq('id', ticketId);

        if (error) alert('Error updating status: ' + error.message);
        else fetchTickets();
    };

    const generateReport = async () => {
        if (!notes) return alert('Please enter some notes first.');
        setGenerating(true);

        try {
            const prompt = `
        Actúa como un experto en servicio técnico.
        Transforma las siguientes notas técnicas crudas en un reporte formal, profesional y empático para el cliente.
        
        Notas del técnico: "${notes}"
        
        El reporte debe incluir:
        1. Resumen del problema.
        2. Solución aplicada.
        3. Recomendaciones (si aplica).
        Mantén un tono cordial y claro.
      `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            setGeneratedReport(text);
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Failed to generate report. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const saveReport = async () => {
        if (!selectedTicket || !user) return;

        const { error } = await supabase.from('reportes').insert([
            {
                ticket_id: selectedTicket.id,
                tecnico_id: user.id,
                notas_tecnico: notes,
                reporte_final_ia: generatedReport,
            },
        ]);

        if (error) {
            alert('Error saving report: ' + error.message);
        } else {
            alert('Report saved successfully!');
            setNotes('');
            setGeneratedReport('');
            setSelectedTicket(null);
            updateStatus(selectedTicket.id, 'finalizado');
        }
    };

    return (
        <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
            <header className="flex-shrink-0">
                <h1 className="text-3xl font-bold text-gray-900">Panel Técnico</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Command Center v2.0
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                {/* Ticket List (Sidebar) */}
                <div className="lg:col-span-4 glass-card rounded-2xl overflow-hidden flex flex-col">
                    <div className="px-4 py-4 border-b border-gray-200/50 bg-gray-50/50">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                            Tickets Pendientes
                        </h3>
                    </div>
                    <ul className="divide-y divide-gray-200/50 overflow-y-auto flex-1">
                        {tickets.map((ticket) => (
                            <motion.li
                                key={ticket.id}
                                layout
                                whileHover={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
                                className={clsx(
                                    "px-4 py-4 cursor-pointer transition-colors border-l-4",
                                    selectedTicket?.id === ticket.id
                                        ? 'bg-indigo-50/50 border-indigo-500'
                                        : 'border-transparent hover:border-gray-300'
                                )}
                                onClick={() => setSelectedTicket(ticket)}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-gray-900">#{ticket.id}</span>
                                    <span className={clsx(
                                        "px-2 py-0.5 text-[10px] font-bold uppercase rounded-full",
                                        ticket.prioridad === 'urgente' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                    )}>
                                        {ticket.prioridad}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-indigo-600 truncate mb-1">
                                    {ticket.cliente_nombre}
                                </p>
                                <p className="text-xs text-gray-500 line-clamp-2">
                                    {ticket.descripcion_falla}
                                </p>
                            </motion.li>
                        ))}
                    </ul>
                </div>

                {/* Workspace (Main Area) */}
                <div className="lg:col-span-8 glass-card rounded-2xl p-6 flex flex-col overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {selectedTicket ? (
                            <motion.div
                                key={selectedTicket.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex justify-between items-start border-b border-gray-200/50 pb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                            <Wrench className="w-6 h-6 mr-3 text-gray-400" />
                                            Ticket #{selectedTicket.id}
                                        </h2>
                                        <p className="text-gray-500 mt-1 flex items-center">
                                            <span className="font-medium text-gray-900 mr-2">{selectedTicket.cliente_nombre}</span>
                                            • <span className="ml-2 text-xs text-gray-400">{new Date(selectedTicket.created_at).toLocaleString()}</span>
                                        </p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => updateStatus(selectedTicket.id, 'en_proceso')}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-yellow-700 bg-yellow-100 hover:bg-yellow-200 transition-colors"
                                        >
                                            <Play className="mr-2 h-4 w-4" /> En Proceso
                                        </button>
                                        <button
                                            onClick={() => updateStatus(selectedTicket.id, 'finalizado')}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 transition-colors"
                                        >
                                            <CheckCircle className="mr-2 h-4 w-4" /> Finalizar
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start">
                                    <AlertTriangle className="w-5 h-5 text-orange-500 mr-3 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-bold text-orange-800">Reporte de Falla</h4>
                                        <p className="text-sm text-orange-700 mt-1">{selectedTicket.descripcion_falla}</p>
                                    </div>
                                </div>

                                {/* AI Report Generator */}
                                <div className="bg-white/50 rounded-xl p-6 border border-gray-100 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                        <Sparkles className="mr-2 h-5 w-5 text-indigo-500" />
                                        Asistente de Reportes IA
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Notas Técnicas (Borrador)
                                            </label>
                                            <textarea
                                                rows={3}
                                                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 bg-white transition-all"
                                                placeholder="Ej: Se cambió la pantalla y se limpió el puerto de carga..."
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                            />
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                onClick={generateReport}
                                                disabled={generating}
                                                className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md transform transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {generating ? (
                                                    <>
                                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Generando con Gemini...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="mr-2 h-4 w-4" /> Generar Reporte
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        <AnimatePresence>
                                            {generatedReport && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="mt-4"
                                                >
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Reporte Final (Editable)
                                                    </label>
                                                    <div className="relative">
                                                        <textarea
                                                            rows={8}
                                                            className="block w-full rounded-xl border-indigo-200 shadow-inner focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-4 bg-indigo-50/30 text-gray-800 font-medium"
                                                            value={generatedReport}
                                                            onChange={(e) => setGeneratedReport(e.target.value)}
                                                        />
                                                        <div className="absolute top-2 right-2">
                                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                                                <Sparkles className="w-3 h-3 mr-1" /> IA Generated
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 flex justify-end">
                                                        <button
                                                            onClick={saveReport}
                                                            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 shadow-lg transform transition-all hover:scale-105"
                                                        >
                                                            <FileText className="mr-2 h-5 w-5" /> Guardar y Cerrar Ticket
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center h-full text-center text-gray-400"
                            >
                                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <MessageSquare className="w-10 h-10 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No hay ticket seleccionado</h3>
                                <p className="mt-1">Selecciona un ticket de la lista para comenzar a trabajar.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
