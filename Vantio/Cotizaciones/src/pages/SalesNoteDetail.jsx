import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRole } from '../hooks/useRole';
import { Save, Printer, ArrowLeft, Loader2, Building2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { generateSalesNotePDF } from '../utils/pdfGeneratorV6';
import { pipedriveService } from '../services/pipedriveService';

const SalesNoteDetail = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const quoteId = searchParams.get('quoteId');
    const navigate = useNavigate();
    const { profile } = useRole();
    const componentRef = useRef();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    const [orgInfo, setOrgInfo] = useState({ name: 'Alfapack', logo_url: null });

    // Form state
    const [formData, setFormData] = useState({
        payment_method: '',
        notes: '',
        status: 'draft',
        billing_details: {},
        items: []
    });

    useEffect(() => {
        if (profile?.organization_id) {
            fetchOrganizationInfo();
        }
    }, [profile]);

    useEffect(() => {
        if (id === 'new' && quoteId) {
            fetchQuoteForNewNote(quoteId);
        } else if (id !== 'new') {
            fetchExistingNote(id);
        }
    }, [id, quoteId]);

    const fetchOrganizationInfo = async () => {
        try {
            const { data: org } = await supabase
                .from('organizations')
                .select('name, logo_url')
                .eq('id', profile.organization_id)
                .single();

            if (org) {
                setOrgInfo({
                    name: org.name || 'Alfapack',
                    logo_url: org.logo_url
                });
            }
        } catch (error) {
            console.error('Error fetching org info:', error);
        }
    };

    const fetchQuoteForNewNote = async (qId) => {
        try {
            setLoading(true);
            // First fetch the quote
            const { data: quote, error: quoteError } = await supabase
                .from('quotes')
                .select('*')
                .eq('id', qId)
                .single();

            if (quoteError) throw quoteError;

            // Then fetch the seller profile separately to avoid join errors
            const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', quote.user_id)
                .single();

            // Merge them
            const quoteWithSeller = {
                ...quote,
                seller: profileData
            };

            setData({
                quote: quoteWithSeller,
                number: 'BORRADOR', // Placeholder
                created_at: new Date().toISOString()
            });

            // Pre-fill form data if needed
            // Pre-fill form data if needed
            setFormData(prev => ({
                ...prev,
                payment_method: quote.payment_terms || '',
                notes: quote.notes || '',
                billing_details: {
                    giro: '',
                    oc_number: '',
                    oc_date: '',
                    bill_to: quote.company_name || quote.client_name || '', // Prioritize Company Name
                    commune: quote.client_city || quote.city || '', // Default to city
                    address: quote.client_address || quote.address || '',
                    rut: quote.client_rut || quote.rut || '',
                    contact_name: quote.client_name || '',
                    client_name: quote.company_name || quote.client_name || '',
                    client_email: quote.client_email || '',
                    client_phone: quote.client_phone || '',
                    quote_number: quote.quote_number || quote.number || '' // Initialize with quote number
                },
                items: quote.items ? JSON.parse(JSON.stringify(quote.items)) : [] // Deep copy items
            }));

        } catch (error) {
            console.error('Error fetching quote:', error);
            alert('Error al cargar la cotización.');
            navigate('/quotes');
        } finally {
            setLoading(false);
        }
    };

    const fetchExistingNote = async (noteId) => {
        try {
            setLoading(true);
            const { data: note, error } = await supabase
                .from('sales_notes')
                .select(`
                    *,
                    quote:quotes (
                        *
                    )
                `)
                .eq('id', noteId)
                .single();

            if (error) throw error;

            // Fetch seller for the quote if it exists
            if (note.quote?.user_id) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('full_name, email')
                    .eq('id', note.quote.user_id)
                    .single();
                note.quote.seller = profileData;
            }

            setData({
                ...note,
                quote: note.quote // Flatten for easier access
            });

            // Intelligent pre-fill: Merge saved details with current quote data if missing
            const savedDetails = note.billing_details || {};
            const q = note.quote || {};

            setFormData({
                payment_method: note.payment_method || q.payment_terms || '',
                notes: note.notes || q.notes || '',
                status: note.status || 'draft',
                billing_details: {
                    ...savedDetails,
                    // If missing in saved note, try to pull from quote
                    rut: savedDetails.rut || q.client_rut || q.rut || '',
                    address: savedDetails.address || q.client_address || '',
                    commune: savedDetails.commune || q.client_city || '',
                    contact_name: savedDetails.contact_name || q.client_name || '',
                    bill_to: savedDetails.bill_to || q.company_name || q.client_name || '',
                    client_name: savedDetails.client_name || q.company_name || q.client_name || '',
                    client_email: savedDetails.client_email || q.client_email || '',
                    client_phone: savedDetails.client_phone || q.client_phone || '',
                    quote_number: savedDetails.quote_number || q.quote_number || q.number || ''
                },
                items: note.items || q.items || []
            });

        } catch (error) {
            console.error('Error fetching note:', error);
            alert('Error al cargar la nota de venta.');
            navigate('/sales-notes');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            const payload = {
                payment_method: formData.payment_method,
                notes: formData.notes,
                status: formData.status,
                billing_details: formData.billing_details,
                items: formData.items,
                user_id: profile.id,
                organization_id: profile.organization_id // Critical for RLS
            };

            // Helper for Pipedrive Sync
            const syncToPipedrive = async (noteData, noteId) => {
                try {
                    const { data: orgSettings } = await supabase
                        .from('organization_settings')
                        .select('pipedrive_file_sync_enabled')
                        .eq('organization_id', profile.organization_id)
                        .single();

                    if (orgSettings?.pipedrive_file_sync_enabled) {
                        console.log("📄 Generating and uploading Sales Note PDF for Pipedrive...");
                        // Note data for PDF
                        const billing = formData.billing_details || {};
                        const noteForPdf = {
                            ...noteData,
                            id: noteId, // Ensure ID is present
                            quote: data.quote,
                            // Prioritize edited billing details
                            client_name: billing.client_name || billing.bill_to || data.quote?.client_name,
                            client_rut: billing.rut || data.quote?.client_rut,
                            client_giro: billing.giro || '',
                            client_email: billing.client_email || data.quote?.client_email,
                            client_address: billing.address || data.quote?.client_address,
                            subtotal: formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
                            tax: 0, // Recalculate if needed
                            total: formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 1.19,
                            created_at: new Date().toISOString(),
                            items: formData.items // Use edited items
                        };
                        noteForPdf.tax = noteForPdf.total - noteForPdf.subtotal;

                        const pdfBlob = await generateSalesNotePDF(noteForPdf, orgInfo, true);

                        if (pdfBlob) {
                            const fileName = `OC_${noteData.note_number || noteData.number || noteId}.pdf`;
                            const filePath = `sales_notes/${fileName}`;

                            const { error: uploadError } = await supabase.storage
                                .from('quotes')
                                .upload(filePath, pdfBlob, {
                                    contentType: 'application/pdf',
                                    upsert: true
                                });

                            if (!uploadError) {
                                const { data: { publicUrl } } = supabase.storage
                                    .from('quotes')
                                    .getPublicUrl(filePath);

                                // Sync to Pipedrive Deal
                                await pipedriveService.uploadFile({
                                    fileUrl: publicUrl,
                                    fileName: fileName,
                                    quoteId: data.quote?.id,
                                    organizationId: profile.organization_id
                                });
                                console.log("✅ Sales Note PDF archived to Pipedrive");
                            }
                        }
                    }
                } catch (err) {
                    console.error("Failed to archive Sales Note to Pipedrive:", err);
                }
            };

            let result;

            if (id === 'new') {
                // Create new
                const { data: newNote, error } = await supabase
                    .from('sales_notes')
                    .insert({
                        ...payload,
                        quote_id: quoteId,
                        // number is serial, auto-generated
                    })
                    .select()
                    .single();

                if (error) throw error;
                result = newNote;

                await syncToPipedrive(result, result.id);

                alert('Nota de venta creada exitosamente');
                setData(result); // Update state to show generated number
                navigate(`/sales-notes/${result.id}`);
            } else {
                // Update existing
                const { error } = await supabase
                    .from('sales_notes')
                    .update(payload)
                    .eq('id', id);

                if (error) throw error;
                alert('Nota de venta actualizada');
                await syncToPipedrive({ ...payload, ...data }, id);
            }

        } catch (error) {
            console.error('Error saving note:', error);
            alert(`Error al guardar la nota de venta: ${error.message || JSON.stringify(error)}`);
        } finally {
            setSaving(false);
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index] = {
            ...newItems[index],
            [field]: value
        };
        setFormData({ ...formData, items: newItems });
    };

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Nota_Venta_${data?.note_number || data?.number || 'Borrador'}`,
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="animate-spin text-orange-500" size={40} />
            </div>
        );
    }

    if (!data) return <div>No se encontraron datos.</div>;

    const { quote } = data;

    return (
        <div className="space-y-6 pb-20">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200 sticky top-4 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/sales-notes')} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-petrol-800">
                            {id === 'new' ? 'Nueva Nota de Venta' : `Nota de Venta #${data.note_number || data.number || '---'}`}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {id === 'new' ? 'Basada en cotización' : `Creada el ${new Date(data.created_at).toLocaleDateString()}`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <Printer size={18} />
                        Imprimir
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Save size={18} />
                        {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>

            {/* Editor / Preview Area */}
            <div className="flex flex-col lg:flex-row gap-6">

                {/* Settings Panel (Left) */}
                <div className="w-full lg:w-1/3 space-y-6">
                    <div className="glass-panel p-6 rounded-xl">
                        <h3 className="font-bold text-petrol-800 mb-4">Editar Datos</h3>

                        <div className="space-y-6">
                            {/* 1. STATUS (Control System) */}
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Estado del Documento</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="input-field w-full"
                                >
                                    <option value="draft">Borrador</option>
                                    <option value="final">Emitida</option>
                                    <option value="cancelled">Anulada</option>
                                </select>
                            </div>

                            {/* 2. CLIENT DATA (Header/Body) */}
                            <div className="space-y-3">
                                <h4 className="flex items-center gap-2 font-bold text-petrol-700 border-b pb-1">
                                    <span className="w-6 h-6 bg-petrol-100 rounded-full flex items-center justify-center text-xs">1</span>
                                    Datos del Cliente
                                </h4>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Cliente (Razón Social)</label>
                                    <input
                                        type="text"
                                        value={formData.billing_details.client_name || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            billing_details: { ...formData.billing_details, client_name: e.target.value }
                                        })}
                                        className="input-field w-full text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">RUT</label>
                                        <input
                                            type="text"
                                            value={formData.billing_details.rut || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                billing_details: { ...formData.billing_details, rut: e.target.value }
                                            })}
                                            className="input-field w-full text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Giro</label>
                                        <input
                                            type="text"
                                            value={formData.billing_details.giro || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                billing_details: { ...formData.billing_details, giro: e.target.value }
                                            })}
                                            className="input-field w-full text-sm"
                                            placeholder="Ej: Minería"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Contacto</label>
                                    <input
                                        type="text"
                                        value={formData.billing_details.contact_name || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            billing_details: { ...formData.billing_details, contact_name: e.target.value }
                                        })}
                                        className="input-field w-full text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                                        <input
                                            type="text"
                                            value={formData.billing_details.client_email || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                billing_details: { ...formData.billing_details, client_email: e.target.value }
                                            })}
                                            className="input-field w-full text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono</label>
                                        <input
                                            type="text"
                                            value={formData.billing_details.client_phone || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                billing_details: { ...formData.billing_details, client_phone: e.target.value }
                                            })}
                                            className="input-field w-full text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección</label>
                                    <input
                                        type="text"
                                        value={formData.billing_details.address || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            billing_details: { ...formData.billing_details, address: e.target.value }
                                        })}
                                        className="input-field w-full text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Comuna</label>
                                    <input
                                        type="text"
                                        value={formData.billing_details.commune || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            billing_details: { ...formData.billing_details, commune: e.target.value }
                                        })}
                                        className="input-field w-full text-sm"
                                    />
                                </div>
                            </div>

                            {/* 3. REF DATA */}
                            <div className="space-y-3 pt-2">
                                <h4 className="flex items-center gap-2 font-bold text-petrol-700 border-b pb-1">
                                    <span className="w-6 h-6 bg-petrol-100 rounded-full flex items-center justify-center text-xs">2</span>
                                    Datos de Compra / Referencias
                                </h4>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">N° OC Cliente</label>
                                        <input
                                            type="text"
                                            value={formData.billing_details.oc_number || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                billing_details: { ...formData.billing_details, oc_number: e.target.value }
                                            })}
                                            className="input-field w-full text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha OC</label>
                                        <input
                                            type="date"
                                            value={formData.billing_details.oc_date || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                billing_details: { ...formData.billing_details, oc_date: e.target.value }
                                            })}
                                            className="input-field w-full text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Referencia N° Cotización</label>
                                    <input
                                        type="text"
                                        value={formData.billing_details.quote_number || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            billing_details: { ...formData.billing_details, quote_number: e.target.value }
                                        })}
                                        className="input-field w-full text-sm"
                                        placeholder="Ej: COT-123"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Facturar a (Si es diferente)</label>
                                    <input
                                        type="text"
                                        value={formData.billing_details.bill_to || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            billing_details: { ...formData.billing_details, bill_to: e.target.value }
                                        })}
                                        className="input-field w-full text-sm"
                                        placeholder="Opcional"
                                    />
                                </div>
                            </div>

                            {/* 4. FOOTER DETAILS */}
                            <div className="space-y-3 pt-2">
                                <h4 className="flex items-center gap-2 font-bold text-petrol-700 border-b pb-1">
                                    <span className="w-6 h-6 bg-petrol-100 rounded-full flex items-center justify-center text-xs">3</span>
                                    Pie de Página (Comercial)
                                </h4>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Forma de Pago</label>
                                    <input
                                        type="text"
                                        value={formData.payment_method}
                                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                        placeholder="Ej: A 30 días"
                                        className="input-field w-full text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Comentarios</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="input-field w-full min-h-[80px] text-sm"
                                        placeholder="Comentarios adicionales..."
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Document Preview (Right) - Printable Area */}
                <div className="w-full lg:w-2/3 overflow-auto bg-gray-100 p-8 rounded-xl flex justify-center">
                    <div
                        ref={componentRef}
                        className="bg-white shadow-lg p-8 w-[210mm] min-h-[297mm]"
                        style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6 pb-4">
                            {/* Logo */}
                            {/* Logo */}
                            <div className="w-[28%] flex justify-start">
                                {orgInfo.logo_url ? (
                                    <img src={orgInfo.logo_url} alt="Logo" className="h-32 w-auto object-contain" />
                                ) : (
                                    <div className="h-24 w-40 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                                        {orgInfo.name}
                                    </div>
                                )}
                            </div>

                            {/* Company Info */}
                            <div className="w-[44%] text-center text-xs px-2">
                                <h2 className="font-bold text-lg mb-1 text-petrol-800">{orgInfo.name}</h2>
                                <p className="font-medium text-gray-600">Soluciones Industriales</p>
                                <p>Av. Presidente Jorge Alessandri R. 24429</p>
                                <p>Ruta 5 Sur, Km 26, San Bernardo</p>
                                <p>Santiago - Región Metropolitana</p>
                                <p>Teléfono: +569 23233610</p>
                                <p className="text-blue-600 font-medium">contacto@alfapack.cl - www.alfapack.cl</p>
                            </div>

                            {/* Title and Info Box */}
                            <div className="w-[28%] flex flex-col items-end">
                                <h1 className="text-xl font-bold mb-3 text-petrol-800">NOTA DE VENTA</h1>
                                <table className="border-2 border-black text-xs w-full">
                                    <tbody>
                                        <tr>
                                            <td className="border border-black px-2 py-1 font-bold bg-gray-100">Fecha:</td>
                                            <td className="border border-black px-2 py-1">{new Date(data.created_at).toLocaleDateString()}</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-black px-2 py-1 font-bold bg-gray-100">N.°:</td>
                                            <td className="border border-black px-2 py-1">{data.note_number || '---'}</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-black px-2 py-1 font-bold bg-gray-100">Vendedor:</td>
                                            <td className="border border-black px-2 py-1">{quote?.seller?.full_name || '---'}</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-black px-2 py-1 font-bold bg-gray-100">Forma de Pago:</td>
                                            <td className="border border-black px-2 py-1">{formData.payment_method || '---'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Client Section */}
                        <div className="mb-4">
                            <div className="bg-blue-900 text-white font-bold px-2 py-1 text-xs">CLIENTE</div>
                            <div className="border-2 border-blue-900 p-2">
                                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[80px]">Cliente:</span>
                                        <span>{formData.billing_details?.client_name || '---'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[100px]">Contacto:</span>
                                        <span>{formData.billing_details?.contact_name || '---'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[80px]">Giro:</span>
                                        <span>{formData.billing_details?.giro || '---'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[100px]">N.° Cotización:</span>
                                        <span>{formData.billing_details?.quote_number || '---'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[80px]">Rut:</span>
                                        <span>{formData.billing_details?.rut || '---'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[100px]">N.° OC:</span>
                                        <span>{formData.billing_details?.oc_number || '---'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[80px]">Email:</span>
                                        <span>{formData.billing_details?.client_email || '---'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[100px]">Fecha OC:</span>
                                        <span>{formData.billing_details?.oc_date ? new Date(formData.billing_details.oc_date).toLocaleDateString() : '---'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[80px]">Dirección:</span>
                                        <span>{formData.billing_details?.address || '---'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[100px]">Facturar Por:</span>
                                        <span>{formData.billing_details?.bill_to || '---'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[80px]">Comuna:</span>
                                        <span>{formData.billing_details?.commune || '---'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="mb-4">
                            <table className="w-full border-2 border-blue-900 text-xs">
                                <thead className="bg-blue-900 text-white">
                                    <tr>
                                        <th className="border border-blue-900 px-2 py-1 w-16">Código</th>
                                        <th className="border border-blue-900 px-2 py-1">Descripción</th>
                                        <th className="border border-blue-900 px-2 py-1 w-16">Medida</th>
                                        <th className="border border-blue-900 px-2 py-1 w-16">Cant.</th>
                                        <th className="border border-blue-900 px-2 py-1 w-24">Precio</th>
                                        <th className="border border-blue-900 px-2 py-1 w-24">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.items?.map((item, index) => (
                                        <tr key={index}>
                                            <td className="border border-blue-900 px-2 py-1 text-center">
                                                {item.productSku || '.'}
                                            </td>
                                            <td className="border border-blue-900 px-0 py-0">
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    className="w-full h-full px-2 py-1 outline-none bg-transparent"
                                                />
                                            </td>
                                            <td className="border border-blue-900 px-2 py-1 text-center">.</td>
                                            <td className="border border-blue-900 px-0 py-0 text-center">
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                    className="w-full h-full px-1 py-1 outline-none bg-transparent text-center"
                                                />
                                            </td>
                                            <td className="border border-blue-900 px-0 py-0 text-right">
                                                <input
                                                    type="number"
                                                    value={item.unitPrice}
                                                    onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                    className="w-full h-full px-1 py-1 outline-none bg-transparent text-right"
                                                />
                                            </td>
                                            <td className="border border-blue-900 px-2 py-1 text-right">
                                                $ {(item.quantity * item.unitPrice)?.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Fill empty rows */}
                                    {[...Array(Math.max(0, 15 - (quote?.items?.length || 0)))].map((_, i) => (
                                        <tr key={`empty-${i}`}>
                                            <td className="border border-blue-900 px-2 py-1 h-6">.</td>
                                            <td className="border border-blue-900 px-2 py-1">.</td>
                                            <td className="border border-blue-900 px-2 py-1">.</td>
                                            <td className="border border-blue-900 px-2 py-1">.</td>
                                            <td className="border border-blue-900 px-2 py-1">.</td>
                                            <td className="border border-blue-900 px-2 py-1">.</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-4">
                            {/* Comments */}
                            <div className="w-2/3">
                                <div className="bg-blue-900 text-white font-bold px-2 py-1 text-xs text-center">Comentario</div>
                                <div className="border-2 border-black h-24 p-2 text-xs">
                                    {formData.notes}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="w-1/3">
                                <table className="w-full border-2 border-black text-xs">
                                    <tbody>
                                        <tr>
                                            <td className="bg-blue-900 text-white font-bold px-2 py-1 border border-black">Suma</td>
                                            <td className="px-2 py-1 text-right border border-black">
                                                $ {quote?.subtotal?.toLocaleString() || '0'}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="bg-blue-900 text-white font-bold px-2 py-1 border border-black">Descuento</td>
                                            <td className="px-2 py-1 text-right border border-black">$ 0</td>
                                        </tr>
                                        <tr>
                                            <td className="bg-blue-900 text-white font-bold px-2 py-1 border border-black">Subtotal</td>
                                            <td className="px-2 py-1 text-right border border-black">
                                                $ {formData.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString() || '0'}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="bg-blue-900 text-white font-bold px-2 py-1 border border-black">IVA</td>
                                            <td className="px-2 py-1 text-right border border-black">
                                                $ {(formData.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 0.19).toLocaleString() || '0'}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="bg-blue-900 text-white font-bold px-2 py-1 border border-black">Total</td>
                                            <td className="px-2 py-1 text-right border border-black font-bold">
                                                $ {(formData.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 1.19).toLocaleString() || '0'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
};

export default SalesNoteDetail;
