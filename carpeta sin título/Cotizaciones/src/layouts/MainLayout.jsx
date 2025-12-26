import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useFavicon } from '../hooks/useFavicon';

const MainLayout = () => {
    // Apply dynamic favicon based on organization
    useFavicon();

    return (
        <div className="min-h-screen bg-beige-50 text-petrol-800 font-sans">
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
