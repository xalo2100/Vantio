import React, { useState, useEffect } from 'react';
import { useRole } from '../hooks/useRole';
import RoleGuard from '../components/RoleGuard';
import { Users as UsersIcon, UserPlus, Mail, Search, Shield, X, Send, CheckCircle, Clock, Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const Users = () => {
    const { user } = useAuth();
    const { profile, isSuperAdmin, isAdmin } = useRole();
    const [users, setUsers] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'invitations'
    const [searchTerm, setSearchTerm] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Invite form state
    const [inviteData, setInviteData] = useState({
        email: '',
        role: 'vendedor'
    });

    useEffect(() => {
        if (profile?.organization_id) {
            fetchUsers();
            fetchInvitations();
        }
    }, [profile]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .neq('role', 'super_admin') // Hide superadmins from list
                .order('created_at', { ascending: false });

            if (error) throw error;

            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInvitations = async () => {
        try {
            let query = supabase
                .from('invitations')
                .select('*')
                .order('created_at', { ascending: false });

            if (profile.organization_id) {
                query = query.eq('organization_id', profile.organization_id);
            }

            const { data, error } = await query;

            if (error) throw error;

            setInvitations(data || []);
        } catch (error) {
            console.error('Error fetching invitations:', error);
        }
    };

    const handleOpenInviteModal = () => {
        setInviteData({
            email: '',
            role: 'vendedor'
        });
        setShowInviteModal(true);
    };

    const handleCloseInviteModal = () => {
        setShowInviteModal(false);
        setInviteData({
            email: '',
            role: 'vendedor'
        });
    };

    const handleSendInvitation = async (e) => {
        e.preventDefault();

        // Validate permissions
        if (inviteData.role === 'admin' && !isSuperAdmin) {
            alert('Solo el Super Administrador puede invitar Administradores');
            return;
        }

        if (!inviteData.email) {
            alert('Por favor ingresa un email');
            return;
        }

        try {
            setLoading(true);

            // Generate unique token
            const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

            // Set expiration (7 days from now)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            const { error } = await supabase
                .from('invitations')
                .insert([{
                    email: inviteData.email,
                    role: inviteData.role,
                    organization_id: profile.organization_id,
                    invited_by: user.id,
                    token: token,
                    expires_at: expiresAt.toISOString()
                }]);

            if (error) throw error;

            // TODO: Send invitation email via Resend
            // For now, just show the invitation link
            const inviteLink = `${window.location.origin}/invite/${token}`;
            alert(`Invitación creada! Comparte este link con el usuario:\n\n${inviteLink}`);

            handleCloseInviteModal();
            fetchInvitations();
        } catch (error) {
            console.error('Error sending invitation:', error);
            alert('Error al enviar la invitación: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleUserStatus = async (userId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_active: !currentStatus })
                .eq('id', userId);

            if (error) throw error;

            fetchUsers();
        } catch (error) {
            console.error('Error toggling user status:', error);
            alert('Error al cambiar el estado del usuario');
        }
    };

    const handleChangeRole = async (userId, newRole) => {
        if (!isSuperAdmin) {
            alert('Solo el Super Administrador puede cambiar roles');
            return;
        }

        if (!window.confirm(`¿Estás seguro de cambiar el rol de este usuario a "${newRole}"?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            fetchUsers();
        } catch (error) {
            console.error('Error changing role:', error);
            alert('Error al cambiar el rol: ' + error.message);
        }
    };

    const handleCancelInvitation = async (invitationId) => {
        if (!window.confirm('¿Estás seguro de cancelar esta invitación?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('invitations')
                .delete()
                .eq('id', invitationId);

            if (error) throw error;

            fetchInvitations();
        } catch (error) {
            console.error('Error canceling invitation:', error);
            alert('Error al cancelar la invitación');
        }
    };

    // Filter users
    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getRoleBadge = (role) => {
        const badges = {
            super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-800' },
            admin: { label: 'Administrador', color: 'bg-blue-100 text-blue-800' },
            vendedor: { label: 'Vendedor', color: 'bg-green-100 text-green-800' }
        };
        return badges[role] || badges.vendedor;
    };

    const getInvitationStatus = (invitation) => {
        if (invitation.accepted_at) {
            return { label: 'Aceptada', color: 'bg-green-100 text-green-800', icon: CheckCircle };
        }
        const isExpired = new Date(invitation.expires_at) < new Date();
        if (isExpired) {
            return { label: 'Expirada', color: 'bg-red-100 text-red-800', icon: Ban };
        }
        return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    };

    return (
        <RoleGuard allowedRoles={['super_admin', 'admin']}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Gestión de Usuarios</h1>
                        <p className="text-gray-400">Administra tu equipo de ventas</p>
                    </div>
                    <button
                        onClick={handleOpenInviteModal}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
                    >
                        <UserPlus size={20} />
                        <span className="font-semibold">Invitar Usuario</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="glass-panel rounded-xl overflow-hidden">
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`flex-1 px-6 py-4 font-semibold transition-colors ${activeTab === 'users'
                                ? 'bg-white text-petrol-800 border-b-2 border-orange-500'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <UsersIcon size={20} />
                                <span>Usuarios Activos ({users.length})</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('invitations')}
                            className={`flex-1 px-6 py-4 font-semibold transition-colors ${activeTab === 'invitations'
                                ? 'bg-white text-petrol-800 border-b-2 border-orange-500'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Mail size={20} />
                                <span>Invitaciones ({invitations.filter(i => !i.accepted_at).length})</span>
                            </div>
                        </button>
                    </div>

                    {/* Search */}
                    {activeTab === 'users' && (
                        <div className="p-4 border-b border-gray-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600">Cargando...</p>
                        </div>
                    ) : activeTab === 'users' ? (
                        <div className="overflow-x-auto">
                            {filteredUsers.length === 0 ? (
                                <div className="p-12 text-center">
                                    <UsersIcon className="mx-auto mb-4 text-gray-400" size={48} />
                                    <p className="text-gray-600">No se encontraron usuarios</p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-petrol-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Usuario</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Rol</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Estado</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Fecha Registro</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredUsers.map((userData) => {
                                            const badge = getRoleBadge(userData.role);
                                            return (
                                                <tr key={userData.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <p className="font-semibold text-gray-900">
                                                                {userData.full_name || 'Sin nombre'}
                                                            </p>
                                                            <p className="text-sm text-gray-500">{userData.email}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {isSuperAdmin && userData.id !== user.id ? (
                                                            <select
                                                                value={userData.role}
                                                                onChange={(e) => handleChangeRole(userData.id, e.target.value)}
                                                                className={`px-3 py-1 rounded-full text-xs font-medium border-0 ${badge.color}`}
                                                            >
                                                                <option value="vendedor">Vendedor</option>
                                                                <option value="admin">Administrador</option>
                                                                <option value="super_admin">Super Admin</option>
                                                            </select>
                                                        ) : (
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                                                                {badge.label}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => handleToggleUserStatus(userData.id, userData.is_active)}
                                                            disabled={userData.id === user.id}
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${userData.is_active ? 'bg-green-500' : 'bg-gray-300'
                                                                }`}
                                                        >
                                                            <span
                                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${userData.is_active ? 'translate-x-6' : 'translate-x-1'
                                                                    }`}
                                                            />
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        {new Date(userData.created_at).toLocaleDateString('es-AR')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            {userData.id === user.id && (
                                                                <span className="text-xs text-gray-500 italic">Tú</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            {invitations.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Mail className="mx-auto mb-4 text-gray-400" size={48} />
                                    <p className="text-gray-600">No hay invitaciones pendientes</p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-petrol-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Rol</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Estado</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Enviada</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Expira</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {invitations.map((invitation) => {
                                            const status = getInvitationStatus(invitation);
                                            const badge = getRoleBadge(invitation.role);
                                            const StatusIcon = status.icon;

                                            return (
                                                <tr key={invitation.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="font-semibold text-gray-900">{invitation.email}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                                                            {badge.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                            <StatusIcon size={14} />
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        {new Date(invitation.created_at).toLocaleDateString('es-AR')}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        {new Date(invitation.expires_at).toLocaleDateString('es-AR')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {!invitation.accepted_at && (
                                                            <button
                                                                onClick={() => handleCancelInvitation(invitation.id)}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Cancelar invitación"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>

                {/* Invite Modal */}
                {showInviteModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="glass-panel rounded-2xl max-w-md w-full">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-petrol-800">Invitar Usuario</h2>
                                    <button
                                        onClick={handleCloseInviteModal}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSendInvitation} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email del Usuario <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={inviteData.email}
                                        onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="usuario@ejemplo.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Rol <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={inviteData.role}
                                        onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="vendedor">Vendedor</option>
                                        {isSuperAdmin && <option value="admin">Administrador</option>}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {inviteData.role === 'vendedor'
                                            ? 'Podrá crear y gestionar sus propias cotizaciones'
                                            : 'Podrá gestionar productos y vendedores'}
                                    </p>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={handleCloseInviteModal}
                                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Enviando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                <span>Enviar Invitación</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
};

export default Users;
