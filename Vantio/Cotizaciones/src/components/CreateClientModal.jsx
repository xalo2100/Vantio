import React, { useState } from 'react';
import { X, Save, Building2, User, Mail, Phone, MapPin, Globe, PlusCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CreateClientModal = ({ isOpen, onClose, onClientCreated, organizationId, sellerEmail }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        rut: '',
        email: '',
        phone: '',
        city: '',
        region: '',
        company_phone: '',
        address: '',
        internal_notes: '',
        sync_to_crm: true
    });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Prepare data (Clean empty strings to null for unique constraints)
            // Exclude sync_to_crm as it's a UI flag, not a DB column
            const { sync_to_crm, ...clientData } = formData;

            const insertData = {
                ...clientData,
                organization_id: organizationId,
                rut: formData.rut?.trim() === '' ? null : formData.rut.trim(),
                company_phone: formData.company_phone?.trim() === '' ? null : formData.company_phone.trim(),
                email: formData.email?.trim().toLowerCase()
            };

            console.log('📝 Attempting to upsert client:', insertData);

            // 2. Guardar en Supabase (Usar upsert para manejar duplicados de RUT)
            const { data: newClient, error: supabaseError } = await supabase
                .from('clients')
                .upsert([insertData], {
                    onConflict: 'organization_id,rut',
                    ignoreDuplicates: false
                })
                .select()
                .single();

            if (supabaseError) {
                console.error('❌ Supabase Upsert Error:', supabaseError);
                throw new Error(supabaseError.message || 'Error de base de datos');
            }

            // 2. Sincronizar con CRM si está marcado
            if (formData.sync_to_crm) {
                try {
                    // Llamar a la Edge Function de sincronización
                    const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-client-to-pipedrive', {
                        body: {
                            clientName: formData.name,
                            clientEmail: formData.email,
                            companyName: formData.company,
                            clientPhone: formData.phone,
                            clientRut: formData.rut,
                            clientCity: formData.city,
                            clientRegion: formData.region,
                            companyPhone: formData.company_phone,
                            clientAddress: formData.address,
                            sellerEmail: sellerEmail,
                            organizationId: organizationId,
                            quoteId: 'NEW_CLIENT'
                        }
                    });

                    if (syncError) throw syncError;

                    if (syncData?.debug) {
                        const { detected_fields } = syncData.debug;
                        const missing = [];
                        if (!detected_fields.rut) missing.push('RUT');
                        if (!detected_fields.comuna) missing.push('Comuna');
                        if (!detected_fields.region) missing.push('Región');

                        if (missing.length > 0) {
                            console.log('⚠️ Campos no detectados en Pipedrive:', missing);
                            alert(`⚠️ Sincronizado, pero no se encontraron estos campos en Pipedrive: ${missing.join(', ')}. Por favor, envíame una foto de los "Detalles" de la organización en Pipedrive para verificar los nombres exactos.`);
                        } else {
                            alert('✅ Cliente sincronizado correctamente con todos los campos en Pipedrive.');
                        }
                    }
                } catch (crmError) {
                    console.error('Error syncing to CRM, but client saved locally:', crmError);
                    alert(`Cliente guardado localmente, pero hubo un error sincronizando con el CRM: ${crmError.message}`);
                }
            }

            if (onClientCreated) {
                onClientCreated(newClient);
            }
            onClose();

            // Reset form
            setFormData({
                name: '',
                company: '',
                rut: '',
                email: '',
                phone: '',
                city: '',
                region: '',
                company_phone: '',
                address: '',
                internal_notes: '',
                sync_to_crm: true
            });

        } catch (error) {
            console.error('Error creating client:', error);
            alert('Error al crear el cliente: ' + (error.message || 'Error desconocido'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-petrol-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110] animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 bg-gradient-to-r from-petrol-800 to-petrol-700 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                            <PlusCircle className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Nuevo Cliente Industrial</h2>
                            <p className="text-petrol-200 text-xs">Agrega los datos para el directorio y CRM</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Datos de Contacto */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                                <User size={14} /> Información Personal
                            </h3>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-500 uppercase ml-1">Nombre del Contacto *</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium bg-stone-50"
                                    placeholder="Ej: Juan Pérez"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-500 uppercase ml-1">Email Corporativo *</label>
                                <input
                                    required
                                    type="email"
                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium bg-stone-50"
                                    placeholder="juan@empresa.cl"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-500 uppercase ml-1">Teléfono Directo</label>
                                <input
                                    type="tel"
                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium bg-stone-50"
                                    placeholder="+56 9 ..."
                                    value={formData.phone}
                                    onFocus={(e) => {
                                        if (!formData.phone || formData.phone.trim() === '') {
                                            setFormData({ ...formData, phone: '+56 ' });
                                        }
                                    }}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Datos de Empresa */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                                <Building2 size={14} /> Información Empresa
                            </h3>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-500 uppercase ml-1">Razón Social / Empresa</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium bg-stone-50"
                                    placeholder="Ej: Industrial Alimentos S.A."
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-500 uppercase ml-1">RUT Empresa</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium bg-stone-50"
                                    placeholder="77.666.555-4"
                                    value={formData.rut}
                                    onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-500 uppercase ml-1">Comuna</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium bg-stone-50"
                                    placeholder="Ej: Concepción"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-500 uppercase ml-1">Región</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium bg-stone-50"
                                    placeholder="Ej: Biobío"
                                    value={formData.region}
                                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-500 uppercase ml-1">Teléfono Empresa</label>
                                <input
                                    type="tel"
                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium bg-stone-50"
                                    placeholder="+56 2 ..."
                                    value={formData.company_phone}
                                    onFocus={(e) => {
                                        if (!formData.company_phone || formData.company_phone.trim() === '') {
                                            setFormData({ ...formData, company_phone: '+56 ' });
                                        }
                                    }}
                                    onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-500 uppercase ml-1">Dirección de Despacho / Oficina</label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium bg-stone-50"
                            placeholder="Calle, Número, Oficina/Local"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>

                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                <Globe className="text-orange-600" size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-petrol-800 tracking-tight leading-none">Sincronización Automática</p>
                                <p className="text-xs text-stone-500 mt-1">Crear también en Pipedrive bajo tu email</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={formData.sync_to_crm}
                                onChange={(e) => setFormData({ ...formData, sync_to_crm: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 px-6 rounded-2xl font-bold text-stone-600 hover:bg-stone-100 transition-all border border-stone-200 active:scale-[0.98]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-4 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Save size={20} />
                                    <span>Crear e Integrar Cliente</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateClientModal;
