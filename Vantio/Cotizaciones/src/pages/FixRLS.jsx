import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const FixRLS = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [logs, setLogs] = useState([]);

    const addLog = (log) => {
        setLogs(prev => [...prev, log]);
    };

    const fixRLSPolicies = async () => {
        setLoading(true);
        setMessage('');
        setLogs([]);

        try {
            addLog('🔄 Iniciando arreglo de políticas RLS...');

            // Ejecutar el script SQL directamente
            const sqlScript = `
        -- Eliminar políticas existentes
        DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

        -- Crear políticas nuevas
        CREATE POLICY "Users can view their own profile"
        ON profiles FOR SELECT
        TO authenticated
        USING (auth.uid() = id);

        CREATE POLICY "Users can update their own profile"
        ON profiles FOR UPDATE
        TO authenticated
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);

        CREATE POLICY "Users can insert their own profile"
        ON profiles FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = id);
      `;

            const { data, error } = await supabase.rpc('exec_sql', { sql: sqlScript });

            if (error) {
                addLog(`❌ Error: ${error.message}`);
                setMessage('❌ No se pudo ejecutar el script. Intenta manualmente en Supabase.');
                return;
            }

            addLog('✅ Políticas RLS actualizadas');
            setMessage('✅ ¡Políticas RLS arregladas! Recarga la página.');
        } catch (err) {
            addLog(`❌ Error: ${err.message}`);
            setMessage('❌ Error inesperado. Por favor contacta al administrador.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-petrol-900 via-petrol-800 to-petrol-900 flex items-center justify-center p-4">
            <div className="glass-panel p-8 rounded-2xl max-w-2xl w-full">
                <h1 className="text-3xl font-bold text-petrol-800 mb-6 text-center">
                    Arreglar Políticas RLS
                </h1>

                <div className="mb-6 p-4 bg-yellow-50 rounded-xl">
                    <p className="text-sm text-gray-700">
                        <strong>⚠️ Nota:</strong> Este script requiere permisos de administrador en Supabase.
                        Si no funciona, necesitarás ejecutar el script manualmente en el SQL Editor de Supabase.
                    </p>
                </div>

                <button
                    onClick={fixRLSPolicies}
                    disabled={loading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                    {loading ? 'Arreglando...' : 'Arreglar Políticas RLS'}
                </button>

                {logs.length > 0 && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-xl max-h-64 overflow-y-auto">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Logs:</p>
                        {logs.map((log, index) => (
                            <p key={index} className="text-xs text-gray-700 font-mono">
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

                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                    <p className="text-xs text-gray-700 mb-2">
                        <strong>Script SQL Manual:</strong>
                    </p>
                    <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                        {`DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);`}
                    </pre>
                    <p className="text-xs text-gray-600 mt-2">
                        Copia este script y ejecútalo en: <br />
                        <a
                            href="https://app.supabase.com/project/jxbhvlyzynnmmctsybqz/sql/new"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            Supabase SQL Editor
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FixRLS;
