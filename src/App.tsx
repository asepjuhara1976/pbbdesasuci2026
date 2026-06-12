import React, { useState, useEffect } from 'react';
import AndroidShell from './components/AndroidShell';
import Dashboard from './components/Dashboard';
import GisMap from './components/GisMap';
import TaxpayerForm from './components/TaxpayerForm';
import TaxpayerList from './components/TaxpayerList';
import LoginModal from './components/LoginModal';
import { Taxpayer, PaymentLog } from './types';
import { 
  syncTaxpayers, 
  syncPaymentLogs, 
  saveTaxpayer, 
  saveTaxpayersBatch,
  deleteTaxpayer, 
  addPaymentLog,
  getLoggedInPetugas,
  signInDemoPetugas,
  logoutDemoPetugas,
  PetugasUser
} from './lib/firebase';
import { 
  LayoutDashboard, 
  Map, 
  FileText, 
  User, 
  PlusCircle, 
  LogOut, 
  LogIn, 
  ChevronRight, 
  ShieldAlert 
} from 'lucide-react';

export default function App() {
  // Application tabs: 'dashboard' | 'map' | 'list' | 'profile-add'
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [taxpayers, setTaxpayers] = useState<Taxpayer[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Authenticated State (Field officer - Petugas Lapangan)
  const [loggedInUser, setLoggedInUser] = useState<PetugasUser | null>(null);

  // Bottom map inspection state
  const [inspectTaxpayer, setInspectTaxpayer] = useState<Taxpayer | null>(null);

  // Load Real-time Firestore sync listeners
  useEffect(() => {
    // Sync taxpayers collection
    const unsubscribeTaxpayers = syncTaxpayers((syncedData) => {
      setTaxpayers(syncedData);
    });

    // Sync payment logs collection
    const unsubscribePaymentLogs = syncPaymentLogs((syncedLogs) => {
      setPaymentLogs(syncedLogs);
    });

    // Load active logged-in petugas session
    const userSession = getLoggedInPetugas();
    if (userSession) {
      setLoggedInUser(userSession);
    }

    // Auth sync events across widgets
    const handleAuthUpdated = () => {
      setLoggedInUser(getLoggedInPetugas());
    };
    window.addEventListener('auth_updated', handleAuthUpdated);

    return () => {
      unsubscribeTaxpayers();
      unsubscribePaymentLogs();
      window.removeEventListener('auth_updated', handleAuthUpdated);
    };
  }, []);

  // Theme injector side-effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Auth logins
  const handleLoginPetugas = () => {
    setShowLoginModal(true);
  };

  const handleLogoutPetugas = () => {
    logoutDemoPetugas();
    setLoggedInUser(null);
  };

  // Add taxpayer callback
  const handleAddTaxpayer = async (newTaxpayer: Taxpayer) => {
    await saveTaxpayer(newTaxpayer);
  };

  // Delete taxpayer callback
  const handleDeleteTaxpayer = async (id: string) => {
    await deleteTaxpayer(id);
  };

  // Add transaction callback
  const handleAddPaymentAndLog = async (log: PaymentLog) => {
    await addPaymentLog(log);
  };

  // Callback to inspect object directly from list/dashboard on the GIS Map
  const handleInspectOnMap = (tpOrId: Taxpayer | string) => {
    if (typeof tpOrId === 'string') {
      const found = taxpayers.find((t) => t.id === tpOrId);
      if (found) {
        setInspectTaxpayer(found);
      }
    } else {
      setInspectTaxpayer(tpOrId);
    }
    setActiveTab('map');
  };

  return (
    <div className="bg-slate-50 dark:bg-[#050505] text-slate-800 dark:text-slate-100 min-h-screen flex flex-col">
      <AndroidShell
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isLoggedIn={!!loggedInUser}
        userRole={loggedInUser?.role || null}
        onLogout={handleLogoutPetugas}
        onLoginDemo={handleLoginPetugas}
      >
        {/* ACTIVE MODULE CONTAINER ROUTING */}
        <div className="flex-1 pb-20 md:pb-4 flex flex-col">
          {activeTab === 'dashboard' && (
            <Dashboard 
              taxpayers={taxpayers} 
              paymentLogs={paymentLogs} 
              onNavigate={setActiveTab}
              onSelectNop={handleInspectOnMap}
            />
          )}

          {activeTab === 'map' && (
            <GisMap
              taxpayers={taxpayers}
              onSaveTaxpayer={saveTaxpayer}
              onAddPaymentLog={handleAddPaymentAndLog}
              isLoggedIn={!!loggedInUser}
              initialSelectedTaxpayer={inspectTaxpayer}
              onClearInitialSelected={() => setInspectTaxpayer(null)}
              darkMode={darkMode}
            />
          )}

          {activeTab === 'list' && (
            <TaxpayerList
              taxpayers={taxpayers}
              onDelete={handleDeleteTaxpayer}
              onInspect={handleInspectOnMap}
              onSave={handleAddTaxpayer}
              onSaveBatch={saveTaxpayersBatch}
              isLoggedIn={!!loggedInUser}
            />
          )}

          {activeTab === 'profile-add' && (
            <TaxpayerForm
              onAdd={handleAddTaxpayer}
              onCancel={() => setActiveTab('dashboard')}
              isLoggedIn={!!loggedInUser}
              onLoginDemo={handleLoginPetugas}
            />
          )}
        </div>

        {/* PHONIC TAP NAVIGATION BAR ON HANDPHONE MODE */}
        <nav className="md:hidden fixed bottom-1.5 inset-x-2 mr-0.5 bg-white/95 dark:bg-[#0C0C0C]/95 backdrop-blur-md border border-slate-200 dark:border-white/10 h-16 rounded-2xl flex justify-around items-center px-4 z-40 select-none shadow-[0_4px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center gap-0.5 w-14 transition cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'text-cyan-500 dark:text-cyan-400 font-extrabold' 
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5" />
            <span className="text-[10px]">Ringkasan</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center justify-center gap-0.5 w-14 transition cursor-pointer ${
              activeTab === 'map' 
                ? 'text-cyan-500 dark:text-cyan-400 font-extrabold' 
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
            }`}
          >
            <Map className="h-4.5 w-4.5" />
            <span className="text-[10px]">Peta GIS</span>
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`flex flex-col items-center justify-center gap-0.5 w-14 transition cursor-pointer ${
              activeTab === 'list' 
                ? 'text-cyan-500 dark:text-cyan-400 font-extrabold' 
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
            }`}
          >
            <FileText className="h-4.5 w-4.5" />
            <span className="text-[10px]">Database</span>
          </button>

          <button
            onClick={() => setActiveTab('profile-add')}
            className={`flex flex-col items-center justify-center gap-0.5 w-14 transition cursor-pointer ${
              activeTab === 'profile-add' 
                ? 'text-cyan-500 dark:text-cyan-400 font-extrabold' 
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
            }`}
          >
            <PlusCircle className="h-4.5 w-4.5" />
            <span className="text-[10px]">Register</span>
          </button>
        </nav>
      </AndroidShell>
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        onLoginSuccess={(user) => setLoggedInUser(user)} 
      />
    </div>
  );
}
