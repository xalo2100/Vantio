import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRole } from '../hooks/useRole';
import { Save, Printer, ArrowLeft, Loader2, Building2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

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
    const [orgLogo, setOrgLogo] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        payment_method: '',
        comments: '',
        status: 'draft',
        billing_details: {}
    });

    useEffect(() => {
        if (profile?.organization_id) {
            fetchOrganizationLogo();
        }
    }, [profile]);

    useEffect(() => {
        if (id === 'new' && quoteId) {
            fetchQuoteForNewNote(quoteId);
        } else if (id !== 'new') {
            fetchExistingNote(id);
        }
    }, [id, quoteId]);

    const fetchOrganizationLogo = async () => {
        try {
            const { data } = await supabase
                .from('organizations')
                .select('logo_url')
                .eq('id', profile.organization_id)
                .single();
            if (data?.logo_url) setOrgLogo(data.logo_url);
        } catch (error) {
            console.error('Error fetching logo:', error);
        }
    };

    const fetchQuoteForNewNote = async (qId) => {
        try {
            setLoading(true);
            const { data: quote, error } = await supabase
                .from('quotes')
                .select('*, seller:user_id(full_name, email)')
                .eq('id', qId)
                .single();

            if (error) throw error;

            setData({
                quote,
                number: 'BORRADOR', // Placeholder
                created_at: new Date().toISOString()
            });

            // Pre-fill form data if needed
            setFormData(prev => ({
                ...prev,
                comments: quote.notes || ''
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
                        *,
                        seller:user_id(full_name, email)
                    )
                `)
                .eq('id', noteId)
                .single();

            if (error) throw error;

            setData({
                ...note,
                quote: note.quote // Flatten for easier access
            });

            setFormData({
                payment_method: note.payment_method || '',
                comments: note.comments || '',
                status: note.status || 'draft',
                billing_details: note.billing_details || {}
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
                comments: formData.comments,
                status: formData.status,
                billing_details: formData.billing_details,
                user_id: profile.id
                // organization_id is not in my schema but good to have if added
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
                alert('Nota de venta creada exitosamente');
                navigate(`/sales-notes/${result.id}`);
            } else {
                // Update existing
                const { error } = await supabase
                    .from('sales_notes')
                    .update(payload)
                    .eq('id', id);

                if (error) throw error;
                alert('Nota de venta actualizada');
            }

        } catch (error) {
            console.error('Error saving note:', error);
            alert('Error al guardar la nota de venta');
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Nota_Venta_${data?.number || 'Borrador'}`,
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
                            {id === 'new' ? 'Nueva Nota de Venta' : `Nota de Venta #${data.number}`}
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
                        <h3 className="font-bold text-petrol-800 mb-4">Configuración</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
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

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Forma de Pago</label>
                                <input
                                    type="text"
                                    value={formData.payment_method}
                                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                    placeholder="Ej: Transferencia 30 días"
                                    className="input-field w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Comentarios</label>
                                <textarea
                                    value={formData.comments}
                                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                                    className="input-field w-full min-h-[100px]"
                                    placeholder="Comentarios visibles en el documento..."
                                />
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
                            <div className="w-1/3">
                                {orgLogo ? (
                                    <img src={orgLogo} alt="Logo" className="h-16 object-contain" />
                                ) : (
                                    <div className="h-16 w-32 bg-orange-500 flex items-center justify-center text-white font-bold text-xl">
                                        αpack
                                    </div>
                                )}
                            </div>

                            {/* Company Info */}
                            <div className="w-1/3 text-center text-xs">
                                <h2 className="font-bold text-sm mb-1">Alfapack SpA</h2>
                                <p>Comercialización de Maquinarias</p>
                                <p>Av. Presidente Jorge Alessandri R. 24429, Ruta 5 Sur, Km 26, San Bernardo</p>
                                <p>Santiago - Región Metropolitana</p>
                                <p>Telefono: +569 23233610</p>
                                <p className="text-blue-600">alfapack@alfapack.cl - www.alfapack.cl</p>
                            </div>

                            {/* Title and Info Box */}
                            <div className="w-1/3 flex flex-col items-end">
                                <h1 className="text-xl font-bold mb-2">NOTA DE VENTA</h1>
                                <table className="border-2 border-black text-xs w-48">
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
                                        <span>{quote?.client_name || '---'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[100px]">Contacto:</span>
                                        <span>{quote?.client_name || '---'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[80px]">Giro:</span>
                                        <span>---</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[100px]">N.° Cotización:</span>
                                        <span>{quote?.quote_number || '---'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[80px]">Rut:</span>
                                        <span>{data.client_rut || '---'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[100px]">N.° OC:</span>
                                        <span>---</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[80px]">Email:</span>
                                        <span>{quote?.client_email || '---'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[100px]">Fecha OC:</span>
                                        <span>---</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[80px]">Dirección:</span>
                                        <span>{data.client_address || '---'}</span>
                                    </div>
                                    <div className="mt-2">
                                        <div className="bg-blue-900 text-white font-bold px-3 py-1 inline-block text-xs">Facturar Por:</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-bold min-w-[80px]">Comuna:</span>
                                        <span>---</span>
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
                                    {quote?.items?.map((item, index) => (
                                        <tr key={index}>
                                            <td className="border border-blue-900 px-2 py-1 text-center">{item.productSku || '.'}</td>
                                            <td className="border border-blue-900 px-2 py-1">{item.description}</td>
                                            <td className="border border-blue-900 px-2 py-1 text-center">.</td>
                                            <td className="border border-blue-900 px-2 py-1 text-center">{item.quantity}</td>
                                            <td className="border border-blue-900 px-2 py-1 text-right">
                                                $ {item.unitPrice?.toLocaleString()}
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
                                    {formData.comments}
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
                                                $ {quote?.subtotal?.toLocaleString() || '0'}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="bg-blue-900 text-white font-bold px-2 py-1 border border-black">IVA</td>
                                            <td className="px-2 py-1 text-right border border-black">
                                                $ {quote?.tax?.toLocaleString() || '0'}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="bg-blue-900 text-white font-bold px-2 py-1 border border-black">Total</td>
                                            <td className="px-2 py-1 text-right border border-black font-bold">
                                                $ {quote?.total?.toLocaleString() || '0'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesNoteDetail;
