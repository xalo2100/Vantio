import React, { useState } from 'react';
import { Lock, Unlock, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AdminVerificationModal = ({ onVerified, onClose, userEmail }) => {
    const [password, setPassword] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState(null);

    const handleVerify = async () => {
        if (!password) {
            setError('Por favor ingresa tu contraseña');
            return;
        }

        setVerifying(true);
        setError(null);

        try {
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-admin-password`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                        userId: userEmail,
                        password: password
                    })
                }
            );

            const result = await response.json();

            if (result.valid) {
                onVerified();
                onClose();
            } else {
                setError(result.error || 'Contraseña incorrecta');
            }
        } catch (err) {
            console.error('Error verifying password:', err);
            setError('Error al verificar la contraseña');
        } finally {
            setVerifying(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleVerify();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                        <Lock className="text-orange-500" size={24} />
                        <h2 className="text-xl font-bold text-gray-900">Verificación de Administrador</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">
                        Para editar las Condiciones de Venta, ingresa tu contraseña de administrador:
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ingresa tu contraseña"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleVerify}
                        disabled={verifying}
                        className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {verifying ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Verificando...
                            </>
                        ) : (
                            <>
                                <Unlock size={18} />
                                Desbloquear
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminVerificationModal;
