import React from 'react';
import { useRole } from '../hooks/useRole';
import { AlertTriangle } from 'lucide-react';

/**
 * RoleGuard - Component to protect content based on user role
 * @param {string[]} allowedRoles - Array of roles that can access the content
 * @param {React.ReactNode} children - Content to protect
 * @param {React.ReactNode} fallback - Optional fallback content if access denied
 */
const RoleGuard = ({ allowedRoles = [], children, fallback = null }) => {
    const { role, isLoading } = useRole();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Verificando permisos...</p>
                </div>
            </div>
        );
    }

    const hasAccess = allowedRoles.includes(role);

    if (!hasAccess) {
        if (fallback) {
            return fallback;
        }

        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="glass-panel p-8 rounded-2xl max-w-md text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="text-red-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        Acceso Denegado
                    </h2>
                    <p className="text-gray-600 mb-4">
                        No tienes permisos suficientes para acceder a esta sección.
                    </p>
                    <p className="text-sm text-gray-500">
                        Tu rol actual: <span className="font-semibold">{role}</span>
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default RoleGuard;
