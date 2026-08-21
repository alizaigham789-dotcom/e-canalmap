import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';

// Page imports
import Dashboard from './pages/Dashboard';
import MapList from './pages/MapList';
import Editor from './pages/Editor';
import AdminPanel from './pages/AdminPanel';
import CanalForms from './pages/CanalForms';
import ParatWarabandi from './pages/ParatWarabandi';
import FormSettings from './pages/FormSettings';
import KhalMismari from './pages/KhalMismari';
import Warashikni from './pages/Warashikni';
import TawanCase from './pages/TawanCase';
import TAForm from './pages/TAForm';
import GeoMap from './pages/GeoMap';
import MogaMerge from './pages/MogaMerge';
import Form1Register from './pages/Form1Register';
import DeputyCollectorDocs from './pages/DeputyCollectorDocs';
import Form33C from './pages/Form33C';

import ZilladarDocs from './pages/ZilladarDocs';
import GroupChat from './pages/GroupChat';
import CanalPatwari from './pages/CanalPatwari';
import Naqsha27B from './pages/Naqsha27B';
import ChakbandiIkhrajCase from './pages/ChakbandiIkhrajCase';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Subscription from './pages/Subscription';
import Account from './pages/Account';
import SubscriptionGate from '@/components/SubscriptionGate';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0f1a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-600 font-mono">Loading Chakbandi GIS…</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/account" element={<Account />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route element={<SubscriptionGate />}>
          <Route path="/editor" element={<Editor />} />
          <Route path="/map-list" element={<MapList />} />
        </Route>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/canal-forms" element={<CanalForms />} />
        <Route path="/parat-warabandi" element={<ParatWarabandi />} />
        <Route path="/form-settings" element={<FormSettings />} />
        <Route path="/khal-mismari" element={<KhalMismari />} />
        <Route path="/warashikni" element={<Warashikni />} />
        <Route path="/tawan-case" element={<TawanCase />} />
        <Route path="/ta-form" element={<TAForm />} />
        <Route element={<SubscriptionGate />}>
          <Route path="/geo-map" element={<GeoMap />} />
          <Route path="/moga-merge" element={<MogaMerge />} />
          <Route path="/form1-register" element={<Form1Register />} />
        </Route>
        <Route path="/deputy-collector" element={<DeputyCollectorDocs />} />
        <Route path="/deputy-collector/33c" element={<Form33C />} />

        <Route path="/zilladar" element={<ZilladarDocs />} />
        <Route path="/group-chat" element={<GroupChat />} />
        <Route path="/canal-patwari" element={<CanalPatwari />} />
        <Route path="/canal-patwari/naqsha-27b" element={<Naqsha27B />} />
        <Route path="/chakbandi-ikhraj" element={<ChakbandiIkhrajCase />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App