import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import QuoteBuilder from './pages/QuoteBuilder';
import QuotesList from './pages/QuotesList';
import Microsite from './pages/Microsite';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Settings from './pages/Settings';
import Catalog from './pages/Catalog';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import SalesNotesList from './pages/SalesNotesList';
import SalesNoteDetail from './pages/SalesNoteDetail';
import KaizenDashboard from './pages/KaizenDashboard';
import PipedriveImport from './pages/PipedriveImport';
import ClientFollowup from './pages/ClientFollowup';
import Debug from './pages/Debug';
import UpdateRole from './pages/UpdateRole';
import FixRLS from './pages/FixRLS';
import SetPassword from './pages/SetPassword';
import CreateSuperadmin from './pages/CreateSuperadmin';
import FixSuperAdminRole from './pages/FixSuperAdminRole';
import Clients from './pages/Clients';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { QuoteProvider } from './context/QuoteContext';
import { OfflineProvider } from './context/OfflineContext';
import { useFavicon } from './hooks/useFavicon';

function App() {

  return (
    <AuthProvider>
      <OfflineProvider>
        <QuoteProvider>
          <BrowserRouter>
            <Routes>
              {/* Public route for login */}
              <Route path="/login" element={<Login />} />

              {/* OAuth callback route */}
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Update role route (temporary) */}
              <Route path="/update-role" element={<UpdateRole />} />

              {/* Fix RLS route (temporary) */}
              <Route path="/fix-rls" element={<FixRLS />} />

              {/* Set Password route (temporary) */}
              <Route path="/set-password" element={<SetPassword />} />

              {/* Create Superadmin route (temporary) */}
              <Route path="/create-superadmin" element={<CreateSuperadmin />} />

              {/* Fix Super Admin Role route (temporary) */}
              <Route path="/fix-superadmin-role" element={<FixSuperAdminRole />} />

              {/* Public route for client microsite */}
              <Route path="/microsite/:id" element={<Microsite />} />

              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="builder" element={<QuoteBuilder />} />
                <Route path="builder/:id" element={<QuoteBuilder />} />
                <Route path="quotes" element={<QuotesList />} />
                <Route path="catalog" element={<Catalog />} />
                <Route path="sales-notes" element={<SalesNotesList />} />
                <Route path="sales-notes/:id" element={<SalesNoteDetail />} />
                <Route path="users" element={<Users />} />
                <Route path="clients" element={<Clients />} />
                <Route path="kaizen" element={<KaizenDashboard />} />
                <Route path="client-followup" element={<ClientFollowup />} />

                <Route path="settings" element={<Settings />} />
                <Route path="debug" element={<Debug />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </QuoteProvider>
      </OfflineProvider>
    </AuthProvider>
  );
}

export default App;
