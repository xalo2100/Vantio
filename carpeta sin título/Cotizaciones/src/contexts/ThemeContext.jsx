import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ThemeContext = createContext();

const defaultTheme = {
    primary: '#F97316',
    secondary: '#0891B2',
    accent: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF'
};

export const ThemeProvider = ({ children, organizationId }) => {
    const [theme, setTheme] = useState(defaultTheme);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (organizationId) {
            loadTheme();
        }
    }, [organizationId]);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const loadTheme = async () => {
        try {
            const { data, error } = await supabase
                .from('organization_settings')
                .select('theme_colors')
                .eq('organization_id', organizationId)
                .single();

            if (error) throw error;

            if (data?.theme_colors) {
                setTheme({ ...defaultTheme, ...data.theme_colors });
            }
        } catch (error) {
            console.error('Error loading theme:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyTheme = (colors) => {
        const root = document.documentElement;

        // Apply CSS variables
        Object.entries(colors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value);
        });
    };

    const updateTheme = async (newColors) => {
        try {
            const updatedTheme = { ...theme, ...newColors };

            const { error } = await supabase
                .from('organization_settings')
                .upsert({
                    organization_id: organizationId,
                    theme_colors: updatedTheme
                }, {
                    onConflict: 'organization_id'
                });

            if (error) throw error;

            setTheme(updatedTheme);
            return { success: true };
        } catch (error) {
            console.error('Error updating theme:', error);
            return { success: false, error: error.message };
        }
    };

    const resetTheme = async () => {
        try {
            const { error } = await supabase
                .from('organization_settings')
                .upsert({
                    organization_id: organizationId,
                    theme_colors: defaultTheme
                }, {
                    onConflict: 'organization_id'
                });

            if (error) throw error;

            setTheme(defaultTheme);
            return { success: true };
        } catch (error) {
            console.error('Error resetting theme:', error);
            return { success: false, error: error.message };
        }
    };

    const exportTheme = () => {
        const themeJson = JSON.stringify(theme, null, 2);
        const blob = new Blob([themeJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'theme.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const importTheme = async (themeJson) => {
        try {
            const imported = JSON.parse(themeJson);
            return await updateTheme(imported);
        } catch (error) {
            console.error('Error importing theme:', error);
            return { success: false, error: 'Invalid theme file' };
        }
    };

    return (
        <ThemeContext.Provider value={{
            theme,
            loading,
            updateTheme,
            resetTheme,
            exportTheme,
            importTheme,
            defaultTheme
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};
