import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * PÁGINA TEMPORAL PARA CREAR SUPERADMIN
 * Usar solo una vez y luego eliminar
 * Acceder en: http://localhost:5173/create-superadmin
 */
const CreateSuperadmin = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const createSuperadmin = async () => {
        setLoading(true);
        setResult(null);

        try {
            // Paso 1: Crear usuario con signUp
            console.log('🔧 Creando usuario...');
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: 'gsanchez@vantio.cl',
                password: '123Momia.',
                options: {
                    data: {
                        full_name: 'Gonzalo Sanchez'
                    }
                }
            });

            if (signUpError) {
                throw new Error(`Error al crear usuario: ${signUpError.message}`);
            }

            const userId = signUpData.user?.id;
            if (!userId) {
                throw new Error('No se obtuvo el ID del usuario');
            }

            console.log('✅ Usuario creado:', userId);

            // Paso 2: Actualizar el perfil con rol superadmin usando service role
            // NOTA: Esto requiere que tengas SUPABASE_SERVICE_ROLE_KEY en .env
            console.log('🔧 Configurando perfil como superadmin...');

            const orgId = 'ca2d1743-fb12-4c73-b3fc-03b4bd93dd41';

            // Actualizar perfil directamente
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    role: 'super_admin',
                    organization_id: orgId,
                    full_name: 'Gonzalo Sanchez',
                    is_active: true
                })
                .eq('id', userId);

            if (profileError) {
                console.warn('⚠️ Error al actualizar perfil:', profileError);
                // Intentar insertar si no existe
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        email: 'gsanchez@vantio.cl',
                        role: 'super_admin',
                        organization_id: orgId,
                        full_name: 'Gonzalo Sanchez',
                        is_active: true
                    });

                if (insertError) {
                    throw new Error(`Error al crear perfil: ${insertError.message}`);
                }
            }

            console.log('✅ Perfil configurado');

            setResult({
                success: true,
                message: `✅ ¡Superadmin creado exitosamente!
                
User ID: ${userId}
Email: gsanchez@vantio.cl
Password: 123Momia.
Role: super_admin
Organization ID: ${orgId}

Ahora puedes:
1. Ir a /login
2. Click en "📧 Usar Email y Contraseña"
3. Iniciar sesión con las credenciales de arriba`
            });

        } catch (error) {
            console.error('❌ Error:', error);
            setResult({
                success: false,
                message: `❌ Error: ${error.message}`
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
                <h1 className="text-3xl font-bold mb-2 text-gray-900">🔧 Crear Superadmin</h1>
                <p className="text-sm text-gray-600 mb-6">
                    Página temporal para crear el usuario superadmin inicial.
                </p>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800 font-semibold mb-2">
                        Se creará el usuario:
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>📧 Email: gsanchez@vantio.cl</li>
                        <li>🔑 Password: 123Momia.</li>
                        <li>👑 Role: super_admin</li>
                        <li>🏢 Organization: Alfapack</li>
                    </ul>
                </div>

                <button
                    onClick={createSuperadmin}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            <span>Creando...</span>
                        </div>
                    ) : (
                        '🚀 Crear Superadmin'
                    )}
                </button>

                {result && (
                    <div className={`mt-6 p-4 rounded-lg ${result.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                        <pre className={`text-sm whitespace-pre-wrap ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                            {result.message}
                        </pre>
                    </div>
                )}

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                        ⚠️ <strong>IMPORTANTE:</strong> Elimina esta página después de crear el usuario.
                        Borra el archivo <code>CreateSuperadmin.jsx</code> y la ruta en <code>App.jsx</code>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CreateSuperadmin;
