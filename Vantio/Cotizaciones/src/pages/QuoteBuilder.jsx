import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Trash2, Save, Send, Eye, CheckCircle, MessageSquare, Briefcase, Calendar, Lock, Shield,
    ChevronDown, ChevronUp, History, Settings, UserCheck, PlusCircle, AlertCircle, Mail, Search, Building2, User, WifiOff, Wifi
} from 'lucide-react';
import CreateClientModal from '../components/CreateClientModal';
import { useQuotes } from '../context/QuoteContext';
import { useNavigate, useParams } from 'react-router-dom';
import { sendQuoteEmail } from '../utils/emailService';
import { useRole } from '../hooks/useRole';
import CurrencyRateDisplay from '../components/CurrencyRateDisplay';
import RichTextEditor from '../components/RichTextEditor';
import { generateQuotePDF } from '../utils/pdfGeneratorV6';
import { supabase } from '../lib/supabase';
import { useOffline } from '../context/OfflineContext';
import { crmService } from '../services/crmService';
import { pipedriveService } from '../services/pipedriveService';

const QuoteBuilder = () => {
    const { id } = useParams();
    const { isAdmin, isSuperAdmin, profile, role } = useRole();
    const { addQuote, getQuoteById, updateQuote } = useQuotes();
    const { isOnline, saveOfflineQuote, cacheProducts, getCachedProducts } = useOffline();
    const navigate = useNavigate();

    const [quoteData, setQuoteData] = useState({
        quote_number: '', // Will be set in useEffect
        companyName: '', // Razón Social
        clientName: '',
        clientEmail: '',
        clientPhone: '', // WhatsApp number
        projectName: '',
        currency: 'USD', // Default currency
        validUntil: '',
        items: [
            { id: 1, productId: '', description: '', quantity: 1, unitPrice: 0 }
        ],
        notes: '',
        conditions: '',
        internal_notes: ''
    });

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
                        currency: existingQuote.currency || 'USD',
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]); // Only run on mount or ID change to avoid overwriting unsaved edits

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
    const [orgInfo, setOrgInfo] = useState({ name: 'Alfapack', logo_url: null });
    const [loading, setLoading] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(false); // Start false to avoid stuck loading state
    const [headerBorderColor, setHeaderBorderColor] = useState('#6B7280'); // Default gray
    const [pdfTemplate, setPdfTemplate] = useState('technical'); // 'technical' | 'standard'

    // Currency Exchange State
    const [exchangeRate, setExchangeRate] = useState(0);
    const [allRates, setAllRates] = useState(null);

    // Sync exchange rate when rates or currency changes
    useEffect(() => {
        if (allRates && quoteData.currency) {
            console.log("💱 Syncing Exchange Rate Content:", { currency: quoteData.currency, rates: allRates });
            if (quoteData.currency === 'USD') {
                setExchangeRate(allRates.CLP || 0);
            } else if (quoteData.currency === 'EUR') {
                const eurToClp = (allRates.CLP / allRates.EUR) || 0;
                setExchangeRate(eurToClp);
            } else {
                setExchangeRate(0);
            }
        }
    }, [allRates, quoteData.currency]);

    // UI States
    const [showFullConditions, setShowFullConditions] = useState(false);
    const [showCreateClientModal, setShowCreateClientModal] = useState(false);


    // Product State
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productSearchTerms, setProductSearchTerms] = useState({}); // Map of item ID to search term
    const [showProductDropdown, setShowProductDropdown] = useState({}); // Map of item ID to boolean

    // Pipedrive Client Search State
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [pipedriveClients, setPipedriveClients] = useState([]);
    const [isSearchingClients, setIsSearchingClients] = useState(false);
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [selectedPipedriveClient, setSelectedPipedriveClient] = useState(null);
    const [salesTermsTemplates, setSalesTermsTemplates] = useState({});

    // Debounced Pipedrive Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (clientSearchTerm.length >= 1 && profile?.organization_id && isOnline) {
                setIsSearchingClients(true);
                try {
                    const result = await crmService.searchClients(profile.organization_id, clientSearchTerm);
                    if (result.success) {
                        setPipedriveClients(result.clients);
                    }
                } catch (error) {
                    console.error('Error searching Pipedrive clients:', error);
                    // Add visual feedback or retry logic if needed
                } finally {
                    setIsSearchingClients(false);
                }
            } else {
                setPipedriveClients([]);
            }
        }, 20); // Much faster debounce (20ms instead of 150ms) to feel "instant"

        return () => clearTimeout(delayDebounceFn);
    }, [clientSearchTerm, profile?.organization_id, isOnline]);

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
                const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
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
                fetchOrganizationInfo();
                fetchHeaderBorderColor();
            }
        }
    }, [profile, isOnline]);

    // --- AUTO-SAVE LOGIC (DISABLED AS REQUESTED) ---
    /*
    useEffect(() => {
        if (!isOnline || !profile || !profile.organization_id) return;

        console.log("⏱️ Auto-save timer started (1 min)");
        const autoSaveInterval = setInterval(() => {
            // Check if quote has meaningful data before saving
            const hasData = quoteData.clientName || quoteData.projectName || (quoteData.items.length > 0 && quoteData.items[0].description);
            if (!hasData) {
                console.log("⏱️ Auto-save skipped: Quote is empty");
                return;
            }

            console.log("⏱️ Auto-saving draft...");
            handleSaveDraft();
        }, 60 * 1000); // 1 minute

        return () => {
            console.log("⏱️ Auto-save timer cleared");
            clearInterval(autoSaveInterval);
        };
    }, [isOnline, profile]);
    */

    // Helper to generate quote number
    const generateQuoteNumber = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const initials = getInitials(profile?.full_name || 'GS');
        return `COT-${initials}-${year}${month}-${random}`;
    };

    // Load Default Settings (Logo and Terms)
    useEffect(() => {
        const loadSettings = async () => {
            if (!profile?.organization_id) return;

            setLoadingSettings(true);
            try {
                // 1. Set salesperson info from profile
                setQuoteData(prev => ({
                    ...prev,
                    salesPerson: profile.full_name || profile.username || 'Ejecutivo',
                    salesEmail: profile.email || '',
                    salesPhone: profile.phone || '+56 9 1234 5678'
                }));

                // 2. Fetch Organization Settings
                console.log("🔄 STARTING FETCH: Sales Terms & Logo", {
                    orgId: profile.organization_id,
                    isOnline
                });


                const { data: settingsData, error: settingsError } = await supabase
                    .from('organization_settings')
                    .select('default_sales_conditions, quote_logo_url, show_sku_in_quotes, default_payment_terms, default_delivery_time, sales_terms_templates')
                    .eq('organization_id', profile.organization_id)
                    .maybeSingle();

                if (settingsError) throw settingsError;

                if (settingsData) {
                    console.log("📥 Loaded Settings Data:", settingsData);

                    // Unified logo loading: prioritize quote_logo_url
                    const effectiveLogo = settingsData.quote_logo_url;
                    if (effectiveLogo) {
                        setOrgLogo(effectiveLogo);
                    } else {
                        // Fallback to basic organization logo
                        fetchOrganizationLogo();
                    }

                    if (settingsData.default_sales_conditions) {
                        const terms = settingsData.default_sales_conditions;
                        setQuoteData(prev => {
                            const currentConditions = prev.conditions || '';
                            const isEmpty = !currentConditions || currentConditions === '<p><br></p>' || currentConditions.trim() === '';

                            return {
                                ...prev,
                                salesTerms: terms,
                                conditions: isEmpty ? terms : prev.conditions,
                                paymentTerms: prev.paymentTerms || settingsData.default_payment_terms || '',
                                deliveryTime: prev.deliveryTime || settingsData.default_delivery_time || '',
                                showSkuInQuotes: settingsData.show_sku_in_quotes !== undefined ? settingsData.show_sku_in_quotes : true
                            };
                        });
                    }

                    if (settingsData.sales_terms_templates) {
                        setSalesTermsTemplates(settingsData.sales_terms_templates);
                    }
                } else {
                    console.warn("⚠️ No organization settings found.");
                }
            } catch (e) {
                console.error("❌ Error loading settings:", e);
            } finally {
                setLoadingSettings(false);
            }
        };

        if (profile) {
            loadSettings();
            // Generate initial quote number if empty
            setQuoteData(prev => {
                if (!prev.quote_number) {
                    return { ...prev, quote_number: generateQuoteNumber() };
                }
                return prev;
            });

            if (profile.organization_id) {
                fetchProducts();
                fetchHeaderBorderColor();
            }
        }
    }, [profile, id]);

    const fetchOrganizationInfo = async () => {
        if (!isOnline || !profile?.organization_id) return;
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('name, logo_url')
                .eq('id', profile.organization_id)
                .single();

            if (data) {
                setOrgInfo({
                    name: data.name || 'Alfapack',
                    logo_url: data.logo_url
                });
                if (data.logo_url) setOrgLogo(data.logo_url);
            }
        } catch (error) {
            console.error('Error fetching organization info:', error);
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

    const handleClientSelect = (selectedOption) => {
        if (!selectedOption) return;

        console.log('🎯 Selecting client:', selectedOption);

        // Reset search term and hide dropdown
        setClientSearchTerm(selectedOption.name || '');
        setShowClientDropdown(false);

        // If it's a CRM/Pipedrive client, we already have most data in selectedOption
        if (selectedOption.source === 'pipedrive' || selectedOption.source === 'crm' || selectedOption.pipedriveId) {

            // Initial extraction from standard fields
            let clientRut = selectedOption.rut || '';
            let clientCity = selectedOption.city || '';
            let clientAddress = selectedOption.address || '';

            // Collection of values to strictly IGNORE (Ids, timestamps, etc)
            const blockedValues = [
                selectedOption.id?.toString(),
                selectedOption.value?.toString(),
                selectedOption.pipedriveId?.toString(),
                'null', 'undefined'
            ].filter(Boolean);

            console.log('🚧 Client Select Debug:', { blockedValues, selectedOption });

            // ROBUST DEEP SCAN: Recursively search all properties for Chilean identifiers
            const scanObjectForData = (obj) => {
                if (!obj || typeof obj !== 'object') return;

                Object.keys(obj).forEach(key => {
                    const val = obj[key];
                    if (!val || val === 'null' || val === 'undefined') return;

                    const keyLower = key.toLowerCase();
                    const stringVal = (typeof val === 'object' ? (val.value || val.name || JSON.stringify(val)) : val).toString().trim();

                    // 1. RUT Detection
                    if (!clientRut) {
                        const isRutField = keyLower.includes('rut') || keyLower.includes('tax') || keyLower.includes('identifica') || keyLower.includes('nif') || keyLower.includes('cif') || keyLower.includes('tributario') || keyLower.includes('contribuyente');

                        // Strict check: Only scan generic values if the KEY is suspicious, OR if we are desperate.
                        // BUT explicitly ignore keys that look like internal IDs to avoid mismatched data (like ID 12743138 becoming a phone number)
                        const isInternalId = keyLower === 'id' || keyLower === 'owner_id' || keyLower === 'org_id' || keyLower === 'value' || (keyLower.includes('id') && stringVal.length < 10);

                        // BLACKLIST CHECK: If value matches the known ID, ignore it absolutely
                        // REVERTED: User asked to remove this check.
                        // if (blockedValues.includes(stringVal)) return;

                        const rutMatch = stringVal.match(/(\d[\d\.\-]{6,11}[\d0-9kK])/i);

                        // Only accept if it's explicitly a RUT field, OR if it matches RUT format AND isn't a generic ID
                        // RELAXED: Removed strict hyphen check (.includes('-')) because we now rely on blockedValues to catch the ID collision.
                        if (rutMatch && (isRutField || (!isInternalId && stringVal.length < 20))) {
                            // Require a hyphen for "guessed" RUTs to avoid matching plain IDs like 12743138
                            clientRut = rutMatch[1];
                        }
                    }

                    // 2. City/Comuna/Region Detection
                    if (!clientCity || !clientCity.includes(',')) {
                        const isLocalityField = keyLower.includes('comuna') || keyLower.includes('ciudad') || keyLower.includes('city') || keyLower.includes('locality') || keyLower.includes('region') || keyLower.includes('región') || keyLower.includes('estado') || keyLower.includes('state');

                        if (isLocalityField && stringVal.length > 2 && stringVal.length < 60 && !stringVal.includes('{')) {
                            // If we already have a city but this is a region, combine them
                            if (clientCity && (keyLower.includes('region') || keyLower.includes('región')) && !clientCity.includes(stringVal)) {
                                clientCity = `${clientCity}, ${stringVal}`;
                            } else if (!clientCity) {
                                clientCity = stringVal;
                            }
                        }
                    }

                    // 3. Address Detection
                    if (!clientAddress && (keyLower.includes('address') || keyLower.includes('direccion') || keyLower.includes('dirección'))) {
                        if (stringVal.length > 5 && !stringVal.includes('{')) clientAddress = stringVal;
                    }

                    // Recurse into objects
                    if (typeof val === 'object' && val !== null) {
                        scanObjectForData(val);
                    }
                });
            };

            // Run scan
            scanObjectForData(selectedOption);

            // Determine Razón Social vs Contact Name
            const isOrg = selectedOption.type === 'organization';
            const companyName = isOrg ? selectedOption.name : (selectedOption.company || '');
            const contactName = isOrg ? (selectedOption.contactName || '') : selectedOption.name;

            console.log('✅ Deep Scanned Data:', { companyName, contactName, clientRut, clientCity });

            // Priority Email Selection (Avoid Pipedrive generic emails)
            let finalEmail = selectedOption.email || '';
            if (Array.isArray(selectedOption.email)) {
                const betterEmail = selectedOption.email.find(e => e.value && !e.value.includes('pipedrivemail.com'));
                finalEmail = betterEmail ? betterEmail.value : (selectedOption.email[0]?.value || selectedOption.email[0] || '');
            }

            // Priority Phone Selection
            let finalPhone = selectedOption.phone || '';
            if (Array.isArray(selectedOption.phone)) {
                finalPhone = selectedOption.phone[0]?.value || selectedOption.phone[0] || '';
            }

            // FINAL SAFETY VALIDATION
            // If any extracted value matches a blocked ID, purge it immediately.
            // REVERTED: User asked to remove "correction".
            const cleanRut = clientRut; // blockedValues.includes(clientRut) ? '' : clientRut;
            const cleanPhone = finalPhone; // blockedValues.includes(finalPhone) ? '' : finalPhone;
            const cleanEmail = (finalEmail && !finalEmail.includes('pipedrivemail.com') ? finalEmail : '');

            setQuoteData(prev => ({
                ...prev,
                clientName: contactName || prev.clientName || '',
                companyName: companyName || prev.companyName || '',
                clientEmail: cleanEmail || prev.clientEmail || finalEmail || '',
                clientPhone: cleanPhone || prev.clientPhone || '',
                clientRut: cleanRut || prev.clientRut || '',
                clientCity: clientCity || prev.clientCity || '',
                clientAddress: clientAddress || prev.clientAddress || ''
            }));

            // Sync the search input with the most relevant name
            setClientSearchTerm(contactName || companyName || selectedOption.name || '');

        }
        else {
            // Local client
            setQuoteData(prev => ({
                ...prev,
                clientName: selectedOption.name || '',
                companyName: selectedOption.company || '',
                clientEmail: selectedOption.email || '',
                clientPhone: selectedOption.phone || '',
                clientRut: selectedOption.rut || '',
                clientCity: selectedOption.city || '',
                clientAddress: selectedOption.address || ''
            }));
        }

        setSelectedPipedriveClient(selectedOption);
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
                    productMainImage: product.main_image || product.image || product.img_url || product.picture || product.url || product.image_url || '',
                    productVideoUrl: product.video_url || '',
                    productCurrency: product.currency || 'USD'
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
        setQuoteData(prev => ({ ...prev, [field]: value }));
    };

    // Helper to convert URL to Base64 (Essential for PDF Image)
    const getDataUri = async (url) => {
        if (!url) return null;
        console.log("🔄 getDataUri called for:", url);

        const fetchWithRetry = async (targetUrl, isProxy = false) => {
            try {
                const response = await fetch(targetUrl);
                if (!response.ok) throw new Error(`Status ${response.status}`);
                const blob = await response.blob();
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        console.log(isProxy ? "✅ Image converted via Proxy" : "✅ Image converted directly");
                        resolve(reader.result);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                if (!isProxy) {
                    console.warn("⚠️ Direct fetch failed (CORS?), trying proxy...");
                    // Using wsrv.nl as a reliable, free CORS proxy for images
                    const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
                    return fetchWithRetry(proxyUrl, true);
                }
                throw error;
            }
        };

        try {
            return await fetchWithRetry(url);
        } catch (error) {
            console.error("❌ Failed to convert image to Base64 even with proxy:", error);
            // Return null so the PDF generates without the image instead of crashing
            return null;
        }
    };

    const prepareQuoteForPDF = async (finalQuote) => {
        const baseData = {
            ...quoteData,
            id: finalQuote.id,
            quoteNumber: finalQuote.quote_number || finalQuote.quoteNumber || quoteData.quote_number || 'DOC',
            companyName: quoteData.companyName || quoteData.clientName,
            subtotal: calculateSubtotal(),
            tax: calculateTax(),
            total: calculateTotal(),
            exchangeRate: exchangeRate,
            organizationLogo: orgLogo,
            salesPerson: profile?.full_name || profile?.email,
            salesEmail: profile?.email,
            salesPhone: profile?.phone || '-',
            // Ensure properties match what generator expects
            items: quoteData.items
        };

        // Fetch Product Image for PDF
        const imgUrl = quoteData.items?.[0]?.productMainImage;
        if (imgUrl) {
            console.log("📸 Fetching Product Image for PDF:", imgUrl);
            const base64 = await getDataUri(imgUrl);
            if (base64) {
                baseData.productImageBase64 = base64;
                baseData.productImageWidth = 800;
                baseData.productImageHeight = 600;
            }
        }
        return baseData;
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
                companyName: quoteData.companyName,
                clientPhone: quoteData.clientPhone,
                subtotal: calculateSubtotal(),
                tax: calculateTax(),
                total: calculateTotal(),
                currency: quoteData.currency,
                exchangeRate: exchangeRate,
                organization_id: profile?.organization_id,
                // Ensure field naming matches updateQuote expectations
                internalNotes: quoteData.internal_notes,
                paymentTerms: quoteData.paymentTerms,
                deliveryTime: quoteData.deliveryTime,
                validUntil: quoteData.validUntil
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
            console.error('❌ Error saving draft:', error);
            const errMsg = error.message || (typeof error === 'string' ? error : 'Error desconocido');
            alert('Error al guardar el borrador: ' + errMsg);
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
                companyName: quoteData.companyName,
                subtotal: calculateSubtotal(),
                tax: calculateTax(),
                total: calculateTotal(),
                currency: quoteData.currency,
                exchangeRate: exchangeRate,
                organization_id: profile?.organization_id
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
                    alert(`Cotización creada, pero hubo un error al enviar el email: ${emailResult.error} `);
                }
            }

            if (sendWhatsapp && quoteData.clientPhone && finalQuote) {
                const cleanPhone = quoteData.clientPhone.replace(/[^0-9+]/g, '');
                const quoteUrl = `${window.location.origin}/microsite/${finalQuote.id}`;

                let pdfUrl = '';
                try {
                    // Generate PDF Blob for sharing
                    // Generate PDF Blob for sharing (Now with Image!)
                    const enrichedData = await prepareQuoteForPDF(finalQuote);
                    const pdfBlob = await generateQuotePDF(
                        enrichedData,
                        headerBorderColor,
                        pdfTemplate,
                        true // returnBlob=true
                    );

                    if (pdfBlob) {
                        const fileName = `${finalQuote.quote_number || finalQuote.id}.pdf`;
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
            } else if (finalQuote) {
                // AUTO-UPLOAD TO PIPEDRIVE even if NOT sending via WhatsApp
                // Only if sync is enabled
                try {
                    const { data: orgSettings } = await supabase
                        .from('organization_settings')
                        .select('pipedrive_file_sync_enabled')
                        .eq('organization_id', profile.organization_id)
                        .single();

                    if (orgSettings?.pipedrive_file_sync_enabled) {
                        // Generate PDF if not already done
                        const fileName = `${finalQuote.quote_number || finalQuote.id}.pdf`;
                        const filePath = `pdfs/${fileName}`;

                        // Check if it already exists in storage or generate it
                        let pdfUrlToSync = '';

                        // Simplified: always generate/upload to ensure it's fresh
                        const enrichedData = await prepareQuoteForPDF(finalQuote);
                        const pdfBlob = await generateQuotePDF(
                            enrichedData,
                            orgInfo,
                            pdfTemplate,
                            true
                        );

                        if (pdfBlob) {
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
                                pdfUrlToSync = publicUrl;

                                // Call upload to Pipedrive
                                pipedriveService.uploadFile({
                                    fileUrl: pdfUrlToSync,
                                    fileName: `Cotización_${finalQuote.quote_number || finalQuote.id}.pdf`,
                                    quoteId: finalQuote.id,
                                    organizationId: profile.organization_id
                                }).then(res => console.log("📎 Pipedrive file sync result:", res))
                                    .catch(err => console.error("❌ Pipedrive file sync error:", err));
                            }
                        }
                    }
                } catch (syncErr) {
                    console.error("Error in automated Pipedrive file sync:", syncErr);
                }
            }

            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                navigate('/quotes');
            }, 1500);
        } catch (error) {
            console.error('Error sending quote:', error);
            const detail = error.message || error.error_description || (typeof error === 'string' ? error : 'Error desconocido');
            alert('Error al enviar la cotización: ' + detail);
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
                            v6.8 CRM CONNECT
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
                        onClick={async (e) => {
                            e.preventDefault();
                            const enrichedData = await prepareQuoteForPDF({
                                ...quoteData,
                                quoteNumber: quoteData.quote_number || quoteData.quoteNumber,
                                companyName: quoteData.companyName || quoteData.clientName,
                                subtotal: calculateSubtotal(),
                                tax: calculateTax(),
                                total: calculateTotal(),
                                exchangeRate: exchangeRate,
                                user_id: profile?.id,
                                organizationLogo: orgLogo,
                                salesPerson: profile?.full_name || profile?.email,
                                salesEmail: profile?.email,
                                salesPhone: profile?.phone || '-'
                            });

                            generateQuotePDF(enrichedData, orgInfo, pdfTemplate);
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
                    {/* Client Information */}
                    <div className="glass-panel p-6 rounded-xl">
                        <h3 className="text-xl font-bold text-petrol-800 mb-4">Datos del Cliente / Empresa</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Cliente / Contacto</label>
                                <div className="flex gap-2 relative z-50"> {/* Parent relative for full width dropdown */}
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            className="input-field w-full pl-10"
                                            value={clientSearchTerm}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setClientSearchTerm(val);
                                                // Removed: updateField('clientName', val); - Only update on selection
                                                setShowClientDropdown(true);
                                            }}
                                            onFocus={() => setShowClientDropdown(true)}
                                            placeholder="Buscar cliente en CRM o Pipedrive..."
                                        />
                                        {isSearchingClients && (
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}

                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateClientModal(true)}
                                        className="flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-xl font-bold hover:bg-orange-200 transition-all border border-orange-200 whitespace-nowrap"
                                        title="Crear nuevo cliente"
                                    >
                                        <PlusCircle size={20} />
                                        <span className="hidden sm:inline">Nuevo</span>
                                    </button>

                                    {/* DROPDOWN MOVED HERE FOR FULL WIDTH */}
                                    {showClientDropdown && pipedriveClients.length > 0 && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[100]">
                                            {pipedriveClients.map((client) => (
                                                <button
                                                    key={client.id}
                                                    type="button"
                                                    onClick={() => handleClientSelect(client)}
                                                    className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b last:border-0 border-gray-100 group"
                                                >
                                                    <div className="font-semibold text-gray-800 group-hover:text-orange-700">
                                                        {client.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex flex-col gap-0.5 mt-1">
                                                        {client.company && (
                                                            <span className="flex items-center gap-1 font-medium text-gray-600">
                                                                <Building2 size={12} /> {client.company}
                                                            </span>
                                                        )}
                                                        {client.email && (
                                                            <span className="flex items-center gap-1">
                                                                <Mail size={12} /> {client.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                            {isSearchingClients && pipedriveClients.length === 0 && (
                                                <div className="px-4 py-4 text-center text-sm text-gray-500">
                                                    Buscando...
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {/* END DROPDOWN */}
                                </div>
                            </div>
                            {showClientDropdown && (
                                <div
                                    className="fixed inset-0 z-0"
                                    onClick={() => setShowClientDropdown(false)}
                                ></div>
                            )}
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

                    <div className="glass-panel p-6 rounded-xl">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    N° Cotización
                                </label>
                                <input
                                    type="text"
                                    className="input-field w-full bg-gray-50 font-mono"
                                    value={quoteData.quote_number}
                                    onChange={(e) => updateField('quote_number', e.target.value)}
                                />
                            </div>
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
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                removeItem(item.id);
                                            }}
                                            className="text-red-500 hover:text-red-700 transition-colors"
                                            title="Eliminar producto"
                                        >
                                            <Trash2 size={16} />
                                        </button>
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
                            <div className="flex items-center gap-2">
                                {Object.keys(salesTermsTemplates).length > 0 && (
                                    <div className="flex items-center gap-2 mr-4">
                                        <span className="text-xs font-semibold text-gray-500 uppercase">Plantilla:</span>
                                        <select
                                            className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-orange-500"
                                            onChange={(e) => {
                                                const templateKey = e.target.value;
                                                if (templateKey && salesTermsTemplates[templateKey]) {
                                                    updateField('conditions', salesTermsTemplates[templateKey].terms);
                                                }
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Seleccionar plantilla...</option>
                                            {Object.entries(salesTermsTemplates).map(([key, t]) => (
                                                <option key={key} value={key}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {profile?.role !== 'admin' && profile?.role !== 'super_admin' && (
                                    <span className="text-xs flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                        <Lock size={12} /> Protegido por Admin
                                    </span>
                                )}
                            </div>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <div className="glass-panel p-6 rounded-xl">
                                <h3 className="text-xl font-bold text-petrol-800 mb-4 flex items-center gap-2">
                                    Adicionales de condiciones de venta <span className="text-xs font-normal text-gray-400">(Visibles en el PDF)</span>
                                </h3>
                                <textarea
                                    className="input-field w-full min-h-[100px] resize-none"
                                    placeholder="Información adicional que el cliente debe ver..."
                                    value={quoteData.notes}
                                    onChange={(e) => updateField('notes', e.target.value)}
                                />
                            </div>
                            {(isAdmin || role === 'vendedor') && (
                                <div className="glass-panel p-6 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/50">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold text-petrol-800 flex items-center gap-2">
                                            <Lock size={18} className="text-stone-400" /> Información Interna
                                        </h3>
                                        <span className="text-[10px] font-black text-white bg-petrol-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">Solo Equipo</span>
                                    </div>
                                    <textarea
                                        className="input-field w-full min-h-[100px] resize-none bg-white/80"
                                        placeholder="Detalles sobre costos, margen, o notas para el equipo de ventas (No se exporta al PDF)..."
                                        value={quoteData.internal_notes || ''}
                                        onChange={(e) => updateField('internal_notes', e.target.value)}
                                    />
                                    <p className="text-[10px] text-stone-400 mt-2 italic flex items-center gap-1">
                                        <Shield size={10} /> Esta información es estrictamente privada y nunca será enviada al cliente.
                                    </p>
                                </div>
                            )}
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
                                            <div className="h-full w-40 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                                                {orgInfo.name}
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
                                        <span className="text-orange-500 font-bold">: {quoteData.companyName || quoteData.clientName}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-24 text-petrol-800 flex-shrink-0">RUT</span>
                                        <span className="text-gray-700">: {quoteData.clientRut}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-24 text-petrol-800 flex-shrink-0">Contacto</span>
                                        <span className="text-gray-700">: {quoteData.clientName}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-24 text-petrol-800 flex-shrink-0">Teléfono</span>
                                        <span className="text-gray-700">: {quoteData.clientPhone}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-24 text-petrol-800 flex-shrink-0">Email</span>
                                        <span className="text-gray-700 break-all">: {quoteData.clientEmail}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-24 text-petrol-800 flex-shrink-0">Ciudad</span>
                                        <span className="text-orange-500 break-words">: {quoteData.clientCity}</span>
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
                                                        <div dangerouslySetInnerHTML={{ __html: item.productDescription }}></div>
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
                            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-bold underline">Condiciones Generales de la venta</p>
                            <div
                                className="text-[10px] text-gray-500 leading-relaxed text-justify conditions-preview"
                                dangerouslySetInnerHTML={{
                                    __html: (quoteData.conditions && quoteData.conditions.trim() !== '' && quoteData.conditions !== '<p><br></p>')
                                        ? quoteData.conditions
                                        : (quoteData.salesTerms || 'No se han cargado las condiciones de venta.')
                                }}
                            ></div>
                            {quoteData.notes && (
                                <div className="mt-3 text-[10px] text-gray-500 italic border-l-2 border-orange-300 pl-2 bg-orange-50 p-1">
                                    <span className="font-bold">Notas:</span> {quoteData.notes}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons Bottom */}
                        <div className="flex justify-end gap-3 print:hidden pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={async (e) => {
                                    e.preventDefault();
                                    const enrichedData = await prepareQuoteForPDF({
                                        ...quoteData,
                                        quoteNumber: quoteData.quote_number || quoteData.quoteNumber,
                                        companyName: quoteData.companyName || quoteData.clientName,
                                        user_id: profile?.id,
                                        organizationLogo: orgLogo,
                                        exchangeRate,
                                        subtotal: calculateSubtotal(),
                                        tax: calculateTax(),
                                        total: calculateTotal(),
                                        salesPerson: profile?.full_name || profile?.email,
                                        salesEmail: profile?.email,
                                        salesPhone: profile?.phone || '-'
                                    });
                                    generateQuotePDF(enrichedData, orgInfo, pdfTemplate);
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

            {/* Client Creation Modal */}
            <CreateClientModal
                isOpen={showCreateClientModal}
                onClose={() => setShowCreateClientModal(false)}
                organizationId={profile?.organization_id}
                sellerEmail={profile?.email}
                onClientCreated={(client) => {
                    setQuoteData(prev => ({
                        ...prev,
                        clientName: client.name,
                        clientEmail: client.email,
                        clientPhone: client.phone || '',
                        clientRut: client.rut || '',
                        clientCity: client.city || '',
                        clientAddress: client.address || '',
                        companyName: client.company || client.name
                    }));
                    setClientSearchTerm('');
                }}
            />
        </div>
    );
};

export default QuoteBuilder;
