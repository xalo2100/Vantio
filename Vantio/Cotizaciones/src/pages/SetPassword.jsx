import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * PÁGINA TEMPORAL PARA ESTABLECER CONTRASEÑA
 * Usar solo una vez y luego eliminar
 * Acceder en: http://localhost:5173/set-password
 */
const SetPassword = () => {
    const [email, setEmail] = useState('gsanchez@vantio.cl');
    const [password, setPassword] = useState('123Momia.');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleSetPassword = async () => {
        setLoading(true);
        setResult(null);

        try {
            // Opción 1: Enviar email de reset
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback`
            });

            if (error) throw error;

            setResult({
                success: true,
                message: `✅ Email de reset enviado a ${email}. Revisa tu correo y usa la contraseña: ${password}`
            });
        } catch (error) {
            console.error('Error:', error);
            setResult({
                success: false,
                message: `❌ Error: ${error.message}`
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                <h1 className="text-2xl font-bold mb-4">🔧 Establecer Contraseña</h1>
                <p className="text-sm text-gray-600 mb-6">
                    Página temporal para establecer contraseña. Eliminar después de usar.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Contraseña deseada</label>
                        <input
                            type="text"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                    </div>

                    <button
                        onClick={handleSetPassword}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Enviando...' : 'Enviar Email de Reset'}
                    </button>

                    {result && (
                        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                            {result.message}
                        </div>
                    )}

                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            <strong>⚠️ Instrucciones:</strong>
                        </p>
                        <ol className="text-sm text-yellow-800 mt-2 space-y-1 list-decimal list-inside">
                            <li>Click en "Enviar Email de Reset"</li>
                            <li>Revisa el correo {email}</li>
                            <li>Click en el link del email</li>
                            <li>Establece la contraseña: {password}</li>
                            <li>Vuelve a /login y usa email/password</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetPassword;
