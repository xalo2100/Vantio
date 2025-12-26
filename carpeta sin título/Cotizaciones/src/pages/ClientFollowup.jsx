import React, { useState, useEffect } from 'react';
import { UserCheck, Phone, Mail, Calendar, TrendingUp, AlertCircle, Search, Filter, RefreshCw } from 'lucide-react';
import { clientService } from '../services/clientService';
import { useAuth } from '../context/AuthContext';
import ClientDetailModal from '../components/ClientDetailModal';

const ClientFollowup = () => {
    const { user } = useAuth();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [stats, setStats] = useState(null);
    const [filters, setFilters] = useState({
        status: 'needs_followup',
        search: ''
    });

    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    useEffect(() => {
        loadClients();
        loadStats();
    }, [filters]);

    const loadClients = async () => {
        setLoading(true);
        try {
            const result = isAdmin
                ? await clientService.getAllClients(user.organization_id, filters)
                : await clientService.getMyClients(user.id, filters);

            if (result.success) {
                setClients(result.clients);
            }
        } catch (error) {
            console.error('Error loading clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        const result = await clientService.getFollowupStats(
            user.id,
            isAdmin,
            user.organization_id
        );
        if (result.success) {
            setStats(result.stats);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const result = await clientService.syncClientsFromPipedrive(user.organization_id);
            if (result.success) {
                alert(result.message);
                loadClients();
                loadStats();
            } else {
                alert('Error al sincronizar: ' + result.error);
            }
        } catch (error) {
            alert('Error al sincronizar: ' + error.message);
        } finally {
            setSyncing(false);
        }
    };

    const handleClientClick = (client) => {
        setSelectedClient(client);
        setShowDetailModal(true);
    };

    const handleInteractionRecorded = () => {
        loadClients();
        loadStats();
        setShowDetailModal(false);
    };

    const getDaysSinceContact = (lastContactDate) => {
        if (!lastContactDate) return 999;
        const diff = Date.now() - new Date(lastContactDate).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    const getStatusColor = (days) => {
        if (days > 60) return 'text-red-600 bg-red-50';
        if (days > 30) return 'text-orange-600 bg-orange-50';
        return 'text-yellow-600 bg-yellow-50';
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP'
        }).format(amount || 0);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-bold text-petrol-800 flex items-center gap-3">
                        <UserCheck className="text-green-600" size={36} />
                        Seguimiento de Clientes
                    </h2>
                    <p className="text-gray-600 mt-2">
                        Mantén el contacto con tus clientes y mejora la fidelización
                    </p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="btn-primary flex items-center gap-2"
                >
                    <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar Pipedrive'}
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="glass-panel p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Clientes</p>
                                <p className="text-2xl font-bold text-petrol-800">{stats.total}</p>
                            </div>
                            <UserCheck className="text-petrol-600" size={32} />
                        </div>
                    </div>
                    <div className="glass-panel p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Necesitan Seguimiento</p>
                                <p className="text-2xl font-bold text-orange-600">{stats.needsFollowup}</p>
                            </div>
                            <AlertCircle className="text-orange-600" size={32} />
                        </div>
                    </div>
                    <div className="glass-panel p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Activos</p>
                                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                            </div>
                            <TrendingUp className="text-green-600" size={32} />
                        </div>
                    </div>
                    <div className="glass-panel p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Valor Total</p>
                                <p className="text-xl font-bold text-petrol-800">
                                    {formatCurrency(stats.totalRevenue)}
                                </p>
                            </div>
                            <TrendingUp className="text-petrol-600" size={32} />
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="glass-panel p-4 rounded-xl">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email o empresa..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-petrol-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-petrol-500 focus:border-transparent"
                    >
                        <option value="">Todos los estados</option>
                        <option value="needs_followup">Necesitan Seguimiento</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                    </select>
                </div>
            </div>

            {/* Clients List */}
            <div className="glass-panel p-6 rounded-xl">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-petrol-500 mx-auto"></div>
                        <p className="mt-4 text-gray-500">Cargando clientes...</p>
                    </div>
                ) : clients.length === 0 ? (
                    <div className="text-center py-12">
                        <UserCheck className="mx-auto text-gray-400" size={48} />
                        <p className="mt-4 text-gray-500">No hay clientes que mostrar</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clients.map((client) => {
                            const daysSinceContact = getDaysSinceContact(client.last_contact_date);
                            const statusColor = getStatusColor(daysSinceContact);

                            return (
                                <div
                                    key={client.id}
                                    onClick={() => handleClientClick(client)}
                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg text-petrol-800">{client.name}</h3>
                                            {client.company && (
                                                <p className="text-sm text-gray-600">{client.company}</p>
                                            )}
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                            {daysSinceContact === 999 ? 'Sin contacto' : `${daysSinceContact}d`}
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-sm text-gray-600">
                                        {client.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} />
                                                <span className="truncate">{client.email}</span>
                                            </div>
                                        )}
                                        {client.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} />
                                                <span>{client.phone}</span>
                                            </div>
                                        )}
                                        {client.last_purchase_date && (
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} />
                                                <span>
                                                    Última compra: {new Date(client.last_purchase_date).toLocaleDateString('es-CL')}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Total compras:</span>
                                            <span className="font-semibold text-petrol-800">
                                                {formatCurrency(client.total_purchases)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm mt-1">
                                            <span className="text-gray-600">Cantidad:</span>
                                            <span className="font-semibold text-petrol-800">
                                                {client.purchase_count} compra{client.purchase_count !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Client Detail Modal */}
            {showDetailModal && selectedClient && (
                <ClientDetailModal
                    client={selectedClient}
                    onClose={() => setShowDetailModal(false)}
                    onInteractionRecorded={handleInteractionRecorded}
                />
            )}
        </div>
    );
};

export default ClientFollowup;
