import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Shield, CheckCircle, AlertCircle, Building2 } from 'lucide-react';

/**
 * Página para configurar organización y rol de super_admin
 */
const FixSuperAdminRole = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [success, setSuccess] = useState(false);
    const [currentProfile, setCurrentProfile] = useState(null);
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrgId, setSelectedOrgId] = useState('');
    const [newOrgName, setNewOrgName] = useState('AlfaPack');

    const loadData = async () => {
        if (!user) return;

        try {
            // Cargar perfil actual
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            setCurrentProfile(profile);

            // Cargar organizaciones disponibles
            const { data: orgs } = await supabase
                .from('organizations')
                .select('*')
                .order('created_at', { ascending: false });

            setOrganizations(orgs || []);

            // Si hay organizaciones pero el usuario no tiene una, pre-seleccionar la primera
            if (orgs && orgs.length > 0 && !profile?.organization_id) {
                setSelectedOrgId(orgs[0].id);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    const handleAssignExistingOrg = async () => {
        if (!selectedOrgId) {
            setMessage('Por favor selecciona una organización');
            return;
        }

        setLoading(true);
        setMessage(null);
        setSuccess(false);

        try {
            // Actualizar perfil con organización y rol
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    organization_id: selectedOrgId,
                    role: 'super_admin'
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // Actualizar organización para que este usuario sea el super_admin
            const { error: orgError } = await supabase
                .from('organizations')
                .update({ super_admin_id: user.id })
                .eq('id', selectedOrgId);

            if (orgError) console.warn('No se pudo actualizar super_admin_id:', orgError);

            setSuccess(true);
            setMessage('✅ Organización asignada y rol actualizado exitosamente. Recarga la página.');

            setTimeout(() => loadData(), 1000);

        } catch (error) {
            console.error('Error:', error);
            setMessage(`❌ Error: ${error.message}`);
            setSuccess(false);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNewOrg = async () => {
        if (!newOrgName.trim()) {
            setMessage('Por favor ingresa un nombre para la organización');
            return;
        }

        setLoading(true);
        setMessage(null);
        setSuccess(false);

        try {
            // Crear nueva organización
            const { data: newOrg, error: orgError } = await supabase
                .from('organizations')
                .insert([{
                    name: newOrgName,
                    super_admin_id: user.id
                }])
                .select()
                .single();

            if (orgError) throw orgError;

            // Actualizar perfil
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    organization_id: newOrg.id,
                    role: 'super_admin'
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // Crear configuración de organización
            const { error: settingsError } = await supabase
                .from('organization_settings')
                .insert([{ organization_id: newOrg.id }]);

            if (settingsError) console.warn('No se pudo crear settings:', settingsError);

            setSuccess(true);
            setMessage('✅ Organización creada exitosamente. Recarga la página.');

            setTimeout(() => loadData(), 1000);

        } catch (error) {
            console.error('Error:', error);
            setMessage(`❌ Error: ${error.message}`);
            setSuccess(false);
        } finally {
            setLoading(false);
        }
    };

    const handleReloadPage = () => {
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-petrol-500 to-petrol-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center">
                        <Shield className="text-white" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-petrol-800">
                            Configurar Organización
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Asigna una organización y actualiza tu rol
                        </p>
                    </div>
                </div>

                {/* Current Status */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h2 className="font-semibold text-petrol-800 mb-4">Estado Actual</h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="font-medium">{user?.email || 'No disponible'}</span>
                        </div>
                        {currentProfile && (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Nombre:</span>
                                    <span className="font-medium">{currentProfile.full_name || 'No configurado'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Rol:</span>
                                    <span className={`font-bold ${currentProfile.role === 'super_admin' ? 'text-green-600' : 'text-gray-600'
                                        }`}>
                                        {currentProfile.role || 'vendedor'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Organización:</span>
                                    <span className={`font-bold ${currentProfile.organization_id ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {currentProfile.organization_id ? '✅ Asignada' : '❌ No asignada'}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Message */}
                {message && (
                    <div className={`p-4 rounded-lg mb-6 ${success ? 'bg-green-50 text-green-700 border border-green-200' :
                            'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        <div className="flex items-start gap-2">
                            {success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            <p className="text-sm">{message}</p>
                        </div>
                    </div>
                )}

                {/* Options */}
                {!currentProfile?.organization_id && (
                    <div className="space-y-6">
                        {/* Option 1: Assign Existing Organization */}
                        {organizations.length > 0 && (
                            <div className="border border-gray-200 rounded-lg p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Building2 className="text-petrol-600" size={20} />
                                    <h3 className="font-semibold text-petrol-800">
                                        Opción 1: Asignar Organización Existente
                                    </h3>
                                </div>
                                <select
                                    value={selectedOrgId}
                                    onChange={(e) => setSelectedOrgId(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                                >
                                    <option value="">Selecciona una organización</option>
                                    {organizations.map(org => (
                                        <option key={org.id} value={org.id}>
                                            {org.name} (creada: {new Date(org.created_at).toLocaleDateString()})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleAssignExistingOrg}
                                    disabled={loading || !selectedOrgId}
                                    className="w-full btn-primary py-3"
                                >
                                    {loading ? 'Asignando...' : 'Asignar Organización'}
                                </button>
                            </div>
                        )}

                        {/* Option 2: Create New Organization */}
                        <div className="border border-gray-200 rounded-lg p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Building2 className="text-orange-600" size={20} />
                                <h3 className="font-semibold text-petrol-800">
                                    {organizations.length > 0 ? 'Opción 2: ' : ''}Crear Nueva Organización
                                </h3>
                            </div>
                            <input
                                type="text"
                                value={newOrgName}
                                onChange={(e) => setNewOrgName(e.target.value)}
                                placeholder="Nombre de la organización"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                            />
                            <button
                                onClick={handleCreateNewOrg}
                                disabled={loading || !newOrgName.trim()}
                                className="w-full btn-secondary py-3"
                            >
                                {loading ? 'Creando...' : 'Crear Nueva Organización'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Success Actions */}
                {success && (
                    <div className="space-y-3">
                        <button
                            onClick={handleReloadPage}
                            className="w-full btn-primary py-3"
                        >
                            Recargar Página
                        </button>
                    </div>
                )}

                {/* Already configured */}
                {currentProfile?.organization_id && currentProfile?.role === 'super_admin' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="text-green-600" size={24} />
                            <h3 className="font-semibold text-green-800">¡Todo Configurado!</h3>
                        </div>
                        <p className="text-sm text-green-700 mb-4">
                            Tu cuenta ya tiene una organización asignada y rol de Super Admin.
                        </p>
                        <button
                            onClick={() => window.location.href = '/settings'}
                            className="w-full btn-primary py-3"
                        >
                            Ir a Configuración
                        </button>
                    </div>
                )}

                {/* SQL Alternative */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="font-semibold text-petrol-800 mb-3">Alternativa: Script SQL</h3>
                    <p className="text-sm text-gray-600 mb-3">
                        Si los botones no funcionan, ejecuta el script SQL en Supabase:
                    </p>
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                        <pre>{`-- Ver archivo: FIX_SUPERADMIN_ROLE.sql
-- Ejecutar en Supabase SQL Editor`}</pre>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FixSuperAdminRole;
