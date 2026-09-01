import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import SubscriptionGate from '@/components/SubscriptionGate';

// Route-level code splitting — each page loads in its own chunk so the
// initial bundle stays small and the app opens fast. Heavy libs (three.js,
// jspdf, leaflet, html2canvas…) only load when their page is opened.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MapList = lazy(() => import('./pages/MapList'));
const Editor = lazy(() => import('./pages/Editor'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const CanalForms = lazy(() => import('./pages/CanalForms'));
const ParatWarabandi = lazy(() => import('./pages/ParatWarabandi'));
const FormSettings = lazy(() => import('./pages/FormSettings'));
const KhalMismari = lazy(() => import('./pages/KhalMismari'));
const Warashikni = lazy(() => import('./pages/Warashikni'));
const TawanCase = lazy(() => import('./pages/TawanCase'));
const TAForm = lazy(() => import('./pages/TAForm'));
const GeoMap = lazy(() => import('./pages/GeoMap'));
const MogaMerge = lazy(() => import('./pages/MogaMerge'));
const Form1Register = lazy(() => import('./pages/Form1Register'));
const DeputyCollectorDocs = lazy(() => import('./pages/DeputyCollectorDocs'));
const Form33C = lazy(() => import('./pages/Form33C'));
const TaskAssignment = lazy(() => import('./pages/TaskAssignment'));
const ZilladarDocs = lazy(() => import('./pages/ZilladarDocs'));
const GroupChat = lazy(() => import('./pages/GroupChat'));
const CanalPatwari = lazy(() => import('./pages/CanalPatwari'));
const Naqsha27B = lazy(() => import('./pages/Naqsha27B'));
const ChakbandiIkhrajCase = lazy(() => import('./pages/ChakbandiIkhrajCase'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Subscription = lazy(() => import('./pages/Subscription'));
const Account = lazy(() => import('./pages/Account'));

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0f1a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-600 font-mono">Loading Canal E Record…</p>
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
        <Route path="/deputy-collector/task-assignment" element={<TaskAssignment />} />

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
          <Suspense fallback={
            <div className="fixed inset-0 flex items-center justify-center bg-[#0a0f1a]">
              <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          }>
            <AuthenticatedApp />
          </Suspense>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App