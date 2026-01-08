import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Validación de seguridad para evitar crashes si faltan credenciales
        if (!isSupabaseConfigured() || !supabase) {
            console.warn('⚠️ Supabase no está configurado. La autenticación automática se omitirá.');
            setLoading(false);
            return;
        }

        // Verificar sesión actual
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Escuchar cambios de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Helper para validar Supabase antes de operaciones
    const checkSupabase = () => {
        if (!isSupabaseConfigured() || !supabase) {
            console.error('❌ Supabase no está configurado');
            throw new Error('Sistema no configurado. Faltan las credenciales de conexión (archivo .env).');
        }
    };

    const signInWithGoogle = async () => {
        try {
            checkSupabase();

            console.log('🔐 Iniciando Google OAuth...');
            console.log('📍 Redirect URL:', `${window.location.origin}/auth/callback`);

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                    skipBrowserRedirect: false
                }
            });

            if (error) {
                console.error('❌ OAuth Error:', error);

                // Mensajes de error más descriptivos
                if (error.message?.includes('Provider not enabled')) {
                    throw new Error('Google OAuth no está habilitado en Supabase. Por favor contacta al administrador.');
                }
                if (error.message?.includes('Invalid redirect')) {
                    throw new Error('URL de redirección no autorizada. Por favor contacta al administrador.');
                }

                throw error;
            }

            console.log('✅ OAuth iniciado exitosamente');
            console.log('🔗 URL de OAuth:', data.url);

            // Verificar que se haya generado una URL
            if (!data.url) {
                throw new Error('No se pudo generar la URL de autenticación. Por favor intenta nuevamente.');
            }

            return { data, error: null };
        } catch (error) {
            console.error('💥 Error al iniciar sesión con Google:', error);
            return {
                data: null,
                error: {
                    message: error.message || 'Error al iniciar sesión con Google. Por favor intenta nuevamente.',
                    details: error
                }
            };
        }
    };

    const signInWithPassword = async (email, password) => {
        try {
            checkSupabase();
            console.log('🔐 Iniciando sesión con email/password...');

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error('❌ Error de autenticación:', error);
                throw error;
            }

            console.log('✅ Sesión iniciada exitosamente');
            return { data, error: null };
        } catch (error) {
            console.error('💥 Error al iniciar sesión:', error);
            return {
                data: null,
                error: {
                    message: error.message || 'Error al iniciar sesión. Verifica tus credenciales.',
                    details: error
                }
            };
        }
    };

    const signUpWithPassword = async (email, password, full_name) => {
        try {
            checkSupabase();
            console.log('📝 Registrando nuevo usuario...');

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: full_name,
                    }
                }
            });

            if (error) {
                console.error('❌ Error de registro:', error);
                throw error;
            }

            console.log('✅ Usuario registrado exitosamente');
            return { data, error: null };
        } catch (error) {
            console.error('💥 Error al registrarse:', error);
            return {
                data: null,
                error: {
                    message: error.message || 'Error al crear cuenta. Inténtalo de nuevo.',
                    details: error
                }
            };
        }
    };


    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            setUser(null);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const value = {
        user,
        loading,
        signInWithGoogle,
        signInWithPassword,
        signUpWithPassword,
        signOut
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
