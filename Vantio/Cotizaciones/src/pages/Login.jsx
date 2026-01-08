import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, Sparkles, CheckCircle, Zap } from 'lucide-react';

const Login = () => {
    const { user, signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showEmailLogin, setShowEmailLogin] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [fullName, setFullName] = useState('');

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleGoogleLogin = async () => {
        if (isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            console.log('🖱️ Usuario hizo clic en el botón de Google');
            console.log('🌐 Origen actual:', window.location.origin);

            const { error } = await signInWithGoogle();

            if (error) {
                const errorMessage = error.message || 'Error al iniciar sesión con Google';
                setError(errorMessage);
                console.error('❌ Error de login:', error);
                setIsLoading(false);
            }
            // Si no hay error, el usuario será redirigido a Google
            // No desactivamos el loading porque la página se redirigirá
        } catch (err) {
            const errorMessage = err.message || 'Error inesperado. Por favor, intenta nuevamente.';
            setError(errorMessage);
            console.error('💥 Error inesperado:', err);
            setIsLoading(false);
        }
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        if (isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            let result;
            if (isRegistering) {
                result = await signUpWithPassword(email, password, fullName);
                if (!result.error) {
                    // Show success message or auto-login (Supabase auto-logs in if no email confirmation required)
                    // If email confirmation is ON, we should tell the user.
                    // Assuming for now it requires confirmation or auto-login.
                    if (result.data?.user && !result.data.session) {
                        setError('Cuenta creada. Por favor verifica tu correo electrónico.');
                        setIsLoading(false);
                        return;
                    }
                }
            } else {
                result = await signInWithPassword(email, password);
            }

            if (result.error) {
                setError(result.error.message || 'Error al autenticar');
                setIsLoading(false);
            }
            // Success redirects via useEffect
        } catch (err) {
            setError(err.message || 'Error inesperado');
            setIsLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-petrol-900 via-petrol-800 to-petrol-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="max-w-md w-full relative z-10">
                {/* Logo and Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl mb-6 shadow-2xl transform hover:scale-110 transition-transform">
                        <FileText className="text-white" size={40} />
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-3">
                        Alfapack
                    </h1>
                    <p className="text-xl text-beige-200">
                        Cotizaciones Profesionales
                    </p>
                </div>

                {/* Login Card */}
                <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-white/20">
                    <h2 className="text-2xl font-bold text-petrol-800 mb-2 text-center">
                        {isRegistering ? 'Crear Cuenta' : 'Bienvenido'}
                    </h2>
                    <p className="text-gray-600 text-center mb-8">
                        {isRegistering ? 'Regístrate para comenzar' : 'Inicia sesión para acceder a tu panel'}
                    </p>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                    <p className="text-red-700 text-sm font-semibold">
                                        {error}
                                    </p>
                                    <p className="text-red-600 text-xs mt-1">
                                        Si el problema persiste, abre la consola del navegador (F12) para más detalles.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Email/Password Login Form */}
                    {showEmailLogin && (
                        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
                            {isRegistering && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nombre Completo
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-petrol-500 focus:outline-none transition-colors"
                                        placeholder="Tu Nombre"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-petrol-500 focus:outline-none transition-colors"
                                    placeholder="tu@email.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-petrol-500 focus:outline-none transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-petrol-600 hover:bg-petrol-700 text-white font-semibold px-6 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Procesando...' : (isRegistering ? 'Registrarse' : 'Iniciar Sesión')}
                            </button>
                        </form>
                    )}

                    {/* Toggle Email Login Button */}
                    <button
                        onClick={() => setShowEmailLogin(!showEmailLogin)}
                        className="w-full mb-4 text-sm text-petrol-600 hover:text-petrol-700 font-medium transition-colors"
                    >
                        {showEmailLogin ? '← Volver a Google' : '📧 Usar Email y Contraseña'}
                    </button>

                    {showEmailLogin && (
                        <div className="text-center mb-4">
                            <button
                                type="button"
                                onClick={() => setIsRegistering(!isRegistering)}
                                className="text-sm text-petrol-600 hover:text-petrol-800 font-semibold underline"
                            >
                                {isRegistering ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate'}
                            </button>
                        </div>
                    )}


                    {/* Google Login Button */}
                    {!showEmailLogin && (
                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className={`w-full bg-white hover:bg-gray-50 text-gray-800 font-semibold px-6 py-4 rounded-xl transition-all flex items-center justify-center gap-3 border-2 border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl group ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800"></div>
                                    <span>Iniciando sesión...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span className="group-hover:text-petrol-800 transition-colors">
                                        Continuar con Google
                                    </span>
                                </>
                            )}
                        </button>
                    )}

                    {/* Features */}
                    <div className="mt-8 pt-8 border-t-2 border-gray-200">
                        <p className="text-xs text-gray-500 font-semibold mb-4 text-center">
                            CARACTERÍSTICAS PRINCIPALES
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm text-gray-700">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <CheckCircle className="text-green-600" size={16} />
                                </div>
                                <span>Cotizaciones profesionales en minutos</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-700">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="text-blue-600" size={16} />
                                </div>
                                <span>Micrositios interactivos para clientes</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-700">
                                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Zap className="text-orange-600" size={16} />
                                </div>
                                <span>Exportación a PDF automática</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-beige-300 text-sm mt-8">
                    Powered by Alfapack v2.0
                </p>
            </div>
        </div >
    );
};

export default Login;
