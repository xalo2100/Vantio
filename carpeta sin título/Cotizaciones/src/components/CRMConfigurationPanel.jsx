import React, { useState, useEffect } from 'react';
import { Check, X, Loader2, Eye, EyeOff, TestTube, Save, Trash2 } from 'lucide-react';
import { crmService } from '../services/crmService';
import CRMLogo from './CRMLogo';

const CRMConfigurationPanel = ({ crmType, organizationId, onSave, onDelete }) => {
    const [config, setConfig] = useState(null);
    const [credentials, setCredentials] = useState({});
    const [isEnabled, setIsEnabled] = useState(false);
    const [showPasswords, setShowPasswords] = useState({});
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const metadata = crmService.getCRMMetadata(crmType);

    useEffect(() => {
        loadConfiguration();
    }, [crmType, organizationId]);

    const loadConfiguration = async () => {
        const result = await crmService.getCRMConfiguration(organizationId, crmType);
        if (result.success && result.configuration) {
            setConfig(result.configuration);
            setCredentials(result.configuration.credentials || {});
            setIsEnabled(result.configuration.is_enabled);
            if (result.configuration.is_enabled || Object.keys(result.configuration.credentials || {}).length > 0) {
                setExpanded(true);
            }
        }
    };

    const handleCredentialChange = (fieldName, value) => {
        setCredentials(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);

        const result = await crmService.testConnection(crmType, credentials);

        setTestResult(result);
        setTesting(false);

        setTimeout(() => setTestResult(null), 5000);
    };

    const handleSave = async () => {
        setSaving(true);

        const result = await crmService.saveCRMConfiguration(
            organizationId,
            crmType,
            credentials,
            {},
            isEnabled
        );

        setSaving(false);

        if (result.success) {
            setConfig(result.configuration);
            if (onSave) onSave(result.configuration);
        } else {
            alert('Error al guardar: ' + result.error);
        }
    };

    const handleDelete = async () => {
        if (!config) return;

        if (!window.confirm(`¿Estás seguro de eliminar la configuración de ${metadata.name}?`)) {
            return;
        }

        const result = await crmService.deleteCRMConfiguration(config.id);

        if (result.success) {
            setConfig(null);
            setCredentials({});
            setIsEnabled(false);
            if (onDelete) onDelete();
        } else {
            alert('Error al eliminar: ' + result.error);
        }
    };

    const togglePasswordVisibility = (fieldName) => {
        setShowPasswords(prev => ({
            ...prev,
            [fieldName]: !prev[fieldName]
        }));
    };

    const isConfigured = config && Object.keys(credentials).length > 0;
    const canTest = metadata.requiredFields.every(field => credentials[field]);

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header */}
            <div
                className={`p-4 cursor-pointer transition-colors ${isEnabled ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CRMLogo crmType={crmType} size={40} />
                        <div>
                            <h3 className="font-semibold text-gray-900">{metadata.name}</h3>
                            <p className="text-xs text-gray-500">
                                {isConfigured ? (isEnabled ? '✅ Activo' : '⚪ Configurado') : '⚫ No configurado'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <span className="text-sm text-gray-600">Activar</span>
                            <button
                                onClick={() => setIsEnabled(!isEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEnabled ? 'bg-green-500' : 'bg-gray-300'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </label>

                        <span className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}>
                            ▼
                        </span>
                    </div>
                </div>
            </div>

            {/* Configuration Form */}
            {expanded && (
                <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="space-y-4">
                        {metadata.fields.map((field) => (
                            <div key={field.name}>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        type={field.type === 'password' && !showPasswords[field.name] ? 'password' : 'text'}
                                        value={credentials[field.name] || ''}
                                        onChange={(e) => handleCredentialChange(field.name, e.target.value)}
                                        placeholder={field.placeholder || ''}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-10"
                                    />
                                    {field.type === 'password' && (
                                        <button
                                            type="button"
                                            onClick={() => togglePasswordVisibility(field.name)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPasswords[field.name] ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Test Result */}
                        {testResult && (
                            <div className={`p-3 rounded-lg flex items-center gap-2 ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                {testResult.success ? <Check size={18} /> : <X size={18} />}
                                <span className="text-sm">
                                    {testResult.success ? 'Conexión exitosa' : `Error: ${testResult.error || 'No se pudo conectar'}`}
                                </span>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-4">
                            <button
                                onClick={handleTestConnection}
                                disabled={!canTest || testing}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {testing ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        <span>Probando...</span>
                                    </>
                                ) : (
                                    <>
                                        <TestTube size={18} />
                                        <span>Probar Conexión</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        <span>Guardando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        <span>Guardar</span>
                                    </>
                                )}
                            </button>

                            {isConfigured && (
                                <button
                                    onClick={handleDelete}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors ml-auto"
                                >
                                    <Trash2 size={18} />
                                    <span>Eliminar</span>
                                </button>
                            )}
                        </div>

                        {/* Info */}
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs text-blue-700">
                                💡 <strong>Nota:</strong> Los CRMs marcados como "Activo" se usarán para buscar clientes automáticamente.
                                {crmType === 'pipedrive' && ' Pipedrive está completamente funcional.'}
                                {crmType !== 'pipedrive' && ' Este CRM está en modo de prueba y requiere implementación adicional.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CRMConfigurationPanel;
