import React, { useState, useEffect } from 'react';
import {
    Users, Plus, Search, Filter, Edit2, Trash2,
    Mail, Phone, MapPin, Building2, MoreVertical,
    FileText, History, ExternalLink, X, Save
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';

const Clients = () => {
    const { user } = useAuth();
    const { profile, isAdmin } = useRole();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        rut: '',
        company: '',
        city: '',
        address: '',
        internal_notes: ''
    });

    useEffect(() => {
        if (profile?.organization_id) {
            fetchClients();
        }
    }, [profile]);

    const fetchClients = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('clients')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .order('name');

            if (searchTerm) {
                query = query.or(`name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,rut.ilike.%${searchTerm}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (client = null) => {
        if (client) {
            setEditingClient(client);
            setFormData({
                name: client.name || '',
                email: client.email || '',
                phone: client.phone || '',
                rut: client.rut || '',
                company: client.company || '',
                city: client.city || '',
                address: client.address || '',
                internal_notes: client.internal_notes || ''
            });
        } else {
            setEditingClient(null);
            setFormData({
                name: '',
                email: '',
                phone: '',
                rut: '',
                company: '',
                city: '',
                address: '',
                internal_notes: ''
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...formData,
                organization_id: profile.organization_id,
                updated_at: new Date()
            };

            if (editingClient) {
                const { error } = await supabase
                    .from('clients')
                    .update(dataToSave)
                    .eq('id', editingClient.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('clients')
                    .insert([dataToSave]);
                if (error) throw error;
            }

            setShowModal(false);
            fetchClients();
        } catch (error) {
            console.error('Error saving client:', error);
            alert('Error al guardar el cliente');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este cliente?')) return;
        try {
            const { error } = await supabase.from('clients').delete().eq('id', id);
            if (error) throw error;
            fetchClients();
        } catch (error) {
            console.error('Error deleting client:', error);
        }
    };

    const handleSyncCRM = async () => {
        setSyncing(true);
        try {
            const { data, error } = await supabase.functions.invoke('pipedrive-sync-clients', {
                body: { organizationId: profile.organization_id }
            });

            if (error) {
                // Try to get specific error message from the response body if it's a 400
                console.error("Sync raw error:", error);
                throw error;
            }

            if (data.success) {
                alert(`Sincronización exitosa: ${data.synced} clientes sincronizados.`);
                fetchClients();
            } else {
                throw new Error(data.message || 'Error desconocido en la sincronización');
            }
        } catch (error) {
            console.error('Error syncing CRM:', error);

            // Extract message from Supabase FunctionsFetchError or similar
            let errorMsg = error.message;
            if (error.context && typeof error.context.json === 'function') {
                try {
                    const errorBody = await error.context.json();
                    if (errorBody.error) errorMsg = errorBody.error;
                } catch (e) {
                    console.error("Could not parse error body", e);
                }
            }

            alert('Error al sincronizar con el CRM: ' + errorMsg);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-petrol-900">Directorio de Clientes</h1>
                    <p className="text-petrol-600">Gestiona la base de datos interna de tus clientes industriales.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSyncCRM}
                        disabled={syncing}
                        className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2.5 rounded-xl font-bold transition-all border border-stone-200 disabled:opacity-50"
                    >
                        {syncing ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-stone-500"></div>
                        ) : (
                            <History size={20} />
                        )}
                        <span>Sincronizar CRM</span>
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-orange-200"
                    >
                        <Plus size={20} />
                        <span>Nuevo Cliente</span>
                    </button>
                </div>
            </div>

            {/* toolbar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, empresa o RUT..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && fetchClients()}
                    />
                </div>
            </div>

            {/* Clients Grid/Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
            ) : clients.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-stone-200 p-12 text-center">
                    <Users className="mx-auto text-stone-300 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-petrol-900">No hay clientes aún</h3>
                    <p className="text-stone-500 max-w-sm mx-auto mt-2">
                        Comienza agregando tu primer cliente o activa la sincronización con tu CRM externo.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clients.map(client => (
                        <div key={client.id} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-stone-50 rounded-xl group-hover:bg-orange-50 transition-colors">
                                    <Building2 className="text-petrol-400 group-hover:text-orange-500" size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenModal(client)}
                                        className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(client.id)}
                                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-bold text-petrol-900 text-lg leading-tight">{client.name}</h3>
                                    {client.company && (
                                        <p className="text-stone-500 text-sm font-medium">{client.company}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {client.rut && (
                                        <div className="flex items-center gap-2 text-stone-600 text-sm">
                                            <span className="font-bold text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-500">RUT</span>
                                            <span>{client.rut}</span>
                                        </div>
                                    )}
                                    {client.email && (
                                        <div className="flex items-center gap-2 text-stone-600 text-sm">
                                            <Mail size={14} className="text-stone-400" />
                                            <span>{client.email}</span>
                                        </div>
                                    )}
                                    {client.phone && (
                                        <div className="flex items-center gap-2 text-stone-600 text-sm">
                                            <Phone size={14} className="text-stone-400" />
                                            <span>{client.phone}</span>
                                        </div>
                                    )}
                                    {client.city && (
                                        <div className="flex items-center gap-2 text-stone-600 text-sm">
                                            <MapPin size={14} className="text-stone-400" />
                                            <span>{client.city}</span>
                                        </div>
                                    )}
                                </div>

                                {client.internal_notes && (
                                    <div className="pt-4 border-t border-stone-100">
                                        <p className="text-xs text-stone-500 line-clamp-2 italic">
                                            "{client.internal_notes}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-petrol-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-petrol-900">
                                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-stone-500 uppercase">Nombre Completo *</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-stone-500 uppercase">Empresa / Razón Social</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-stone-500 uppercase">RUT</label>
                                    <input
                                        type="text"
                                        placeholder="12.345.678-9"
                                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                                        value={formData.rut}
                                        onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-stone-500 uppercase">Ciudad</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-stone-500 uppercase">Email</label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-stone-500 uppercase">Teléfono</label>
                                    <input
                                        type="tel"
                                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-500 uppercase">Dirección Completa</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-500 uppercase">Notas Internas</label>
                                <textarea
                                    rows="3"
                                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium resize-none"
                                    value={formData.internal_notes}
                                    onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="pt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold text-stone-600 hover:bg-stone-50 transition-all border border-stone-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
                                >
                                    <Save size={20} />
                                    <span>{editingClient ? 'Guardar Cambios' : 'Crear Cliente'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clients;
