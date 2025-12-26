import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, LogOut, BarChart3, Users, PlusCircle, Package, Globe, Building2, ClipboardCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';
import { supabase } from '../lib/supabase';

const Sidebar = () => {
    const { user, signOut } = useAuth();
    const { isAdmin, profile } = useRole();
    const [orgName, setOrgName] = useState('AlfaQuote');
    const [orgLogo, setOrgLogo] = useState(null);

    useEffect(() => {
        if (profile?.organization_id) {
            fetchOrganization();
        }
    }, [profile]);

    const fetchOrganization = async () => {
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('name, logo_url')
                .eq('id', profile.organization_id)
                .single();

            if (data) {
                setOrgName(data.name || 'AlfaQuote');
                if (data.logo_url) setOrgLogo(data.logo_url);
            }
        } catch (error) {
            console.error('Error fetching organization:', error);
        }
    };

    // Base nav items for all users
    const baseNavItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: BarChart3, label: 'Analytics', path: '/analytics' },
        { icon: PlusCircle, label: 'Nueva Cotización', path: '/builder' },
        { icon: FileText, label: 'Mis Cotizaciones', path: '/quotes' },
        { icon: ClipboardCheck, label: 'Notas de Venta', path: '/sales-notes' },
    ];


    // Admin-only nav items
    const adminNavItems = [
        { icon: Package, label: 'Catálogo', path: '/catalog' },
        { icon: Users, label: 'Usuarios', path: '/users' },
    ];

    // All users can access settings
    const commonNavItems = [

        { icon: Settings, label: 'Configuración', path: '/settings' },
    ];

    // Combine nav items based on role
    const navItems = [
        ...baseNavItems,
        ...(isAdmin ? adminNavItems : []),
        ...commonNavItems
    ];

    const handleLogout = async () => {
        if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            await signOut();
        }
    };

    const getUserInitials = () => {
        if (!user?.user_metadata?.full_name) return 'U';
        const names = user.user_metadata.full_name.split(' ');
        return names.length > 1
            ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
            : names[0][0].toUpperCase();
    };

    return (
        <aside className="w-64 bg-petrol-500 h-screen fixed left-0 top-0 flex flex-col z-50 shadow-xl">
            <div className="p-6 border-b border-petrol-400">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        {orgLogo ? (
                            <img src={orgLogo} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                            <Building2 className="text-white" size={20} />
                        )}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white truncate max-w-[140px]" title={orgName}>
                            {orgName}
                        </h1>
                        <p className="text-xs text-petrol-200 mt-0.5">v2.0 Pro</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                ? 'bg-orange-500 text-white shadow-lg'
                                : 'text-petrol-100 hover:bg-petrol-600 hover:text-white'
                            }`
                        }
                    >
                        <item.icon size={20} />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-petrol-400">
                <div className="flex items-center gap-3 px-4 py-2 mb-3">
                    {user?.user_metadata?.avatar_url ? (
                        <img
                            src={user.user_metadata.avatar_url}
                            alt="Avatar"
                            className="w-10 h-10 rounded-full border-2 border-orange-500"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
                            {getUserInitials()}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                            {user?.user_metadata?.full_name || user?.email || 'Usuario'}
                        </p>
                        <p className="text-xs text-petrol-200 truncate">
                            {user?.email || ''}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-petrol-100 hover:bg-red-500 hover:text-white transition-all"
                >
                    <LogOut size={18} />
                    <span className="font-medium">Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
