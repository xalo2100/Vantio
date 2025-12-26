import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
    const navigate = useNavigate();
    const [error, setError] = useState(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                console.log('🔄 Procesando callback de OAuth...');
                console.log('📍 URL actual:', window.location.href);
                console.log('🔍 Hash:', window.location.hash);
                console.log('🔍 Search:', window.location.search);

                // Obtener la sesión de la URL
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('❌ Error de sesión:', error);
                    throw error;
                }

                console.log('📦 Datos de sesión:', data);

                if (data.session) {
                    console.log('✅ Sesión establecida exitosamente');
                    console.log('👤 Usuario:', data.session.user.email);
                    console.log('🔑 Token expira en:', new Date(data.session.expires_at * 1000).toLocaleString());

                    // Pequeña pausa para asegurar que la sesión se guarde
                    await new Promise(resolve => setTimeout(resolve, 500));

                    navigate('/dashboard', { replace: true });
                } else {
                    console.warn('⚠️ No se encontró sesión, redirigiendo al login');
                    navigate('/login', { replace: true });
                }
            } catch (err) {
                console.error('💥 Error en callback de autenticación:', err);
                console.error('📋 Detalles completos:', JSON.stringify(err, null, 2));
                setError(err.message || 'Error al procesar la autenticación');
                setTimeout(() => navigate('/login'), 3000);
            }
        };

        handleCallback();
    }, [navigate]);

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-petrol-900 via-petrol-800 to-petrol-900 flex items-center justify-center p-4">
                <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-white/20 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-petrol-800 mb-2">Error de Autenticación</h2>
                    <p className="text-red-600 mb-4">{error}</p>
                    <p className="text-gray-600 text-sm">Redirigiendo al login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-petrol-900 via-petrol-800 to-petrol-900 flex items-center justify-center p-4">
            <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-white/20 max-w-md w-full text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
                <h2 className="text-xl font-bold text-petrol-800 mb-2">Completando inicio de sesión</h2>
                <p className="text-gray-600">Por favor espera un momento...</p>
            </div>
        </div>
    );
};

export default AuthCallback;
