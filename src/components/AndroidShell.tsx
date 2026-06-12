import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Wifi, 
  Battery, 
  Clock, 
  ChevronLeft, 
  Home, 
  Square,
  Sparkles,
  Database,
  Smartphone,
  Moon,
  Sun,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { isFirebaseConfigured } from '../lib/firebase';

interface AndroidShellProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  isLoggedIn: boolean;
  userRole: string | null;
  onLogout: () => void;
  onLoginDemo: () => void;
}

export default function AndroidShell({
  children,
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  isLoggedIn,
  userRole,
  onLogout,
  onLoginDemo
}: AndroidShellProps) {
  const [time, setTime] = useState<string>("12:00 WIB");
  const [batteryLevel, setBatteryLevel] = useState<number>(85);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const cloudConnected = isFirebaseConfigured();

  // Dynamic status bar time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours().toString().padStart(2, '0');
      let minutes = now.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes} WIB`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Soft battery decay simulation for extreme fidelity
  useEffect(() => {
    const interval = setInterval(() => {
      setBatteryLevel((prev) => {
        if (prev <= 10) return 98; // resets if too low
        return prev - 1;
      });
    }, 120000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-800 dark:text-slate-200 transition-colors duration-300 flex flex-col font-sans">
      {/* Sleek Top Web Header - Visible on all screens, styles adjusted for mobile */}
      <header className="w-full bg-white/95 dark:bg-[#0C0C0C]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/5 sticky top-0 z-50 px-4 py-3.5 sm:px-6 flex justify-between items-center select-none">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse" />
          <h1 className="text-base sm:text-lg font-serif italic tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            SIG-PBB Desa Suci
          </h1>
          <span className="hidden sm:inline-block text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider">
            Web Portal v2.4
          </span>
        </div>

        {/* Desktop & Tablet Top Navigation Menu - Hidden on Mobile */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-[#121212] p-1 rounded-xl border border-slate-200 dark:border-white/5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-white dark:bg-[#161616] text-[#06b6d4] border border-slate-200 dark:border-white/10 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Ringkasan
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'map' ? 'bg-white dark:bg-[#161616] text-[#06b6d4] border border-slate-200 dark:border-white/10 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Peta GIS
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'list' ? 'bg-white dark:bg-[#161616] text-[#06b6d4] border border-slate-200 dark:border-white/10 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            PBB Database
          </button>
          <button
            onClick={() => setActiveTab('profile-add')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'profile-add' ? 'bg-white dark:bg-[#161616] text-[#06b6d4] border border-slate-200 dark:border-white/10 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Register Lahan
          </button>
        </div>

        {/* Right Side Header controls */}
        <div className="flex items-center gap-3">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-mono hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{time}</span>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#161616] hover:bg-slate-200 dark:hover:bg-white/5 transition text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5 cursor-pointer"
            title="Ubah Tema"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-cyan-400" />}
          </button>
        </div>
      </header>

      {/* Main Responsive Grid Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 py-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Application Feed container */}
        <div className="lg:col-span-3 bg-white dark:bg-[#0A0A0A] rounded-3xl border border-slate-200 dark:border-white/5 shadow-2xl flex flex-col relative overflow-hidden">
          <div className="flex-1 flex flex-col min-h-[500px]">
            {children}
          </div>
        </div>

        {/* Right sidebar panel - Sticky control center on desktop/tablet, wraps below on mobile screen */}
        <aside className="lg:col-span-1 space-y-6 flex flex-col">
          {/* Petugas Login card */}
          <div className="bg-white dark:bg-[#0A0A0A] rounded-3xl p-5 border border-slate-200 dark:border-white/5 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-cyan-500/10 p-1.5 rounded-xl text-cyan-400">
                <UserCheck className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Panel Autentikasi</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Petugas PBB dapat login masuk untuk melakukan digitasi peta, geotagging persil tanah, dan menginput database wajib pajak.
            </p>

            {isLoggedIn ? (
              <div className="space-y-3 bg-slate-50 dark:bg-[#121212] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                <div className="text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono tracking-wider">Status Hak Akses</span>
                  <span className="font-bold text-cyan-500 dark:text-cyan-400 flex items-center gap-1 mt-1 font-mono uppercase">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {userRole} Terverifikasi
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono tracking-wider">Petugas Aktif</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-1 block">Ir. Doni Hermawan</span>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full text-center text-xs py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/10 text-rose-400 rounded-xl font-bold transition cursor-pointer"
                >
                  Logout Petugas
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginDemo}
                className="w-full flex items-center justify-center gap-2 text-xs py-2.5 px-4 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-black rounded-xl transition cursor-pointer font-sans"
              >
                MASUK SEBAGAI PETUGAS
              </button>
            )}
          </div>

          {/* Tips Info Card */}
          <div className="bg-white dark:bg-[#0A0A0A] rounded-3xl p-5 border border-slate-200 dark:border-white/5 shadow-xl flex-grow flex flex-col justify-start">
            <h4 className="text-[10px] uppercase tracking-widest text-[#06b6d4] font-black mb-3.5 font-mono">Petunjuk & Navigasi</h4>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-3.5 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-cyan-400 font-extrabold select-none">•</span>
                <span>Pilih menu <strong className="text-slate-800 dark:text-slate-200">Peta GIS</strong> untuk melacak lokasi persil tanah. Klik bidang tanah untuk melihat info tagihan dan administrasi.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400 font-extrabold select-none">•</span>
                <span>Sebagai petugas, Anda dapat mengklik <strong className="text-slate-800 dark:text-slate-200">Lahan Baru</strong> di halaman peta, lalu klik koordinat peta untuk menggambar garis batas persil.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400 font-extrabold select-none">•</span>
                <span>Wajib Pajak dapat mensimulasikan pelunasan secara instan menggunakan modul transfer bank atau QRIS Mandiri Dinamis.</span>
              </li>
            </ul>
          </div>
        </aside>
      </main>

      {/* Real Web Footer */}
      <footer className="w-full bg-white dark:bg-[#0C0C0C] border-t border-slate-200 dark:border-white/5 py-4 px-6 text-center text-[10px] text-slate-500 font-mono flex flex-col sm:flex-row justify-between items-center gap-3">
        <span>© 2026 Badan Pendapatan Daerah Wilayah Desa Suci. All rights reserved.</span>
        <div className="flex gap-4 items-center">
          <span className={cloudConnected ? "text-cyan-500 dark:text-cyan-400" : "text-amber-500"}>
            ● Status Data: {cloudConnected ? 'Firestore Terkoneksi (Real-time Cloud)' : 'Penyimpanan Offline Lokal'}
          </span>
          <span className="hidden sm:inline text-slate-650">|</span>
          <span>SIG-PBB Terverifikasi</span>
        </div>
      </footer>
    </div>
  );
}
