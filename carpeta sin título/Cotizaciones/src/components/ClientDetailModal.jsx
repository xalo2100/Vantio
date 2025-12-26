import React, { useState, useEffect } from 'react';
import { X, Phone, Mail, Calendar, ShoppingCart, MessageSquare, ExternalLink, CheckCircle } from 'lucide-react';
import { clientService } from '../services/clientService';
import { useAuth } from '../context/AuthContext';

const ClientDetailModal = ({ client, onClose, onInteractionRecorded }) => {
    const { user } = useAuth();
    const [purchases, setPurchases] = useState([]);
    const [interactions, setInteractions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recording, setRecording] = useState(false);
    const [showInteractionForm, setShowInteractionForm] = useState(false);
    const [interactionData, setInteractionData] = useState({
        type: 'call',
        notes: ''
    });

    useEffect(() => {
        loadClientData();
    }, [client.id]);

    const loadClientData = async () => {
        setLoading(true);
        try {
            const [purchasesResult, interactionsResult] = await Promise.all([
                clientService.getClientPurchases(client.id),
                clientService.getClientInteractions(client.id)
            ]);

            if (purchasesResult.success) {
                setPurchases(purchasesResult.purchases);
            }
            if (interactionsResult.success) {
                setInteractions(interactionsResult.interactions);
            }
        } catch (error) {
            console.error('Error loading client data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRecordInteraction = async () => {
        if (!interactionData.notes.trim()) {
            alert('Por favor ingresa notas sobre la interacción');
            return;
        }

        setRecording(true);
        try {
            const result = await clientService.recordInteraction(
                client.id,
                interactionData,
                user.id,
                user.organization_id
            );

            if (result.success) {
                alert(result.message);
                setInteractionData({ type: 'call', notes: '' });
                setShowInteractionForm(false);
                loadClientData();
                if (onInteractionRecorded) {
                    onInteractionRecorded();
                }
            } else {
                alert('Error al registrar interacción: ' + result.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setRecording(false);
        }
    };

    const formatCurrency = (amount, currency = 'CLP') => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: currency
        }).format(amount || 0);
    };

    const getInteractionIcon = (type) => {
        const icons = {
            call: <Phone size={16} />,
            email: <Mail size={16} />,
            meeting: <Calendar size={16} />,
            quote_sent: <ShoppingCart size={16} />,
            deal_won: <CheckCircle size={16} />,
            other: <MessageSquare size={16} />
        };
        return icons[type] || icons.other;
    };

    const getInteractionLabel = (type) => {
        const labels = {
            call: 'Llamada',
            email: 'Email',
            meeting: 'Reunión',
            quote_sent: 'Cotización enviada',
            deal_won: 'Venta cerrada',
            other: 'Otro'
        };
        return labels[type] || type;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-petrol-600 to-petrol-700 text-white p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">{client.name}</h2>
                        {client.company && <p className="text-petrol-100">{client.company}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-petrol-500 mx-auto"></div>
                            <p className="mt-4 text-gray-500">Cargando información...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Contact Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="glass-panel p-4 rounded-lg">
                                    <h3 className="font-semibold text-petrol-800 mb-3">Información de Contacto</h3>
                                    <div className="space-y-2 text-sm">
                                        {client.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail size={16} className="text-gray-400" />
                                                <a href={`mailto:${client.email}`} className="text-petrol-600 hover:underline">
                                                    {client.email}
                                                </a>
                                            </div>
                                        )}
                                        {client.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone size={16} className="text-gray-400" />
                                                <a href={`tel:${client.phone}`} className="text-petrol-600 hover:underline">
                                                    {client.phone}
                                                </a>
                                            </div>
                                        )}
                                        {client.pipedrive_person_id && (
                                            <div className="flex items-center gap-2">
                                                <ExternalLink size={16} className="text-gray-400" />
                                                <span className="text-gray-600">ID Pipedrive: {client.pipedrive_person_id}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="glass-panel p-4 rounded-lg">
                                    <h3 className="font-semibold text-petrol-800 mb-3">Estadísticas</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total compras:</span>
                                            <span className="font-semibold">{formatCurrency(client.total_purchases)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Cantidad:</span>
                                            <span className="font-semibold">{client.purchase_count}</span>
                                        </div>
                                        {client.last_contact_date && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Último contacto:</span>
                                                <span className="font-semibold">
                                                    {new Date(client.last_contact_date).toLocaleDateString('es-CL')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Record Interaction Button */}
                            {!showInteractionForm && (
                                <button
                                    onClick={() => setShowInteractionForm(true)}
                                    className="btn-primary w-full"
                                >
                                    Registrar Interacción
                                </button>
                            )}

                            {/* Interaction Form */}
                            {showInteractionForm && (
                                <div className="glass-panel p-4 rounded-lg border-2 border-petrol-500">
                                    <h3 className="font-semibold text-petrol-800 mb-4">Nueva Interacción</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Tipo de Interacción
                                            </label>
                                            <select
                                                value={interactionData.type}
                                                onChange={(e) => setInteractionData({ ...interactionData, type: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-petrol-500 focus:border-transparent"
                                            >
                                                <option value="call">Llamada telefónica</option>
                                                <option value="email">Correo electrónico</option>
                                                <option value="meeting">Reunión</option>
                                                <option value="quote_sent">Cotización enviada</option>
                                                <option value="deal_won">Venta cerrada</option>
                                                <option value="other">Otro</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Notas
                                            </label>
                                            <textarea
                                                value={interactionData.notes}
                                                onChange={(e) => setInteractionData({ ...interactionData, notes: e.target.value })}
                                                rows={4}
                                                placeholder="Describe la interacción con el cliente..."
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-petrol-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleRecordInteraction}
                                                disabled={recording}
                                                className="btn-primary flex-1"
                                            >
                                                {recording ? 'Registrando...' : 'Guardar Interacción'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowInteractionForm(false);
                                                    setInteractionData({ type: 'call', notes: '' });
                                                }}
                                                className="btn-secondary"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Purchase History */}
                            <div>
                                <h3 className="font-semibold text-petrol-800 mb-3 flex items-center gap-2">
                                    <ShoppingCart size={20} />
                                    Historial de Compras ({purchases.length})
                                </h3>
                                {purchases.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No hay compras registradas</p>
                                ) : (
                                    <div className="space-y-2">
                                        {purchases.map((purchase) => (
                                            <div key={purchase.id} className="glass-panel p-3 rounded-lg">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-petrol-800">{purchase.product_name}</p>
                                                        <p className="text-sm text-gray-600">
                                                            {new Date(purchase.purchase_date).toLocaleDateString('es-CL')}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-petrol-800">
                                                            {formatCurrency(purchase.amount, purchase.currency)}
                                                        </p>
                                                        <span className={`text-xs px-2 py-1 rounded-full ${purchase.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                            }`}>
                                                            {purchase.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Interaction Timeline */}
                            <div>
                                <h3 className="font-semibold text-petrol-800 mb-3 flex items-center gap-2">
                                    <MessageSquare size={20} />
                                    Timeline de Interacciones ({interactions.length})
                                </h3>
                                {interactions.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No hay interacciones registradas</p>
                                ) : (
                                    <div className="space-y-3">
                                        {interactions.map((interaction) => (
                                            <div key={interaction.id} className="flex gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 bg-petrol-100 rounded-full flex items-center justify-center text-petrol-600">
                                                    {getInteractionIcon(interaction.interaction_type)}
                                                </div>
                                                <div className="flex-1 glass-panel p-3 rounded-lg">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-medium text-petrol-800">
                                                            {getInteractionLabel(interaction.interaction_type)}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(interaction.created_at).toLocaleString('es-CL')}
                                                        </span>
                                                    </div>
                                                    {interaction.notes && (
                                                        <p className="text-sm text-gray-600 mt-1">{interaction.notes}</p>
                                                    )}
                                                    {interaction.user && (
                                                        <p className="text-xs text-gray-500 mt-2">
                                                            Por: {interaction.user.full_name || interaction.user.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientDetailModal;
