import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const Debug = () => {
    const { user } = useAuth();
    const [data, setData] = useState({
        user: null,
        profile: null,
        organization: null,
        products: [],
        settings: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const runDiagnostics = async () => {
        setLoading(true);
        setError(null);
        try {
            const results = {};

            // 1. Auth User
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            results.user = user;
            if (authError) throw authError;

            if (user) {
                // 2. Profile
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                results.profile = profile;
                if (profileError) console.error('Profile Error:', profileError);

                // 3. Organization
                if (profile?.organization_id) {
                    const { data: org, error: orgError } = await supabase
                        .from('organizations')
                        .select('*')
                        .eq('id', profile.organization_id)
                        .single();
                    results.organization = org;
                    if (orgError) console.error('Org Error:', orgError);

                    // 4. Products
                    const { data: products, error: prodError } = await supabase
                        .from('products')
                        .select('*')
                        .eq('organization_id', profile.organization_id);
                    results.products = products || [];
                    if (prodError) console.error('Products Error:', prodError);

                    // 5. Settings
                    const { data: settings, error: setError } = await supabase
                        .from('organization_settings')
                        .select('*')
                        .eq('organization_id', profile.organization_id)
                        .single();
                    results.settings = settings;
                    if (setError) console.error('Settings Error:', setError);
                }
            }

            setData(results);
        } catch (err) {
            console.error('Diagnostic Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        runDiagnostics();
    }, []);

    const fixProfile = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Create Org
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert([{ name: (user.user_metadata.full_name || 'User') + "'s Org" }])
                .select()
                .single();

            if (orgError) throw orgError;

            // Create Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([{
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata.full_name,
                    role: 'admin',
                    organization_id: org.id
                }]);

            if (profileError) throw profileError;

            // Create Settings
            await supabase.from('organization_settings').insert([{ organization_id: org.id }]);

            alert('Perfil reparado exitosamente. Recarga la página.');
            runDiagnostics();
        } catch (err) {
            alert('Error al reparar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const testCreateProduct = async () => {
        try {
            setLoading(true);
            if (!data.profile?.organization_id) throw new Error('No Organization ID found');

            const dummyProduct = {
                name: "Test Product " + new Date().toISOString(),
                unit_price: 100,
                organization_id: data.profile.organization_id,
                description: "Test description",
                is_active: true
            };

            const { data: newProduct, error: insertError } = await supabase
                .from('products')
                .insert([dummyProduct])
                .select();

            if (insertError) throw insertError;

            alert('¡Éxito! Producto de prueba creado. El sistema funciona. El problema está en el formulario.');
            runDiagnostics();
        } catch (err) {
            console.error('Test Create Error:', err);
            alert('Error al crear producto de prueba: ' + (err.message || JSON.stringify(err)));
            setError('Insert Error: ' + (err.message || JSON.stringify(err)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 text-white bg-gray-900 min-h-screen">
            <h1 className="text-3xl font-bold mb-6">Diagnóstico de Base de Datos</h1>

            <div className="mb-6 flex gap-4">
                <button onClick={runDiagnostics} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
                    Ejecutar Diagnóstico
                </button>
                <button onClick={testCreateProduct} className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700">
                    Probar Crear Producto (Test)
                </button>
                {!data.profile && (
                    <button onClick={fixProfile} className="px-4 py-2 bg-green-600 rounded hover:bg-green-700">
                        Intentar Reparar Perfil Manualmente
                    </button>
                )}
            </div>

            {loading && <div className="text-yellow-400 mb-4">Cargando datos...</div>}
            {error && <div className="text-red-500 mb-4 bg-red-900/20 p-4 rounded border border-red-500">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <h2 className="text-xl font-bold mb-2 text-blue-400">User (Auth)</h2>
                    <pre className="text-xs overflow-auto max-h-60 bg-black p-2 rounded">
                        {JSON.stringify(data.user, null, 2)}
                    </pre>
                </div>

                <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <h2 className="text-xl font-bold mb-2 text-green-400">Profile (Public)</h2>
                    {data.profile ? (
                        <pre className="text-xs overflow-auto max-h-60 bg-black p-2 rounded">
                            {JSON.stringify(data.profile, null, 2)}
                        </pre>
                    ) : (
                        <div className="text-red-400">No profile found! This is the problem.</div>
                    )}
                </div>

                <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <h2 className="text-xl font-bold mb-2 text-purple-400">Organization</h2>
                    <pre className="text-xs overflow-auto max-h-60 bg-black p-2 rounded">
                        {JSON.stringify(data.organization, null, 2)}
                    </pre>
                </div>

                <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <h2 className="text-xl font-bold mb-2 text-orange-400">Products ({data.products?.length})</h2>
                    <div className="max-h-60 overflow-auto">
                        {data.products?.map(p => (
                            <div key={p.id} className="flex justify-between items-center bg-black p-2 rounded mb-2 text-xs">
                                <span>{p.name} ({p.organization_id})</span>
                                <button
                                    onClick={async () => {
                                        if (!window.confirm('Delete?')) return;
                                        const { error } = await supabase.from('products').delete().eq('id', p.id);
                                        if (error) alert(error.message);
                                        else { alert('Deleted!'); runDiagnostics(); }
                                    }}
                                    className="bg-red-600 px-2 py-1 rounded text-white"
                                >
                                    Del
                                </button>
                            </div>
                        ))}
                        <pre className="text-xs mt-2">
                            {JSON.stringify(data.products, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Debug;
