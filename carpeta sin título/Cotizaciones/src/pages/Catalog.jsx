import React, { useState, useEffect } from 'react';
import { useRole } from '../hooks/useRole';
import RoleGuard from '../components/RoleGuard';
import { Package, Plus, Search, Edit2, Trash2, X, Save, CheckCircle, Filter, Upload, Image as ImageIcon, Video, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import RichTextEditor from '../components/RichTextEditor';
import PDFProductImporter from '../components/PDFProductImporter';

const Catalog = () => {
    const { profile, isAdmin } = useRole();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [categories, setCategories] = useState([]);
    const [showPDFImporter, setShowPDFImporter] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        model: '',
        unit_price: '',
        cost: '',
        currency: 'CLP',
        sku: '',
        is_active: true,
        video_url: '',
        main_image: '',
        additional_images: [],
        technical_specs: '',
        sales_conditions: ''
    });
    const [uploading, setUploading] = useState(false);
    const [tempMainImage, setTempMainImage] = useState('');
    const [tempAddImage, setTempAddImage] = useState('');

    useEffect(() => {
        if (profile?.organization_id) {
            fetchProducts();
        }
    }, [profile]);

    const loadDefaultSalesConditions = async () => {
        try {
            const { data, error } = await supabase
                .from('organization_settings')
                .select('default_sales_conditions')
                .eq('organization_id', profile.organization_id)
                .single();

            if (data?.default_sales_conditions) {
                setFormData(prev => ({
                    ...prev,
                    sales_conditions: data.default_sales_conditions
                }));
            }
        } catch (error) {
            console.log('No default conditions found, using empty');
        }
    };


    const fetchProducts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setProducts(data || []);

            // Extract unique categories
            const uniqueCategories = [...new Set(data?.map(p => p.category).filter(Boolean))];
            setCategories(uniqueCategories);
        } catch (error) {
            console.error('Error fetching products:', error);
            alert('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                description: product.description || '',
                category: product.category || '',
                model: product.model || '',
                unit_price: product.unit_price,
                cost: product.cost || '',
                currency: product.currency || 'CLP',
                sku: product.sku || '',
                is_active: product.is_active,
                video_url: product.video_url || '',
                main_image: product.main_image || '',
                additional_images: product.additional_images || [],
                technical_specs: product.technical_specs || '',
                sales_conditions: product.sales_conditions || ''
            });
        } else {
            // Al crear nuevo producto, cargar condiciones por defecto
            loadDefaultSalesConditions();
            setFormData({
                name: '',
                description: '',
                category: '',
                model: '',
                unit_price: '',
                cost: '',
                currency: 'CLP',
                sku: '',
                is_active: true,
                video_url: '',
                main_image: '',
                additional_images: [],
                technical_specs: '',
                sales_conditions: '' // Se llenará con loadDefaultSalesConditions
            });
        }
        setTempMainImage('');
        setTempAddImage('');
        setShowModal(true);
    };

    const handlePDFDataExtracted = (data) => {
        // Populate form with extracted PDF data
        setFormData({
            name: data.name || '',
            description: data.description || '',
            category: '',
            model: data.model || '',
            unit_price: data.unit_price || '',
            cost: '',
            currency: data.currency || 'CLP',
            sku: '',
            is_active: true,
            video_url: '',
            main_image: '',
            additional_images: [],
            technical_specs: data.technical_specs || '',
            sales_conditions: '' // Will be filled by loadDefaultSalesConditions
        });

        // Load default sales conditions from settings
        loadDefaultSalesConditions();

        // Open the product modal with pre-filled data
        setShowModal(true);
    };
    const handleImageUpload = async (e, isMain = true) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${profile.organization_id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('products').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            if (isMain) {
                setFormData(prev => ({ ...prev, main_image: publicUrl }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    additional_images: [...prev.additional_images, publicUrl]
                }));
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error al subir imagen. Asegúrate de que el bucket "products" exista y sea público.');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveImage = (index) => {
        setFormData(prev => ({
            ...prev,
            additional_images: prev.additional_images.filter((_, i) => i !== index)
        }));
    };
    const handleCloseModal = () => {
        setShowModal(false);
        setEditingProduct(null);
        setFormData({
            name: '',
            description: '',
            category: '',
            model: '',
            unit_price: '',
            cost: '',
            currency: 'CLP',
            sku: '',
            is_active: true,
            video_url: '',
            main_image: '',
            additional_images: [],
            technical_specs: '',
            sales_conditions: ''
        });
    };

    const [submitError, setSubmitError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(null);

        if (!formData.name || !formData.unit_price) {
            alert('Por favor completa los campos requeridos');
            return;
        }

        try {
            setLoading(true);

            // Sanitize and construct payload explicitly
            const unitPrice = parseFloat(formData.unit_price);
            if (isNaN(unitPrice)) throw new Error("El precio unitario no es válido");

            const cost = formData.cost ? parseFloat(formData.cost) : null;
            if (formData.cost && isNaN(cost)) throw new Error("El costo no es válido");

            const productData = {
                organization_id: profile.organization_id,
                name: formData.name.trim(),
                description: formData.description || '',
                category: formData.category || '',
                model: formData.model || '',
                unit_price: unitPrice,
                cost: cost,
                currency: formData.currency || 'CLP',
                sku: formData.sku || '',
                is_active: formData.is_active,
                video_url: formData.video_url || '',
                main_image: formData.main_image || '',
                additional_images: Array.isArray(formData.additional_images) ? formData.additional_images : [],
                technical_specs: formData.technical_specs || '',
                sales_conditions: formData.sales_conditions || ''
            };

            console.log('Submitting product data:', productData);

            if (editingProduct) {
                // Update existing product
                const { error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', editingProduct.id);

                if (error) throw error;
            } else {
                // Create new product
                const { error } = await supabase
                    .from('products')
                    .insert([productData]);

                if (error) throw error;
            }

            handleCloseModal();
            fetchProducts();
        } catch (error) {
            console.error('Error saving product:', error);
            const errorMsg = error.message || error.error_description || JSON.stringify(error);
            setSubmitError(errorMsg);
            alert('Error al guardar: ' + errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (product) => {
        try {
            const { error } = await supabase
                .from('products')
                .update({ is_active: !product.is_active })
                .eq('id', product.id);

            if (error) throw error;

            fetchProducts();
        } catch (error) {
            console.error('Error toggling product status:', error);
            alert('Error al cambiar el estado del producto');
        }
    };

    const [productToDelete, setProductToDelete] = useState(null);

    const confirmDelete = (product) => {
        setProductToDelete(product);
    };

    const executeDelete = async () => {
        if (!productToDelete) return;

        try {
            const { data, error } = await supabase
                .from('products')
                .delete()
                .eq('id', productToDelete.id)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error('No se pudo eliminar. Posiblemente no tienes permisos o el producto ya no existe.');
            }

            fetchProducts();
            setProductToDelete(null);
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error al eliminar el producto: ' + (error.message || error.error_description || JSON.stringify(error)));
        }
    };

    // Filter products
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (product.model && product.model.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (loading && !products.length) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-red-600 mb-2">Error de Perfil</h2>
                <p className="text-gray-600 mb-4">No se pudo cargar tu perfil de usuario. Por favor, recarga la página.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                    Recargar Página
                </button>
            </div>
        );
    }

    return (
        <RoleGuard allowedRoles={['super_admin', 'admin']}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Catálogo de Productos</h1>
                        <p className="text-gray-400">Gestiona tus productos y servicios</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowPDFImporter(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
                        >
                            <FileText size={20} />
                            <span className="font-semibold">Importar desde PDF</span>
                        </button>
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg"
                        >
                            <Plus size={20} />
                            <span className="font-semibold">Nuevo Producto</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="glass-panel p-4 rounded-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, SKU o modelo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
                            >
                                <option value="all">Todas las categorías</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Products Table */}
                <div className="glass-panel rounded-xl overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600">Cargando productos...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="p-12 text-center">
                            <Package className="mx-auto mb-4 text-gray-400" size={48} />
                            <p className="text-gray-600 text-lg">No hay productos aún</p>
                            <p className="text-gray-500 text-sm mt-2">Crea tu primer producto para empezar</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-petrol-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Producto</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Modelo</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Categoría</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SKU</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Precio</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{product.name}</p>
                                                    {product.description && (
                                                        <p className="text-sm text-gray-500 truncate max-w-xs">{product.description}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {product.model || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {product.category && (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {product.category}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {product.sku || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-900">
                                                    ${parseFloat(product.unit_price).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                </p>
                                                {product.cost && (
                                                    <p className="text-xs text-gray-500">
                                                        Costo: ${parseFloat(product.cost).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleToggleActive(product)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${product.is_active ? 'bg-green-500' : 'bg-gray-300'
                                                        }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${product.is_active ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                    />
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenModal(product)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDelete(product)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Product Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="glass-panel rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-petrol-800">
                                        {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                                    </h2>
                                    <button
                                        onClick={handleCloseModal}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {submitError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4">
                                        <strong className="font-bold">Error: </strong>
                                        <span className="block sm:inline">{submitError}</span>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Nombre del Producto <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="Ej: Servicio de Consultoría"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Descripción
                                        </label>
                                        <RichTextEditor
                                            value={formData.description}
                                            onChange={(val) => setFormData({ ...formData, description: val })}
                                            placeholder="Descripción detallada del producto o servicio"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Video del Producto
                                        </label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Video className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                                <input
                                                    type="url"
                                                    value={formData.video_url}
                                                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                    placeholder="URL del video (YouTube, Vimeo, etc.)"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Main Image */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Imagen Principal
                                            </label>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors relative">
                                                {formData.main_image ? (
                                                    <div className="relative">
                                                        <img src={formData.main_image} alt="Main" className="h-32 w-full object-contain rounded-md" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, main_image: '' })}
                                                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 transform translate-x-1/2 -translate-y-1/2"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        <label className="cursor-pointer block">
                                                            <ImageIcon className="mx-auto text-gray-400 mb-2" size={32} />
                                                            <span className="text-sm text-gray-500">Subir imagen principal</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => handleImageUpload(e, true)}
                                                                disabled={uploading}
                                                            />
                                                        </label>
                                                        <div className="text-xs text-gray-400">- O -</div>
                                                        <input
                                                            type="url"
                                                            placeholder="Pegar URL de imagen"
                                                            value={tempMainImage}
                                                            onChange={(e) => setTempMainImage(e.target.value)}
                                                            className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md"
                                                            onBlur={() => {
                                                                if (tempMainImage) {
                                                                    setFormData(prev => ({ ...prev, main_image: tempMainImage }));
                                                                    setTempMainImage('');
                                                                }
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (tempMainImage) {
                                                                        setFormData(prev => ({ ...prev, main_image: tempMainImage }));
                                                                        setTempMainImage('');
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Additional Images */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Imágenes Adicionales
                                            </label>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                                                <div className="space-y-3">
                                                    <label className="cursor-pointer block">
                                                        <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                                                        <span className="text-sm text-gray-500">Subir imágenes</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => handleImageUpload(e, false)}
                                                            disabled={uploading}
                                                        />
                                                    </label>
                                                    <div className="text-xs text-gray-400">- O -</div>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="url"
                                                            placeholder="Pegar URL"
                                                            value={tempAddImage}
                                                            onChange={(e) => setTempAddImage(e.target.value)}
                                                            className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (tempAddImage) {
                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            additional_images: [...prev.additional_images, tempAddImage]
                                                                        }));
                                                                        setTempAddImage('');
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (tempAddImage) {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        additional_images: [...prev.additional_images, tempAddImage]
                                                                    }));
                                                                    setTempAddImage('');
                                                                }
                                                            }}
                                                            className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 text-sm"
                                                        >
                                                            Agregar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            {formData.additional_images.length > 0 && (
                                                <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                                                    {formData.additional_images.map((img, idx) => (
                                                        <div key={idx} className="relative flex-shrink-0">
                                                            <img src={img} alt={`Add ${idx}`} className="h-16 w-16 object-cover rounded-md border border-gray-200" />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveImage(idx)}
                                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Categoría
                                        </label>
                                        <input
                                            type="text"
                                            list="categories"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="Ej: Servicios, Productos"
                                        />
                                        <datalist id="categories">
                                            {categories.map(cat => (
                                                <option key={cat} value={cat} />
                                            ))}
                                        </datalist>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Modelo
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.model}
                                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="Ej: PRO-2024"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            SKU
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.sku}
                                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="Ej: CONS-001"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Moneda
                                        </label>
                                        <select
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                                        >
                                            <option value="CLP">CLP (Peso Chileno)</option>
                                            <option value="USD">USD (Dólar)</option>
                                            <option value="EUR">EUR (Euro)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Precio Unitario <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            min="0"
                                            value={formData.unit_price}
                                            onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Costo (opcional)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.cost}
                                            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Especificaciones Técnicas
                                        </label>
                                        <RichTextEditor
                                            value={formData.technical_specs}
                                            onChange={(val) => setFormData({ ...formData, technical_specs: val })}
                                            placeholder="Detalles técnicos del producto (dimensiones, materiales, etc.)"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Condiciones de Venta
                                        </label>
                                        <RichTextEditor
                                            value={formData.sales_conditions}
                                            onChange={(val) => setFormData({ ...formData, sales_conditions: val })}
                                            placeholder="Garantía, plazos de entrega, formas de pago..."
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active}
                                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                                className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">Producto activo</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Guardando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                <span>{editingProduct ? 'Actualizar' : 'Crear'} Producto</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {productToDelete && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar producto?</h3>
                            <p className="text-gray-600 mb-6">
                                Estás a punto de eliminar "{productToDelete.name}". Esta acción no se puede deshacer.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setProductToDelete(null)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={executeDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* PDF Product Importer */}
                {showPDFImporter && (
                    <PDFProductImporter
                        onDataExtracted={handlePDFDataExtracted}
                        onClose={() => setShowPDFImporter(false)}
                        organizationId={profile?.organization_id}
                    />
                )}
            </div>
        </RoleGuard>
    );
};

export default Catalog;
