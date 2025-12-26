import React, { useState } from 'react';
import { Palette, RotateCcw, Download, Upload, CheckCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeCustomizer = () => {
    const { theme, updateTheme, resetTheme, exportTheme, importTheme, defaultTheme } = useTheme();
    const [localTheme, setLocalTheme] = useState(theme);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const colorCategories = {
        'Colores Principales': {
            primary: 'Color Principal',
            secondary: 'Color Secundario',
            accent: 'Color de Acento'
        },
        'Colores de Estado': {
            success: 'Éxito',
            warning: 'Advertencia',
            error: 'Error',
            info: 'Información'
        },
        'Fondos y Bordes': {
            background: 'Fondo Principal',
            surface: 'Fondo de Tarjetas',
            border: 'Bordes'
        },
        'Tipografía': {
            textPrimary: 'Texto Principal',
            textSecondary: 'Texto Secundario',
            textMuted: 'Texto Deshabilitado'
        }
    };

    const handleColorChange = (key, value) => {
        setLocalTheme(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        const result = await updateTheme(localTheme);

        setSaving(false);
        if (result.success) {
            setMessage({ type: 'success', text: 'Tema guardado exitosamente' });
            setTimeout(() => setMessage(null), 3000);
        } else {
            setMessage({ type: 'error', text: 'Error al guardar el tema' });
        }
    };

    const handleReset = async () => {
        if (confirm('¿Estás seguro de restaurar los colores por defecto?')) {
            const result = await resetTheme();
            if (result.success) {
                setLocalTheme(defaultTheme);
                setMessage({ type: 'success', text: 'Tema restaurado a valores por defecto' });
                setTimeout(() => setMessage(null), 3000);
            }
        }
    };

    const handleExport = () => {
        exportTheme();
        setMessage({ type: 'success', text: 'Tema exportado' });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const result = await importTheme(event.target.result);
                if (result.success) {
                    setLocalTheme(theme);
                    setMessage({ type: 'success', text: 'Tema importado exitosamente' });
                } else {
                    setMessage({ type: 'error', text: 'Error al importar el tema' });
                }
                setTimeout(() => setMessage(null), 3000);
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Palette className="text-theme-primary" size={28} />
                    <div>
                        <h2 className="text-2xl font-bold text-theme-secondary">Personalización de Tema</h2>
                        <p className="text-sm text-theme-text-secondary">Personaliza los colores de tu aplicación</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 border border-theme-border text-theme-text-secondary rounded-lg hover:bg-theme-background transition-colors"
                    >
                        <RotateCcw size={16} />
                        Restaurar
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 border border-theme-border text-theme-text-secondary rounded-lg hover:bg-theme-background transition-colors"
                    >
                        <Download size={16} />
                        Exportar
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2 border border-theme-border text-theme-text-secondary rounded-lg hover:bg-theme-background transition-colors cursor-pointer">
                        <Upload size={16} />
                        Importar
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    <CheckCircle size={20} />
                    <span>{message.text}</span>
                </div>
            )}

            {/* Color Pickers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(colorCategories).map(([category, colors]) => (
                    <div key={category} className="glass-panel p-6 rounded-xl">
                        <h3 className="text-lg font-semibold text-theme-secondary mb-4">{category}</h3>
                        <div className="space-y-4">
                            {Object.entries(colors).map(([key, label]) => (
                                <div key={key} className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-theme-text-primary flex-1">
                                        {label}
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={localTheme[key]}
                                            onChange={(e) => handleColorChange(key, e.target.value)}
                                            className="w-12 h-10 rounded cursor-pointer border-2 border-theme-border"
                                        />
                                        <input
                                            type="text"
                                            value={localTheme[key]}
                                            onChange={(e) => handleColorChange(key, e.target.value)}
                                            className="w-24 px-2 py-1 text-sm border border-theme-border rounded focus:outline-none focus:ring-2 focus:ring-theme-primary"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Preview */}
            <div className="glass-panel p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-theme-secondary mb-4">Vista Previa</h3>
                <div className="space-y-4">
                    <div className="flex gap-3 flex-wrap">
                        <button className="btn-primary">
                            Botón Principal
                        </button>
                        <button className="btn-secondary">
                            Botón Secundario
                        </button>
                        <button style={{ backgroundColor: localTheme.accent, color: 'white' }} className="px-4 py-2 rounded-lg">
                            Botón Acento
                        </button>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                        <span className="px-3 py-1 rounded-full text-sm border" style={{
                            backgroundColor: `${localTheme.success}20`,
                            color: localTheme.success,
                            borderColor: localTheme.success
                        }}>
                            Éxito
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm border" style={{
                            backgroundColor: `${localTheme.warning}20`,
                            color: localTheme.warning,
                            borderColor: localTheme.warning
                        }}>
                            Advertencia
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm border" style={{
                            backgroundColor: `${localTheme.error}20`,
                            color: localTheme.error,
                            borderColor: localTheme.error
                        }}>
                            Error
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm border" style={{
                            backgroundColor: `${localTheme.info}20`,
                            color: localTheme.info,
                            borderColor: localTheme.info
                        }}>
                            Info
                        </span>
                    </div>

                    <div className="p-4 rounded-lg" style={{
                        backgroundColor: localTheme.surface,
                        borderColor: localTheme.border,
                        border: '1px solid'
                    }}>
                        <h4 style={{ color: localTheme.secondary }} className="font-semibold mb-2">
                            Tarjeta de Ejemplo
                        </h4>
                        <p style={{ color: localTheme.textPrimary }} className="mb-2">
                            Este es un texto principal en una tarjeta.
                        </p>
                        <p style={{ color: localTheme.textSecondary }} className="text-sm">
                            Este es un texto secundario con menos énfasis.
                        </p>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {saving ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Guardando...
                        </>
                    ) : (
                        <>
                            <CheckCircle size={20} />
                            Guardar Tema
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ThemeCustomizer;
