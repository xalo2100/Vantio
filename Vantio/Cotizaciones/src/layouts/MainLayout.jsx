import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useFavicon } from '../hooks/useFavicon';
import { supabase } from '../lib/supabase';
import { useRole } from '../hooks/useRole';

const MainLayout = () => {
    const { profile } = useRole();
    const [appBg, setAppBg] = useState('#fdfbf7');

    // Apply dynamic favicon based on organization
    useFavicon();

    useEffect(() => {
        if (profile?.organization_id) {
            fetchBranding();
        }
    }, [profile]);

    const fetchBranding = async () => {
        try {
            const { data } = await supabase
                .from('organization_settings')
                .select('app_bg_color')
                .eq('organization_id', profile.organization_id)
                .single();

            if (data?.app_bg_color) {
                setAppBg(data.app_bg_color);
            }
        } catch (error) {
            console.error('Error fetching layout branding:', error);
        }
    };

    return (
        <div
            className="min-h-screen text-petrol-800 font-sans transition-colors duration-300"
            style={{ backgroundColor: appBg }}
        >
            <Sidebar />
            <main className="ml-64 min-h-screen p-8">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
