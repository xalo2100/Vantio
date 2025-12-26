import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const UpdateRole = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [logs, setLogs] = useState([]);

    const addLog = (log) => {
        console.log(log);
        setLogs(prev => [...prev, log]);
    };

    const createProfileAndSetSuperAdmin = async () => {
        setLoading(true);
        setMessage('');
        setLogs([]);

        try {
            if (!user) {
                setMessage('❌ No hay usuario autenticado');
                return;
            }

            addLog('🔍 Verificando si el perfil existe...');

            // Primero, intentar obtener el perfil actual
            const { data: existingProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (existingProfile) {
                addLog('✅ Perfil encontrado. Actualizando rol...');

                // Si existe, actualizar el rol
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ role: 'super_admin' })
                    .eq('id', user.id);

                if (updateError) {
                    addLog(`❌ Error al actualizar: ${updateError.message}`);
                    setMessage(`❌ Error: ${updateError.message}`);
                    return;
                }

                addLog('✅ Rol actualizado a super_admin');
                setMessage('✅ ¡Rol actualizado! Cierra sesión y vuelve a iniciar.');
            } else {
                addLog('⚠️ Perfil no existe. Creando perfil nuevo...');

                // Si no existe, crear el perfil
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: user.id,
                        email: user.email,
                        full_name: user.user_metadata?.full_name || user.email.split('@')[0],
                        role: 'super_admin',
                        is_active: true
                    });

                if (insertError) {
                    addLog(`❌ Error al crear perfil: ${insertError.message}`);
                    addLog(`💡 Código de error: ${insertError.code}`);

                    if (insertError.code === '42501') {
                        setMessage('❌ Error de permisos RLS. Necesitas ejecutar el script SQL en Supabase manualmente.');
                    } else {
                        setMessage(`❌ Error: ${insertError.message}`);
                    }
                    return;
                }

                addLog('✅ Perfil creado con rol super_admin');
                setMessage('✅ ¡Perfil creado! Cierra sesión y vuelve a iniciar.');
            }

        } catch (err) {
            addLog(`❌ Error inesperado: ${err.message}`);
            setMessage(`❌ Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-petrol-900 via-petrol-800 to-petrol-900 flex items-center justify-center p-4">
            <div className="glass-panel p-8 rounded-2xl max-w-2xl w-full">
                <h1 className="text-3xl font-bold text-petrol-800 mb-6 text-center">
                    Crear Perfil y Asignar Superadmin
                </h1>

                {user && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-xl">
                        <p className="text-sm text-gray-600 mb-2">Usuario autenticado:</p>
                        <p className="text-sm font-semibold text-petrol-800">{user.email}</p>
                        <p className="text-xs text-gray-500 mt-1">ID: {user.id}</p>
                    </div>
                )}

                <button
                    onClick={createProfileAndSetSuperAdmin}
                    disabled={loading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                    {loading ? 'Procesando...' : 'Crear Perfil / Actualizar a Super Admin'}
                </button>

                {logs.length > 0 && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-xl max-h-64 overflow-y-auto">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Logs:</p>
                        {logs.map((log, index) => (
                            <p key={index} className="text-xs text-gray-700 font-mono mb-1">
                                {log}
                            </p>
                        ))}
                    </div>
                )}

                {message && (
                    <div className={`p-4 rounded-xl ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        <p className="text-sm font-semibold">{message}</p>
                    </div>
                )}

                <div className="mt-6 p-4 bg-yellow-50 rounded-xl">
                    <p className="text-xs text-gray-600">
                        <strong>⚠️ Importante:</strong> Si aparece un error de permisos (código 42501), significa que las políticas RLS de Supabase están bloqueando la creación del perfil. En ese caso, necesitarás que un administrador de Supabase ejecute el script SQL manualmente.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UpdateRole;
