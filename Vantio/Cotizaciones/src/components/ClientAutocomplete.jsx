import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Building2, Mail, Phone, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useDebounce from '../hooks/useDebounce';

const ClientAutocomplete = ({ onClientSelect, organizationId, disabled = false }) => {
    console.log('🚀 ClientAutocomplete loaded - Version 2.0 with CRM search');
    console.log('📋 Props:', { organizationId, disabled });

    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [error, setError] = useState(null);

    const debouncedSearchTerm = useDebounce(searchTerm, 20);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Search clients when debounced term changes
    useEffect(() => {
        if (debouncedSearchTerm && debouncedSearchTerm.length >= 2) {
            searchClients(debouncedSearchTerm);
        } else {
            setResults([]);
            setShowDropdown(false);
        }
    }, [debouncedSearchTerm]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchClients = async (term) => {
        setLoading(true);
        setError(null);

        try {
            // Validate organizationId is available
            if (!organizationId) {
                console.warn('⚠️ Organization ID not available yet');
                setError('Cargando información de la organización...');
                setLoading(false);
                return;
            }

            console.log('🔍 Searching CRM clients:', { term, organizationId });

            // Use new multi-CRM search service
            const result = await supabase.functions.invoke('search-crm-clients', {
                body: {
                    searchTerm: term,
                    organizationId: organizationId,
                    limit: 10
                }
            });

            console.log('📦 Search result:', result);

            if (result.error) throw result.error;

            const { data } = result;

            if (data && data.success) {
                console.log('✅ Clients found:', data.clients);
                setResults(data.clients || []);
                setShowDropdown(true);
            } else {
                console.error('❌ Search failed:', data);
                setError(data?.message || 'Error al buscar clientes');
                setResults([]);
            }
        } catch (err) {
            console.error('💥 Error searching clients:', err);
            setError('Error al conectar con los CRMs');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (client) => {
        onClientSelect(client);
        setSearchTerm(''); // Clear search
        setResults([]);
        setShowDropdown(false);
        setSelectedIndex(-1);
    };

    const handleClear = () => {
        setSearchTerm('');
        setResults([]);
        setShowDropdown(false);
        setSelectedIndex(-1);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (!showDropdown || results.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < results.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < results.length) {
                    handleSelect(results[selectedIndex]);
                }
                break;
            case 'Escape':
                setShowDropdown(false);
                break;
        }
    };

    const highlightMatch = (text, term) => {
        if (!text || !term) return text;

        const regex = new RegExp(`(${term})`, 'gi');
        const parts = text.split(regex);

        return parts.map((part, index) =>
            regex.test(part) ? (
                <mark key={index} className="bg-yellow-200 font-semibold">{part}</mark>
            ) : (
                part
            )
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <Search size={20} />
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => results.length > 0 && setShowDropdown(true)}
                    placeholder="Buscar cliente por nombre, email, teléfono o empresa..."
                    disabled={disabled}
                    className="w-full pl-10 pr-10 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />

                {loading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="animate-spin text-orange-500" size={20} />
                    </div>
                )}

                {!loading && searchTerm && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {error && (
                <div className="mt-2 text-sm text-red-600 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {showDropdown && results.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                    {results.map((client, index) => (
                        <div
                            key={client.id}
                            onClick={() => handleSelect(client)}
                            className={`p-4 cursor-pointer transition-colors ${index === selectedIndex
                                ? 'bg-orange-50 border-l-4 border-orange-500'
                                : 'hover:bg-gray-50 border-l-4 border-transparent'
                                } ${index !== results.length - 1 ? 'border-b border-gray-100' : ''}`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User size={16} className="text-petrol-600" />
                                        <span className="font-semibold text-petrol-800">
                                            {highlightMatch(client.name, searchTerm)}
                                        </span>
                                        {/* CRM Source Badge */}
                                        {client.source && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                                {client.source.toUpperCase()}
                                            </span>
                                        )}
                                    </div>

                                    {client.company && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                            <Building2 size={14} />
                                            <span>{highlightMatch(client.company, searchTerm)}</span>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                                        {client.email && (
                                            <div className="flex items-center gap-1">
                                                <Mail size={14} />
                                                <span>{highlightMatch(client.email, searchTerm)}</span>
                                            </div>
                                        )}
                                        {client.phone && (
                                            <div className="flex items-center gap-1">
                                                <Phone size={14} />
                                                <span>{highlightMatch(client.phone, searchTerm)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showDropdown && !loading && results.length === 0 && searchTerm.length >= 2 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
                    <p>No se encontraron clientes</p>
                    <p className="text-sm mt-1">Intenta con otro término de búsqueda</p>
                </div>
            )}
        </div>
    );
};

export default ClientAutocomplete;
