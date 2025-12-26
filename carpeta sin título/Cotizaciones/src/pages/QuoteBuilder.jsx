import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, Send, Eye, CheckCircle, Mail, Search, Building2, User, WifiOff, Wifi, Lock } from 'lucide-react';
import { useQuotes } from '../context/QuoteContext';
import { useNavigate, useParams } from 'react-router-dom';
import { sendQuoteEmail } from '../utils/emailService';
import { useRole } from '../hooks/useRole';
import CurrencyRateDisplay from '../components/CurrencyRateDisplay';
import RichTextEditor from '../components/RichTextEditor';
import { generateQuotePDF } from '../utils/pdfGeneratorV6';
import { supabase } from '../lib/supabase';
import { useOffline } from '../context/OfflineContext';

const QuoteBuilder = () => {
    const { id } = useParams();
    const { isAdmin, isSuperAdmin, profile } = useRole();
    const { addQuote, getQuoteById, updateQuote } = useQuotes();
    const { isOnline, saveOfflineQuote, cacheProducts, getCachedProducts } = useOffline();
    const navigate = useNavigate();

    // Load quote if id is present and fetch fresh product data
    useEffect(() => {
        if (id) {
            const existingQuote = getQuoteById(id);
            if (existingQuote) {
                console.log("📝 Loading existing quote for edit:", existingQuote);

                // Fetch fresh product info to update stale snapshots
                const refreshItems = async (items) => {
                    const freshItems = await Promise.all(items.map(async (item) => {
                        const productId = item.productId || item.id;
                        if (!productId || typeof productId !== 'string' || productId.length < 30) return item;

                        try {
                            const { data: product } = await supabase
                                .from('products')
                                .select('*')
                                .eq('id', productId)
                                .single();

                            if (product) {
                                return {
                                    ...item,
                                    productDescription: product.description || item.productDescription,
                                    productTechnicalSpecs: product.technical_specs || item.productTechnicalSpecs,
                                    productMainImage: product.main_image || item.productMainImage,
                                    productModel: product.model || item.productModel,
                                    productVideoUrl: product.video_url || item.productVideoUrl,
                                    description: product.name // Ensure main description is also synced? Maybe risky if custom edit. Let's stick to enriched fields.
                                };
                            }
                        } catch (e) {
                            console.error("Error refreshing item", item.id, e);
                        }
                        return item;
                    }));

                    setQuoteData({
                        quote_number: existingQuote.quoteNumber,
                        companyName: existingQuote.companyName || '',
                        clientName: existingQuote.clientName || '',
                        clientEmail: existingQuote.clientEmail || '',
                        clientPhone: existingQuote.clientPhone || '',
                        projectName: existingQuote.projectName || '',
                        currency: existingQuote.currency || 'CLP',
                        validUntil: existingQuote.validUntil ? existingQuote.validUntil.split('T')[0] : '',
                        items: freshItems, // Use fresh items
                        notes: existingQuote.notes || '',
                        conditions: existingQuote.conditions || '',
                        internal_notes: existingQuote.internalNotes || '',
                        paymentTerms: existingQuote.paymentTerms || '',
                        deliveryTime: existingQuote.deliveryTime || ''
                    });
                };

                refreshItems(existingQuote.items || []);

                // If it's a Pipedrive client, we might want to set that too if we had the ID
                // For now, let's keep it simple
            }
        }
    }, [id, getQuoteById]);

    // DEBUG: Check profile on every render
    console.log("🏗️ QuoteBuilder RENDER:", {
        profileId: profile?.id,
        orgId: profile?.organization_id,
        isLoading: !profile
    });
    const [showSuccess, setShowSuccess] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sendEmail, setSendEmail] = useState(true);
    const [sendWhatsapp, setSendWhatsapp] = useState(false);
    const [emailMessage, setEmailMessage] = useState('');
    const [orgLogo, setOrgLogo] = useState(null);
    const [loadingSettings, setLoadingSettings] = useState(false); // Start false to avoid stuck loading state
    const [headerBorderColor, setHeaderBorderColor] = useState('#6B7280'); // Default gray
    const [pdfTemplate, setPdfTemplate] = useState('technical'); // 'technical' | 'standard'

    // Currency Exchange State
    const [exchangeRate, setExchangeRate] = useState(0);
    const [allRates, setAllRates] = useState(null);

    // UI States
    const [showFullConditions, setShowFullConditions] = useState(false);


    // Product State
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productSearchTerms, setProductSearchTerms] = useState({}); // Map of item ID to search term
    const [showProductDropdown, setShowProductDropdown] = useState({}); // Map of item ID to boolean

    const [quoteData, setQuoteData] = useState({
        quote_number: '', // Will be set in useEffect
        companyName: '', // Razón Social
        clientName: '',
        clientEmail: '',
        clientPhone: '', // WhatsApp number
        projectName: '',
        currency: 'CLP', // Default currency
        validUntil: '',
        items: [
            { id: 1, productId: '', description: '', quantity: 1, unitPrice: 0 }
        ],
        notes: '',
        conditions: '',
        internal_notes: ''
    });

    // Update exchangeRate whenever currency or rates change
    useEffect(() => {
        if (!allRates) return;

        if (quoteData.currency === 'CLP') {
            setExchangeRate(1);
        } else if (quoteData.currency === 'USD') {
            setExchangeRate(allRates.CLP);
        } else if (quoteData.currency === 'EUR') {
            const eurToClp = allRates.CLP / allRates.EUR;
            setExchangeRate(eurToClp);
        }
    }, [quoteData.currency, allRates]);

    const getInitials = (name) => {
        if (!name) return 'XX';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    useEffect(() => {
        if (profile) {
            // Only set quote number if it's empty (new quote)
            if (!quoteData.quote_number) {
                const initials = getInitials(profile.full_name || profile.email);
                const datePart = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                const randomPart = Math.floor(Math.random() * 1000);
                const newQuoteNumber = `COT-${initials}-${datePart}-${randomPart}`;

                // Auto-load salesperson data from profile
                setQuoteData(prev => ({
                    ...prev,
                    quote_number: newQuoteNumber,
                    salesPerson: profile.full_name || 'N/A',
                    salesEmail: profile.email || 'N/A',
                    salesPhone: profile.phone || 'N/A'
                }));
            }

            if (profile.organization_id) {
                fetchProducts();
                fetchOrganizationLogo();
                fetchHeaderBorderColor();
            }
        }
    }, [profile, isOnline]);

    // Helper to generate quote number
    const generateQuoteNumber = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const initials = getInitials(profile?.full_name || 'G S');
        return `COT-${initials}-${year}${month}-${random}`;
    };

    // Load Default Settings (Logo and Terms)
    useEffect(() => {
        console.log("⚡ Effect Triggered for Settings", { profile });

        const loadSettings = async () => {
            setLoadingSettings(true);
            // 1. Fetch User/Company Info
            if (profile) {
                setQuoteData(prev => ({
                    ...prev,
                    salesPerson: profile.full_name || profile.username,
                    salesEmail: profile.email || '',
                    salesPhone: profile.phone || '+56 9 1234 5678'
                }));

                // Fetch Organization Branding
                try {
                    const { data, error } = await supabase
                        .from('organizations')
                        .select('logo_url, brand_color')
                        .eq('id', profile.organization_id || '00000000-0000-0000-0000-000000000000') // Fallback ID if needed
                        .single();

                    if (data) {
                        if (data.logo_url) setOrgLogo(data.logo_url);
                        if (data.brand_color) setHeaderBorderColor(data.brand_color);
                    }
                } catch (e) {
                    console.error("Error loading org settings:", e);
                }

                // 2. Fetch Default Sales Terms (Condiciones)
                try {
                    console.log("🔄 STARTING FETCH: Sales Terms & Logo", {
                        orgId: profile?.organization_id,
                        isOnline,
                        timestamp: new Date().toISOString()
                    });

                    if (profile?.organization_id) {
                        const { data: settingsData, error: settingsError } = await supabase
                            .from('organization_settings')
                            .select('default_sales_conditions, quote_logo_url')
                            .eq('organization_id', profile.organization_id)
                            .eq('organization_id', profile.organization_id)
                            .maybeSingle();

                        if (settingsError) {
                            console.error("❌ Error fetching organization_settings:", settingsError);
                        }

                        console.log("📥 Raw Settings Data:", settingsData);

                        if (settingsData) {
                            // Prefer quote_logo_url if available, otherwise keep existing orgLogo (from organizations table)
                            if (settingsData.quote_logo_url) {
                                console.log("✅ Setting Quote Logo:", settingsData.quote_logo_url);
                                setOrgLogo(settingsData.quote_logo_url);
                            }

                            if (settingsData.default_sales_conditions) {
                                const terms = settingsData.default_sales_conditions;
                                console.log("✅ LOADED CONDITIONS:", terms.substring(0, 50) + "...");

                                // Only update if current conditions are empty or seemingly default/empty
                                setQuoteData(prev => {
                                    const currentConditions = prev.conditions || '';
                                    const isEmpty = !currentConditions || currentConditions === '<p><br></p>' || currentConditions.trim() === '';

                                    if (isEmpty) {
                                        return {
                                            ...prev,
                                            salesTerms: terms,
                                            conditions: terms
                                        };
                                    }
                                    return prev;
                                });
                            }
                        } else {
                            console.warn("⚠️ No settings found (null). Attempting to create default row...");

                            // Self-healing: Create the row if it doesn't exist
                            const { error: insertError } = await supabase
                                .from('organization_settings')
                                .insert([
                                    {
                                        organization_id: profile.organization_id,
                                        default_sales_conditions: '',
                                        quote_logo_url: null
                                    }
                                ]);

                            if (insertError) {
                                console.error("❌ Failed to create default settings row:", insertError);
                            } else {
                                console.log("✅ Created default settings row. Setting empty state.");
                            }

                            setQuoteData(prev => ({
                                ...prev,
                                salesTerms: '',
                                conditions: ''
                            }));
                        }
                    } else {
                        console.warn("⚠️ No organization_id found in profile. Skipping settings fetch.");
                    }
                } catch (e) {
                    console.error("Error loading sales terms:", e);
                } finally {
                    setLoadingSettings(false);
                }
            }
        };

        // Only call if profile exists
        if (profile) {
            loadSettings();
            setQuoteData(prev => ({ ...prev, quote_number: generateQuoteNumber() }));
        }
    }, [profile]);

    const fetchOrganizationLogo = async () => {
        if (!isOnline) return; // Skip if offline
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('logo_url')
                .eq('id', profile.organization_id)
                .single();

            if (data?.logo_url) {
                setOrgLogo(data.logo_url);
            }
        } catch (error) {
            console.error('Error fetching logo:', error);
        }
    };

    const fetchHeaderBorderColor = async () => {
        if (!isOnline) return;
        try {
            const { data, error } = await supabase
                .from('organization_settings')
                .select('quote_header_border_color')
                .eq('organization_id', profile.organization_id)
                .single();

            if (data?.quote_header_border_color) {
                setHeaderBorderColor(data.quote_header_border_color);
            }
        } catch (error) {
            console.error('Error fetching header border color:', error);
        }
    };

    const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
            if (isOnline) {
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .eq('organization_id', profile.organization_id)
                    .eq('is_active', true)
                    .order('name');
                if (error) throw error;
                setProducts(data || []);
                cacheProducts(data || []); // Cache for offline use
            } else {
                const cached = getCachedProducts();
                setProducts(cached);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            const cached = getCachedProducts();
            setProducts(cached);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleClientSelect = (client) => {
        setSelectedPipedriveClient(client);

        console.log('📦 Client selected raw data:', JSON.stringify(client, null, 2));

        // --- 1. EXTRACT DATA FROM CUSTOM FIELDS (Organization Logic) ---
        // Organizations in Pipedrive store Email/Phone in Custom Fields, not standard fields.
        let foundRut = '';
        let foundEmail = '';
        let foundPhone = '';
        let foundCity = '';

        if (client.customFields) {
            const keys = Object.keys(client.customFields);

            // Scan ALL custom fields for data patterns
            keys.forEach(key => {
                const lowerKey = key.toLowerCase(); // To check field NAME helper (if available in key strings, usually it's hash)
                // Note: keys in search response usually are hashes, but sometimes Pipedrive adapter maps them.
                // We rely on VALUE patterns or if the key itself happens to be verbose.

                const val = client.customFields[key];
                if (!val || typeof val !== 'string') return;

                // A. RUT SCANNER (More flexible Regex)
                // Matches: 12.345.678-9, 12345678-9, 12.345.678 - 9, etc.
                if (val.match(/^(\d{1,3}(\.?\d{3}){2})\s?[-–]\s?([0-9kK])$/) || val.match(/^\d{7,9}[-–]?[0-9kK]$/)) {
                    if (!foundRut) foundRut = val.replace(/\s/g, ''); // Clean spaces
                }

                // B. EMAIL SCANNER
                if (val.includes('@') && val.includes('.')) {
                    if (!val.includes('pipedrivemail.com')) {
                        if (!foundEmail) foundEmail = val;
                    }
                }

                // C. PHONE SCANNER
                const cleanPhone = val.replace(/[^0-9+]/g, '');
                if (cleanPhone.length >= 8 && (val.includes('+') || val.match(/^[0-9\s-]{8,}$/))) {
                    if (!foundPhone) foundPhone = val;
                }

                // D. CITY / COMUNA SCANNER
                // Check if value looks like a city/address (contains 'Chile', 'Region', 'Comuna')
                if (typeof val === 'string' && (val.includes('Chile') || lowerKey.includes('comuna') || lowerKey.includes('region') || lowerKey.includes('ciudad') || lowerKey.includes('city'))) {
                    // Avoid taking the RUT or Email by mistake if they contain these words (unlikely but safe)
                    if (!val.includes('@') && !val.match(/\d{3}\./)) {
                        if (!foundCity) foundCity = val;
                    }
                }
            });
        }

        // --- 2. FALLBACK TO STANDARD FIELDS ---
        let finalRut = foundRut || client.rut || '';
        let finalEmail = foundEmail || client.email || '';
        let finalPhone = foundPhone || client.phone || '';

        // CITY: Prioritize found Custom Field -> Then Pipedrive Standard Address -> Then 'formatted_address' -> Then internal 'city'
        let finalCity = foundCity || client.city || client.comuna || client.address || client.formatted_address || '';

        // Clean up City if it's an object (sometimes Pipedrive returns object for address)
        if (typeof finalCity === 'object') {
            finalCity = finalCity.value || finalCity.formatted_address || '';
        }

        // If standard email is the internal one, wipe it if we didn't find a custom one
        if (finalEmail.includes('pipedrivemail.com')) {
            finalEmail = '';
        }

        // --- 3. NAME INTELLIGENCE ---
        let finalClientName = client.name;
        let finalCompanyName = client.company || client.name;

        // If selected item is an Organization, Name usually = Company.
        // We want 'Client Name' to be the PERSON (Contact).

        // NEW LOGIC: Use contactName fetched from backend (Related Person to Org)
        if (client.contactName) {
            finalClientName = client.contactName;
        } else if (client.type === 'organization' || finalClientName === finalCompanyName || finalClientName.includes(finalCompanyName)) {
            // Fallback: clear if it's just the company name and we have no contact person
            finalClientName = '';
        }

        // Clean placeholder
        if (finalClientName.toLowerCase() === 'alfapack') finalClientName = '';

        console.log('✅ Final Extracted Data:', { finalRut, finalEmail, finalPhone, finalClientName, finalCity });

        setQuoteData({
            ...quoteData,
            clientName: finalClientName,
            clientEmail: finalEmail,
            clientPhone: finalPhone,
            clientRut: finalRut || quoteData.clientRut || '',
            clientCity: finalCity,
            internal_notes: client.notes || quoteData.internal_notes || ''
        });
    };
    const addItem = () => {
        const newItem = {
            id: Date.now(),
            productId: '',
            description: '',
            quantity: 1,
            unitPrice: 0
        };
        setQuoteData({
            ...quoteData,
            items: [...quoteData.items, newItem]
        });
    };

    const removeItem = (id) => {
        setQuoteData({
            ...quoteData,
            items: quoteData.items.filter(item => item.id !== id)
        });
        // Cleanup search state
        const newSearchTerms = { ...productSearchTerms };
        delete newSearchTerms[id];
        setProductSearchTerms(newSearchTerms);
    };

    const updateItem = (id, field, value) => {
        let updatedItems = quoteData.items.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        });

        setQuoteData({
            ...quoteData,
            items: updatedItems
        });
    };

    const selectProduct = (itemId, product) => {
        // Guardar TODA la información del producto en el item
        const updatedItems = quoteData.items.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    productId: product.id,
                    description: product.name,
                    unitPrice: product.unit_price,
                    // Información adicional del producto
                    productModel: product.model || '',
                    productSku: product.sku || '',
                    productCategory: product.category || '',
                    productTechnicalSpecs: product.technical_specs || '',
                    productDescription: product.description || '',
                    productMainImage: product.main_image || '',
                    productVideoUrl: product.video_url || '',
                    productCurrency: product.currency || 'CLP'
                };
            }
            return item;
        });

        setQuoteData({ ...quoteData, items: updatedItems });

        // Update search term to match selected product
        setProductSearchTerms(prev => ({ ...prev, [itemId]: product.name }));
        setShowProductDropdown(prev => ({ ...prev, [itemId]: false }));
    };

    const updateField = (field, value) => {
        setQuoteData({ ...quoteData, [field]: value });
    };

    const calculateSubtotal = () => {
        return quoteData.items.reduce((sum, item) => {
            return sum + (item.quantity * item.unitPrice);
        }, 0);
    };

    const calculateTax = () => {
        return calculateSubtotal() * 0.19; // 19% IVA
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTax();
    };

    const handleSaveDraft = async () => {
        setSaving(true);
        try {
            const quoteToSave = {
                ...quoteData,
                status: 'draft',
                subtotal: calculateSubtotal(),
                tax: calculateTax(),
                total: calculateTotal(),
                currency: quoteData.currency,
                exchangeRate: exchangeRate
            };

            if (isOnline) {
                if (id) {
                    await updateQuote(id, quoteToSave);
                    alert('Borrador actualizado exitosamente.');
                } else {
                    await addQuote(quoteToSave);
                    alert('Borrador guardado en la nube.');
                }
            } else {
                saveOfflineQuote(quoteToSave);
                alert('Borrador guardado localmente. Se sincronizará cuando recuperes la conexión.');
            }

            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                navigate('/quotes');
            }, 1500);
        } catch (error) {
            console.error('Error saving draft:', error);
            alert('Error al guardar el borrador.');
        } finally {
            setSaving(false);
        }
    };

    const handleSendToClient = async () => {
        if (!isOnline) {
            alert('No puedes enviar cotizaciones sin conexión a internet. Guárdala como borrador y envíala cuando te conectes.');
            return;
        }

        try {
            setSaving(true);
            let finalQuote;
            const quoteToSave = {
                ...quoteData,
                status: 'pending',
                subtotal: calculateSubtotal(),
                tax: calculateTax(),
                total: calculateTotal(),
                currency: quoteData.currency,
                exchangeRate: exchangeRate
            };

            if (id) {
                await updateQuote(id, quoteToSave);
                // Construct the object for email sending
                finalQuote = { ...quoteToSave, id };
            } else {
                finalQuote = await addQuote(quoteToSave);
            }

            if (sendEmail && finalQuote) {
                const emailResult = await sendQuoteEmail(finalQuote, emailMessage);
                if (!emailResult.success) {
                    console.error('Failed to send email:', emailResult.error);
                    alert(`Cotización creada, pero hubo un error al enviar el email: ${emailResult.error}`);
                }
            }

            if (sendWhatsapp && quoteData.clientPhone && newQuote) {
                const cleanPhone = quoteData.clientPhone.replace(/[^0-9+]/g, '');
                const quoteUrl = `${window.location.origin}/microsite/${newQuote.id}`;

                let pdfUrl = '';
                try {
                    // Generate PDF Blob for sharing
                    const pdfBlob = await generateQuotePDF(
                        {
                            ...quoteData,
                            id: newQuote.id,
                            quote_number: newQuote.quote_number || newQuote.quote_number,
                            subtotal: calculateSubtotal(),
                            tax: calculateTax(),
                            total: calculateTotal()
                        },
                        headerBorderColor,
                        pdfTemplate,
                        true // returnBlob = true
                    );

                    if (pdfBlob) {
                        const fileName = `${newQuote.quote_number || newQuote.id}.pdf`;
                        const filePath = `pdfs/${fileName}`;

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
                            pdfUrl = publicUrl;
                        } else {
                            console.error("Storage Error:", uploadError);
                        }
                    }
                } catch (pdfErr) {
                    console.error("Error creating/uploading PDF for WhatsApp:", pdfErr);
                }

                const message = `Hola ${quoteData.clientName}! 👋\n\nTe comparto la cotización para ${quoteData.projectName}.\n\n📄 Ver PDF: ${pdfUrl || '(Error en PDF)'}\n🌐 Ver en Micrositio: ${quoteUrl}\n\n¡Saludos!`;
                const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
            }

            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                navigate('/quotes');
            }, 1500);
        } catch (error) {
            console.error('Error sending quote:', error);
            alert('Error al enviar la cotización. Por favor, intenta nuevamente.');
        } finally {
            setSaving(false);
        }
    };

    // Filter products based on search term (Name, SKU, Model)
    const getFilteredProducts = (term) => {
        if (!term) return products;
        const cleanTerm = term.toLowerCase().replace(/[^a-z0-9]/g, '');
        const terms = term.toLowerCase().split(' ').filter(t => t.length > 0);

        return products.filter(p => {
            const cleanName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanModel = (p.model || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanSku = (p.sku || '').toLowerCase().replace(/[^a-z0-9]/g, '');

            // Try exact word match first
            const matchesWords = terms.every(t =>
                p.name.toLowerCase().includes(t) ||
                (p.sku && p.sku.toLowerCase().includes(t)) ||
                (p.model && p.model.toLowerCase().includes(t))
            );

            if (matchesWords) return true;

            // Fallback: match clean strings (helps with "DP 1000" vs "DP1000")
            return cleanName.includes(cleanTerm) ||
                cleanModel.includes(cleanTerm) ||
                cleanSku.includes(cleanTerm);
        });
    };

    return (
        <div className="space-y-6">

            {/* Offline Indicator */}
            {!isOnline && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
                    <div className="flex items-center">
                        <WifiOff className="text-yellow-500 mr-2" size={20} />
                        <div>
                            <p className="font-bold text-yellow-700">Modo Sin Conexión</p>
                            <p className="text-sm text-yellow-600">
                                Estás trabajando offline. Los cambios se guardarán localmente y se sincronizarán cuando recuperes la conexión.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Message */}
            {showSuccess && (
                <div className="fixed top-4 right-4 z-50 bg-white border-2 border-green-500 p-4 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in">
                    <CheckCircle className="text-green-500" size={24} />
                    <div>
                        <p className="text-petrol-800 font-semibold">¡Cotización guardada!</p>
                        <p className="text-sm text-gray-600">Redirigiendo...</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-4xl font-bold text-petrol-800">
                            {id ? 'Editar Cotización' : 'Nueva Cotización'}
                        </h2>
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-mono rounded-full border border-orange-200">
                            v6.5 ULTRA
                        </span>
                    </div>
                    <p className="text-gray-600 mt-2">Crea una cotización profesional en minutos</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3">
                        <span className="text-xs font-semibold text-gray-500">Formato:</span>
                        <select
                            className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
                            value={pdfTemplate}
                            onChange={(e) => setPdfTemplate(e.target.value)}
                        >
                            <option value="technical">Ficha Técnica (Detallada)</option>
                            <option value="standard">Estándar (Tabla Simple)</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            generateQuotePDF({
                                ...quoteData,
                                user_id: profile?.id,
                                organizationLogo: orgLogo,
                                salesPerson: profile?.full_name || profile?.email,
                                salesEmail: profile?.email,
                                salesPhone: profile?.phone || '-'
                            }, headerBorderColor, pdfTemplate);
                        }}
                        className="btn-secondary w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 border-2"
                    >
                        <Eye size={20} />
                        Ver PDF
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            handleSaveDraft();
                        }}
                        disabled={saving}
                        className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={18} />
                        {saving ? 'Guardando...' : 'Guardar Borrador'}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            handleSendToClient();
                        }}
                        disabled={saving || !isOnline}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!isOnline ? "Requiere conexión a internet" : ""}
                    >
                        <Send size={18} />
                        {saving ? 'Enviando...' : 'Enviar al Cliente'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Panel - Form */}
                <div className="space-y-6">
                    {/* Internal Info - Admin Only */}
                    {(isAdmin || isSuperAdmin) && (
                        <div className="glass-panel p-6 rounded-xl border-l-4 border-orange-500">
                            <h3 className="text-xl font-bold text-petrol-800 mb-4">Información Interna (Admin)</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Número de Cotización
                                    </label>
                                    <input
                                        type="text"
                                        className="input-field w-full bg-gray-50"
                                        value={quoteData.quote_number}
                                        onChange={(e) => updateField('quote_number', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Notas Internas
                                    </label>
                                    <textarea
                                        className="input-field w-full min-h-[80px]"
                                        placeholder="Notas privadas para el equipo..."
                                        value={quoteData.internal_notes}
                                        onChange={(e) => updateField('internal_notes', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Client Information */}
                    <div className="glass-panel p-6 rounded-xl">
                        <h3 className="text-xl font-bold text-petrol-800 mb-4">Datos del Cliente / Empresa</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Cliente / Contacto</label>
                                <input
                                    type="text"
                                    className="input-field w-full"
                                    placeholder="Nombre completo"
                                    value={quoteData.clientName}
                                    onChange={(e) => updateField('clientName', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Razón Social (Opcional)</label>
                                <input
                                    type="text"
                                    className="input-field w-full"
                                    placeholder="Nombre de la empresa"
                                    value={quoteData.companyName}
                                    onChange={(e) => updateField('companyName', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">RUT Empresa (Opcional)</label>
                                <input
                                    type="text"
                                    className="input-field w-full"
                                    placeholder="12.345.678-9"
                                    value={quoteData.clientRut || ''}
                                    onChange={(e) => updateField('clientRut', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Ciudad / Comuna</label>
                                <input
                                    type="text"
                                    className="input-field w-full"
                                    placeholder="Ej: Santiago, Las Condes"
                                    value={quoteData.clientCity || ''}
                                    onChange={(e) => updateField('clientCity', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Email del Cliente</label>
                                <input
                                    type="email"
                                    className="input-field w-full"
                                    placeholder="cliente@ejemplo.com"
                                    value={quoteData.clientEmail}
                                    onChange={(e) => updateField('clientEmail', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono / WhatsApp</label>
                                <input
                                    type="tel"
                                    className="input-field w-full"
                                    placeholder="+56 9 1234 5678"
                                    value={quoteData.clientPhone}
                                    onChange={(e) => updateField('clientPhone', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Campos comunes (Proyecto, Fecha, Moneda) */}
                    <div className="glass-panel p-6 rounded-xl">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Nombre del Proyecto
                                </label>
                                <input
                                    type="text"
                                    className="input-field w-full"
                                    placeholder="Ej: Línea de envasado de vegetales"
                                    value={quoteData.projectName}
                                    onChange={(e) => updateField('projectName', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Válida Hasta
                                </label>
                                <input
                                    type="date"
                                    className="input-field w-full"
                                    value={quoteData.validUntil}
                                    onChange={(e) => updateField('validUntil', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Moneda
                                </label>
                                <select
                                    className="input-field w-full"
                                    value={quoteData.currency}
                                    onChange={(e) => updateField('currency', e.target.value)}
                                >
                                    <option value="CLP">CLP (Pesos Chilenos)</option>
                                    <option value="USD">USD (Dólares)</option>
                                    <option value="EUR">EUR (Euros)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="glass-panel p-6 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-petrol-800">Items de la Cotización</h3>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    addItem();
                                }}
                                className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-bold transition-colors bg-white px-4 py-2 rounded-lg border-2 border-orange-200 hover:border-orange-500"
                            >
                                <Plus size={20} />
                                Agregar Producto / Servicio
                            </button>
                        </div>

                        <div className="space-y-4">
                            {quoteData.items.map((item, index) => (
                                <div key={item.id} className="bg-beige-100 p-4 rounded-lg border border-gray-200">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className="text-xs font-semibold text-gray-600">Item #{index + 1}</span>
                                        {quoteData.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    removeItem(item.id);
                                                }}
                                                className="text-red-500 hover:text-red-700 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {/* Product Search */}
                                        <div className="relative">
                                            <label className="block text-xs text-gray-600 mb-1 font-semibold">Buscar Producto</label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                                <input
                                                    type="text"
                                                    className="input-field w-full pl-9 text-sm"
                                                    placeholder="Buscar por nombre, SKU o modelo..."
                                                    value={productSearchTerms[item.id] || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setProductSearchTerms(prev => ({ ...prev, [item.id]: val }));
                                                        setShowProductDropdown(prev => ({ ...prev, [item.id]: true }));
                                                    }}
                                                    onFocus={() => setShowProductDropdown(prev => ({ ...prev, [item.id]: true }))}
                                                />
                                            </div>

                                            {/* Dropdown Results */}
                                            {showProductDropdown[item.id] && (productSearchTerms[item.id] || '').length > 0 && (
                                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                    {getFilteredProducts(productSearchTerms[item.id]).length > 0 ? (
                                                        getFilteredProducts(productSearchTerms[item.id]).map(p => (
                                                            <button
                                                                type="button"
                                                                key={p.id}
                                                                className="w-full text-left px-4 py-2 hover:bg-orange-50 text-sm flex justify-between items-center"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    selectProduct(item.id, p);
                                                                }}
                                                            >
                                                                <div>
                                                                    <div className="font-medium">{p.name}</div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {p.model && `Modelo: ${p.model} | `}
                                                                        {p.sku && `SKU: ${p.sku}`}
                                                                    </div>
                                                                </div>
                                                                <span className="text-gray-500 font-medium">
                                                                    {quoteData.currency === 'CLP' ? '$' : quoteData.currency === 'EUR' ? '€' : '$'}
                                                                    {p.unit_price}
                                                                </span>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-2 text-sm text-gray-500">No se encontraron productos</div>
                                                    )}
                                                </div>
                                            )}
                                            {/* Overlay to close dropdown */}
                                            {showProductDropdown[item.id] && (
                                                <div
                                                    className="fixed inset-0 z-0"
                                                    onClick={() => setShowProductDropdown(prev => ({ ...prev, [item.id]: false }))}
                                                ></div>
                                            )}
                                        </div>

                                        <input
                                            type="text"
                                            className="input-field w-full text-sm"
                                            placeholder="Descripción del servicio o producto"
                                            value={item.description}
                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1 font-semibold">Cantidad</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="input-field w-full text-sm"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1 font-semibold">Precio Unitario ({quoteData.currency} + IVA)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="input-field w-full text-sm"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t border-gray-300">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-600 font-semibold">Subtotal Item:</span>
                                                <span className="text-sm font-bold text-petrol-800">
                                                    {quoteData.currency === 'CLP' ? '$' : quoteData.currency === 'EUR' ? '€' : '$'}
                                                    {(item.quantity * item.unitPrice).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Conditions (Rich Text) */}
                    <div className="glass-panel p-6 rounded-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-petrol-800">Condiciones de Venta</h3>
                            {profile?.role !== 'admin' && profile?.role !== 'super_admin' && (
                                <span className="text-xs flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                    <Lock size={12} /> Protegido por Admin
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Forma de Pago</label>
                                <input
                                    type="text"
                                    className="input-field w-full"
                                    placeholder="Ej: 50% anticipo, 50% contra entrega"
                                    value={quoteData.paymentTerms || ''}
                                    onChange={(e) => updateField('paymentTerms', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Disponibilidad / Entrega</label>
                                <input
                                    type="text"
                                    className="input-field w-full"
                                    placeholder="Ej: Inmediata / 15 días hábiles"
                                    value={quoteData.deliveryTime || ''}
                                    onChange={(e) => updateField('deliveryTime', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Collapsible Container for Conditions Input */}
                        <div className={`relative transition-all duration-300 ${showFullConditions ? 'h-auto' : 'h-32 overflow-hidden'}`}>
                            <div className={profile?.role !== 'admin' && profile?.role !== 'super_admin' ? 'opacity-70 pointer-events-none' : ''}>
                                <RichTextEditor
                                    value={quoteData.conditions}
                                    onChange={(val) => updateField('conditions', val)}
                                    placeholder={loadingSettings ? "Cargando condiciones..." : "Escribe las condiciones de venta aquí (o configúralas en Ajustes)..."}
                                    readOnly={profile?.role !== 'admin' && profile?.role !== 'super_admin'}
                                />
                            </div>

                            {/* Gradient Overlay */}
                            {!showFullConditions && (
                                <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                            )}
                        </div>

                        {/* Toggle Button */}
                        <div className="flex justify-center -mt-3 relative z-10 mb-6">
                            <button
                                onClick={() => setShowFullConditions(!showFullConditions)}
                                className="text-xs font-bold text-petrol-600 bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm hover:bg-gray-50 flex items-center gap-1 transition-colors"
                            >
                                {showFullConditions ? 'Ver menos' : 'Ver condiciones completas'}
                                {showFullConditions ? <Lock size={10} className="inline" /> : <Lock size={10} className="inline" />}
                            </button>
                        </div>

                        {/* Notes */}
                        <div className="glass-panel p-6 rounded-xl mb-8">
                            <h3 className="text-xl font-bold text-petrol-800 mb-4">Notas Adicionales</h3>
                            <textarea
                                className="input-field w-full min-h-[100px] resize-none"
                                placeholder="Información adicional simple..."
                                value={quoteData.notes}
                                onChange={(e) => updateField('notes', e.target.value)}
                            />
                        </div>

                        {/* Email Options */}
                        <div className="glass-panel p-6 rounded-xl border-2 border-orange-200">
                            <div className="flex items-center gap-3 mb-4">
                                <Mail className="text-orange-500" size={24} />
                                <h3 className="text-xl font-bold text-petrol-800">Opciones de Envío</h3>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={sendEmail}
                                        onChange={(e) => setSendEmail(e.target.checked)}
                                        className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                                    />
                                    <span className="text-gray-700 font-medium">
                                        Enviar cotización por email al cliente
                                    </span>
                                </label>

                                {sendEmail && (
                                    <div className="pl-8 pt-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Mensaje personalizado (opcional)
                                        </label>
                                        <textarea
                                            className="input-field w-full min-h-[80px] resize-none text-sm"
                                            placeholder="Ej: Hola! Adjunto encontrarás la cotización solicitada. Quedo a tu disposición para cualquier consulta..."
                                            value={emailMessage}
                                            onChange={(e) => setEmailMessage(e.target.value)}
                                        />
                                        <p className="text-xs text-gray-500 mt-2">
                                            El email incluirá un link al micrositio donde el cliente podrá ver y aceptar/rechazar la cotización.
                                        </p>
                                    </div>
                                )}

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={sendWhatsapp}
                                        onChange={(e) => setSendWhatsapp(e.target.checked)}
                                        disabled={!quoteData.clientPhone}
                                        className="w-5 h-5 text-green-500 border-gray-300 rounded focus:ring-green-500 disabled:opacity-50"
                                    />
                                    <span className="text-gray-700 font-medium">
                                        Enviar cotización por WhatsApp
                                    </span>
                                </label>

                                {sendWhatsapp && quoteData.clientPhone && (
                                    <div className="pl-8 pt-2">
                                        <p className="text-xs text-gray-500">
                                            Se abrirá WhatsApp Web con un mensaje pre-cargado que incluye el link a la cotización.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Live Preview */}
                <div className="lg:sticky lg:top-8 h-fit space-y-6">
                    {/* Currency Display */}
                    <CurrencyRateDisplay onRatesLoaded={(rates) => setAllRates(rates)} />

                    <div className="glass-panel p-8 rounded-xl border-2 border-orange-300 shadow-xl">
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b-2 border-gray-200">
                            <Eye className="text-orange-500" size={20} />
                            <h3 className="text-xl font-bold text-petrol-800">Vista Previa</h3>
                        </div>

                        {/* Preview Header - Company Information */}
                        <div className="mb-6 bg-white border-2 p-6 rounded-lg" style={{ borderColor: headerBorderColor }}>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Left Column - Company Info */}
                                <div className="space-y-2 text-sm">
                                    {/* Logo Place - Always show spot */}
                                    <div className="mb-6 h-20 flex items-center justify-start">
                                        {orgLogo ? (
                                            <img
                                                src={orgLogo}
                                                alt="Logo Empresa"
                                                className="h-full object-contain"
                                            />
                                        ) : (
                                            <div className="h-full w-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400 text-center p-2">
                                                Logo Empresa<br />(Configurable)
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex">
                                        <span className="font-bold w-24 text-petrol-800">Ejecutivo</span>
                                        <span className="text-gray-700">: {quoteData.salesPerson || 'N/A'}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-24 text-petrol-800">Celular</span>
                                        <span className="text-gray-700">: {quoteData.salesPhone || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="font-bold w-24 text-petrol-800 flex-shrink-0">Email</span>
                                        <span className="text-gray-700 text-xs whitespace-nowrap overflow-hidden text-ellipsis">: {quoteData.salesEmail || 'N/A'}</span>
                                    </div>

                                    {/* Divider between Ejecutivo and Cliente info */}
                                    <div className="my-3 border-t-2 border-blue-200 pt-2">
                                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Información del Cliente</span>
                                    </div>

                                    <div className="flex">
                                        <span className="font-bold w-24 text-petrol-800 flex-shrink-0">Empresa</span>
                                        <span className="text-orange-500 font-semibold text-sm truncate">: {quoteData.companyName || quoteData.clientName || 'N/A'}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-24 text-petrol-800">RUT</span>
                                        <span className="text-gray-700">: {quoteData.clientRut || 'N/A'}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-24 text-petrol-800">Contacto</span>
                                        <span className="text-gray-700">: {quoteData.clientName || 'N/A'}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-24 text-petrol-800 flex-shrink-0">Teléfono</span>
                                        <span className="text-gray-700 break-all">: {quoteData.clientPhone || 'N/A'}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-24 text-petrol-800 flex-shrink-0">Email</span>
                                        <span className="text-gray-700 break-all">: {quoteData.clientEmail || 'N/A'}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-24 text-petrol-800 flex-shrink-0">Ciudad</span>
                                        <span className="text-orange-500 break-words">: {quoteData.clientCity || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Right Column - Quote Number and Date */}
                                <div className="text-right space-y-1">
                                    <div className="text-sm">
                                        <span className="font-bold text-petrol-800">Cotización Nº: </span>
                                        <span className="text-gray-700">{quoteData.quote_number || 'XXXXX'}</span>
                                    </div>
                                    <div>
                                        <span className="font-bold text-petrol-800">Fecha: </span>
                                        <span className="text-orange-500 font-semibold">
                                            {new Date().toLocaleDateString('es-CL', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Client Info Preview - Removed since it's now in header */}

                        <div className="mb-6 pb-6 border-b border-gray-200">
                            <p className="text-xs text-gray-500 mb-1 font-semibold">PROYECTO</p>
                            <p className="text-petrol-800 font-bold">
                                {quoteData.projectName || 'Nombre del Proyecto'}
                            </p>
                            {quoteData.validUntil && (
                                <p className="text-sm text-gray-600 mt-1">
                                    Válida hasta: {new Date(quoteData.validUntil).toLocaleDateString('es-AR')}
                                </p>
                            )}
                        </div>

                        {/* Items Preview (Ficha Técnica Style) */}
                        <div className="mb-6">
                            <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">Detalle del Proyecto</p>
                            <div className="space-y-6">
                                {quoteData.items.map((item, index) => (
                                    <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* LEFT COL: Tech Specs */}
                                            <div className="flex-1 space-y-3">
                                                <div className="border-b border-gray-100 pb-2 mb-2">
                                                    <div className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Equipo</div>
                                                    <div className="font-bold text-petrol-800 text-lg leading-tight">{item.description}</div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-gray-500 block text-xs uppercase font-semibold">Modelo</span>
                                                        <span className="font-medium text-gray-800">{item.productModel || '-'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 block text-xs uppercase font-semibold">SKU</span>
                                                        <span className="font-medium text-gray-800">{item.productSku || '-'}</span>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="text-gray-500 block text-xs uppercase font-semibold">Categoría</span>
                                                        <span className="font-medium text-gray-800">{item.productCategory || '-'}</span>
                                                    </div>
                                                </div>

                                                {item.productDescription && (
                                                    <div className="mt-2 text-sm text-gray-600 italic leading-relaxed">
                                                        <div dangerouslySetInnerHTML={{ __html: item.productDescription }} />
                                                    </div>
                                                )}

                                                {item.productTechnicalSpecs && (
                                                    <div className="mt-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                        <span className="text-xs text-orange-600 font-bold uppercase mb-2 block tracking-wider">Especificaciones</span>
                                                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                                                            {(() => {
                                                                // Format Helper
                                                                let text = item.productTechnicalSpecs.replace(/<[^>]*>?/gm, '');
                                                                const keywords = [
                                                                    'Ancho', 'Largo', 'Alto', 'Altura', 'Velocidad', 'Voltaje',
                                                                    'Potencia', 'Peso', 'Capacidad', 'Producción', 'Dimensiones',
                                                                    'Permite', 'Cuerpo', 'Motor', 'Estructura'
                                                                ];
                                                                const regex = new RegExp(`(${keywords.join('|')})`, 'g');
                                                                if (!text.includes('•') && !text.includes('\n')) {
                                                                    text = text.replace(regex, '\n• $1');
                                                                }
                                                                return text.trim();
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Video Link */}
                                                {item.productVideoUrl && (
                                                    <a href={item.productVideoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 mt-2">
                                                        ▶ Ver Video de Funcionamiento
                                                    </a>
                                                )}
                                            </div>

                                            {/* RIGHT COL: Image */}
                                            {item.productMainImage && (
                                                <div className="w-full md:w-1/3 flex-shrink-0">
                                                    <div className="rounded-lg border border-gray-100 p-2 bg-white flex items-center justify-center h-full">
                                                        <img src={item.productMainImage} alt={item.description} className="max-h-40 object-contain" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Price Footer for Item */}
                                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                                            <div className="text-right">
                                                <span className="text-xs text-gray-500 mr-2">Valor Unitario:</span>
                                                <span className="text-sm font-bold text-petrol-800">
                                                    {quoteData.currency === 'CLP' ? '$' : quoteData.currency === 'EUR' ? '€' : 'USD'}&nbsp;
                                                    {(item.unitPrice || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Conditions Summary Table (The "Blue Table") */}
                        <div className="mb-6 border border-blue-200 rounded-lg overflow-hidden text-sm">
                            <div className="bg-blue-100 px-4 py-2 font-bold text-blue-900 border-b border-blue-200">
                                Condiciones de Venta
                            </div>
                            <div className="divide-y divide-blue-100 bg-blue-50">
                                <div className="grid grid-cols-3 px-4 py-2">
                                    <div className="font-semibold text-blue-800">Valor del Equipo</div>
                                    <div className="col-span-2 text-blue-900 text-right font-bold">
                                        {quoteData.currency === 'CLP' ? '$' : quoteData.currency === 'EUR' ? '€' : 'USD'}&nbsp;
                                        {(calculateTotal() || 0).toLocaleString()} + IVA
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 px-4 py-2">
                                    <div className="font-semibold text-blue-800">Forma de Pago</div>
                                    <div className="col-span-2 text-blue-900 text-right">{quoteData.paymentTerms || 'A convenir'}</div>
                                </div>
                                <div className="grid grid-cols-3 px-4 py-2">
                                    <div className="font-semibold text-blue-800">Disponibilidad</div>
                                    <div className="col-span-2 text-blue-900 text-right">{quoteData.deliveryTime || 'A confirmar'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Totals Section with Currency Conversion */}
                        <div className="border-t-2 border-gray-200 pt-4 space-y-2">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal:</span>
                                <span>
                                    {quoteData.currency === 'CLP' ? '$' : quoteData.currency === 'EUR' ? '€' : 'USD'}
                                    {(calculateSubtotal() || 0).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>IVA (19%):</span>
                                <span>
                                    {quoteData.currency === 'CLP' ? '$' : quoteData.currency === 'EUR' ? '€' : 'USD'}
                                    {(calculateTax() || 0).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between text-xl font-bold text-petrol-800 pt-2 border-t border-gray-100">
                                <span>Total:</span>
                                <span className="text-orange-600">
                                    {quoteData.currency === 'CLP' ? '$' : quoteData.currency === 'EUR' ? '€' : 'USD'}
                                    {(calculateTotal() || 0).toLocaleString()}
                                </span>
                            </div>

                            {/* CLP Reference Total */}
                            {quoteData.currency !== 'CLP' && exchangeRate > 0 && (
                                <div className="flex justify-between text-sm font-medium text-orange-600 mt-1 italic">
                                    <span>Total Ref. CLP:</span>
                                    <span>
                                        $ {Math.round(calculateTotal() * exchangeRate).toLocaleString('es-CL')}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Sales Terms Legal Preview - Always Visible */}
                        <div className="mt-6 pt-6 border-t border-gray-200 font-serif">
                            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-bold">Condiciones Generales de Venta</p>
                            <div
                                className="text-[10px] text-gray-500 leading-relaxed text-justify conditions-preview"
                                dangerouslySetInnerHTML={{
                                    __html: (quoteData.conditions && quoteData.conditions.length > 10)
                                        ? quoteData.conditions
                                        : (quoteData.salesTerms || 'No se han cargado las condiciones de venta.')
                                }}
                            />
                            {quoteData.notes && (
                                <div className="mt-3 text-[10px] text-gray-500 italic border-l-2 border-orange-300 pl-2 bg-orange-50 p-1">
                                    <span className="font-bold">Notas:</span> {quoteData.notes}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons Bottom */}
                    <div className="flex justify-end gap-3 print:hidden pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                generateQuotePDF({
                                    ...quoteData,
                                    user_id: profile?.id,
                                    organizationLogo: orgLogo,
                                    exchangeRate,
                                    subtotal: calculateSubtotal(),
                                    tax: calculateTax(),
                                    total: calculateTotal(),
                                    salesPerson: profile?.full_name || profile?.email,
                                    salesEmail: profile?.email,
                                    salesPhone: profile?.phone || '-'
                                }, headerBorderColor, pdfTemplate);
                            }}
                            className="btn-secondary flex items-center gap-2"
                            title="Descargar vista previa"
                        >
                            <Eye size={18} />
                            Ver PDF
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                handleSaveDraft();
                            }}
                            disabled={saving}
                            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={18} />
                            {saving ? 'Guardando...' : 'Guardar Borrador'}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                handleSendToClient();
                            }}
                            disabled={saving || !isOnline}
                            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!isOnline ? "Requiere conexión a internet" : ""}
                        >
                            <Send size={18} />
                            {saving ? 'Enviando...' : 'Enviar al Cliente'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuoteBuilder;
