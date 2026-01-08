import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRole } from '../hooks/useRole';
import { FileText, Plus, Search, Calendar, DollarSign, User, Loader2, ClipboardCheck } from 'lucide-react';

const SalesNotesList = () => {
    const navigate = useNavigate();
    const { profile } = useRole();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (profile) {
            fetchNotes();
        }
    }, [profile]);

    const fetchNotes = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('sales_notes')
                .select(`
                    *,
                    quote:quotes (
                        quote_number,
                        client_name,
                        client_email,
                        total,
                        subtotal,
                        tax
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotes(data || []);
        } catch (error) {
            console.error('Error fetching sales notes:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            paid: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800'
        };

        const labels = {
            pending: 'Pendiente',
            paid: 'Pagada',
            cancelled: 'Cancelada'
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
                {labels[status] || status}
            </span>
        );
    };

    const filteredNotes = notes.filter(note => {
        const searchLower = searchTerm.toLowerCase();
        const clientName = note.client_name?.toLowerCase() || '';
        const noteNumber = note.note_number?.toLowerCase() || '';

        return clientName.includes(searchLower) ||
            noteNumber.includes(searchLower);
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-petrol-800">Notas de Venta</h2>
                    <p className="text-gray-600 mt-1">Gestiona tus notas de venta y documentos comerciales</p>
                </div>
                {/* <button
                    onClick={() => navigate('/sales-notes/new')}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={18} />
                    Nueva Nota
                </button> */}
            </div>

            {/* Search and Filter */}
            <div className="glass-panel p-4 rounded-xl">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, empresa o número..."
                        className="input-field w-full pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-orange-500" size={40} />
                </div>
            ) : filteredNotes.length === 0 ? (
                <div className="glass-panel p-12 rounded-xl text-center">
                    <ClipboardCheck className="mx-auto text-gray-400 mb-4" size={64} />
                    <h3 className="text-xl font-bold text-petrol-800 mb-2">No hay notas de venta</h3>
                    <p className="text-gray-600">Genera una nota de venta desde una cotización aprobada.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredNotes.map((note) => (
                        <div
                            key={note.id}
                            onClick={() => navigate(`/sales-notes/${note.id}`)}
                            className="glass-panel p-6 rounded-xl card-hover cursor-pointer group"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-mono text-lg font-bold text-petrol-800">
                                            {note.note_number}
                                        </span>
                                        {getStatusBadge(note.status)}
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                                        <User size={16} />
                                        <span className="font-medium">
                                            {note.client_name || 'Cliente Sin Nombre'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                                        <Calendar size={14} />
                                        {new Date(note.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-orange-500">
                                        ${note.total?.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {note.quote ? `Cotización: ${note.quote.quote_number}` : 'Sin cotización'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SalesNotesList;
