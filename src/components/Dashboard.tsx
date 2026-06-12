import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  PlusCircle,
  QrCode,
  CreditCard,
  Building2,
  Lock,
  Compass,
  FileCheck2
} from 'lucide-react';
import { Taxpayer, PaymentLog } from '../types';

interface DashboardProps {
  taxpayers: Taxpayer[];
  paymentLogs: PaymentLog[];
  onNavigate: (tab: string) => void;
  onSelectNop: (id: string) => void;
}

export default function Dashboard({ taxpayers, paymentLogs, onNavigate, onSelectNop }: DashboardProps) {
  // Analytical Calculations
  const totalObjects = taxpayers.length;
  const paidObjects = taxpayers.filter((t) => t.isPaid).length;
  const unpaidObjects = totalObjects - paidObjects;

  const complianceRate = totalObjects > 0 ? Math.round((paidObjects / totalObjects) * 100) : 0;

  const totalRevenue = taxpayers
    .filter((t) => t.isPaid)
    .reduce((sum, current) => sum + current.totalTax, 0);

  const pendingRevenue = taxpayers
    .filter((t) => !t.isPaid)
    .reduce((sum, current) => sum + current.totalTax, 0);

  // Formatting helpers
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="flex flex-col gap-5 p-5 animate-fadeIn text-slate-700 dark:text-slate-200">
      {/* HEADER GREET */}
      <div className="flex justify-between items-center bg-slate-100 dark:bg-[#0A0A0A] -mx-5 -mt-5 px-5 pt-8 pb-14 rounded-b-[32px] border-b border-slate-200 dark:border-white/5 text-slate-900 dark:text-white">
        <div>
          <span className="text-[9.5px] uppercase tracking-widest bg-cyan-500/10 dark:bg-cyan-400/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/15 dark:border-cyan-500/10 px-2.5 py-1 rounded-full font-bold">
            Sistem Informasi Geospasial
          </span>
          <h2 className="text-xl font-serif italic tracking-tight mt-3 text-slate-900 dark:text-white">
            Bumi & Bangunan (PBB)
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Validasi lokasi dan pembayaran real-time wajib pajak.
          </p>
        </div>
        <div className="bg-slate-200/50 dark:bg-white/5 p-2 rounded-2xl border border-slate-300 dark:border-white/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
          <Compass className="h-6 w-6 animate-spin-slow text-cyan-600 dark:text-cyan-400" />
        </div>
      </div>

      {/* FLOATING ACTION OVERVIEW CARD */}
      <div className="bg-white dark:bg-[#161616] rounded-3xl p-5 border border-slate-200 dark:border-white/5 shadow-xl -mt-11 mx-1 flex flex-col relative z-30">
        <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 dark:text-[#06b6d4]">
          Target Realisasi Penerimaan
        </span>
        <div className="flex justify-between items-baseline mt-2">
          <span className="text-2xl font-sans font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatIDR(totalRevenue)}
          </span>
          <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 px-2.5 py-1 rounded-lg flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            {complianceRate}%
          </span>
        </div>

        {/* Minimal Progress representation */}
        <div className="w-full bg-slate-100 dark:bg-[#121212]/90 h-2 rounded-full overflow-hidden mt-4 flex border border-slate-200 dark:border-white/5">
          <div 
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-1000"
            style={{ width: `${complianceRate}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2.5">
          <span>Tercapai: {paidObjects} Objek (Lunas)</span>
          <span className="text-slate-500 dark:text-slate-400">Sisa: <span className="font-mono text-cyan-600 dark:text-cyan-450 font-bold">{formatIDR(pendingRevenue)}</span></span>
        </div>
      </div>

      {/* BENTO STATISTICS GRID */}
      <div className="grid grid-cols-2 gap-3">
        {/* Compliance Card */}
        <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col justify-between shadow-sm">
          <div className="text-cyan-600 dark:text-cyan-400 p-1.5 bg-cyan-500/10 rounded-xl w-fit">
            <FileCheck2 className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Kepatuhan</span>
            <span className="text-lg font-extrabold text-slate-800 dark:text-white leading-none mt-1.5 block">
              {paidObjects} <span className="text-xs text-slate-500">/ {totalObjects} Lunas</span>
            </span>
          </div>
        </div>

        {/* Unpaid Card */}
        <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col justify-between shadow-sm">
          <div className="text-rose-600 dark:text-rose-450 p-1.5 bg-rose-500/10 rounded-xl w-fit">
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-3">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Tunggakan</span>
            <span className="text-lg font-extrabold text-rose-600 dark:text-rose-450 leading-none mt-1.5 block">
              {unpaidObjects} <span className="text-xs text-slate-500">Objek</span>
            </span>
          </div>
        </div>
      </div>

      {/* QUICK TILES CHANNELS */}
      <div className="bg-slate-100 dark:bg-[#0A0A0A] p-1.5 rounded-2xl flex gap-1.5 border border-slate-200 dark:border-white/5">
        <button
          onClick={() => onNavigate('map')}
          className="flex-1 flex flex-col items-center justify-center py-3 bg-white dark:bg-[#161616] hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition border border-slate-200 dark:border-white/5 pointer-events-auto cursor-pointer shadow-sm"
        >
          <MapPin className="h-5 w-5 text-cyan-600 dark:text-cyan-400 mb-1" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">Peta GIS</span>
          <span className="text-[9px] text-slate-500 mt-0.5">Geotagging</span>
        </button>

        <button
          onClick={() => onNavigate('list')}
          className="flex-1 flex flex-col items-center justify-center py-3 bg-white dark:bg-[#161616] hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition border border-slate-200 dark:border-white/5 pointer-events-auto cursor-pointer shadow-sm"
        >
          <Users className="h-5 w-5 text-indigo-500 dark:text-indigo-400 mb-1" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">Wajib Pajak</span>
          <span className="text-[9px] text-slate-500 mt-0.5">Profil WP</span>
        </button>

        <button
          onClick={() => onNavigate('profile-add')}
          className="flex-1 flex flex-col items-center justify-center py-3 bg-white dark:bg-[#161616] hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition border border-slate-200 dark:border-white/5 pointer-events-auto cursor-pointer shadow-sm"
        >
          <PlusCircle className="h-5 w-5 text-sky-500 dark:text-sky-400 mb-1" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">Tambah WP</span>
          <span className="text-[9px] text-slate-500 mt-0.5">Entri Bidang</span>
        </button>
      </div>

      {/* RECENT TRANSACTION STATS / TIMELINE */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs uppercase tracking-wider font-extrabold text-cyan-600 dark:text-[#06b6d4] flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Aktivitas Real-time
          </h3>
          <button
            onClick={() => onNavigate('list')}
            className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 flex items-center gap-0.5 cursor-pointer"
          >
            Semua
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {paymentLogs.length === 0 ? (
          <div className="bg-white dark:bg-[#161616] py-8 px-4 rounded-3xl text-center border border-slate-200 dark:border-white/5 shadow-sm">
            <AlertCircle className="h-8 w-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Belum ada riwayat transaksi hari ini.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {paymentLogs.slice(0, 3).map((log) => (
              <div 
                key={log.id} 
                onClick={() => onSelectNop(log.nop)}
                className="bg-white dark:bg-[#161616] hover:bg-slate-50 dark:hover:bg-white/5 p-3.5 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between cursor-pointer transition shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-cyan-500/10 p-2 rounded-xl text-cyan-600 dark:text-cyan-400">
                    {log.method.includes('QRIS') ? <QrCode className="h-4.5 w-4.5" /> : <CreditCard className="h-4.5 w-4.5" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {log.taxpayerName}
                    </h4>
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                      NOP: {log.nop}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-[#0891b2] dark:text-cyan-400 block pb-0.5">
                    +{formatIDR(log.amount)}
                  </span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-bold dark:font-normal">
                    {log.method}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* INTERACTIVE COMPLIANCE ANALYTICS METER */}
      <div className="bg-white dark:bg-[#161616] rounded-3xl p-5 border border-slate-200 dark:border-white/5 shadow-sm">
        <h4 className="text-[11px] uppercase tracking-widest text-cyan-600 dark:text-[#06b6d4] font-bold mb-3.5">Analisa Kepatuhan Lokasi</h4>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-555 dark:bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" style={{ backgroundColor: '#06b6d4' }} />
                Lahan Terbayar (Persil Hijau)
              </span>
              <span>{paidObjects} Bidang ({Math.round((paidObjects/totalObjects)*100)}%)</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-[#121212] h-1.5 rounded-full overflow-hidden border border-slate-200 dark:border-[rgba(255,255,255,0.02)]">
              <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${(paidObjects/totalObjects)*100}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Lahan Menunggak (Persil Merah)
              </span>
              <span>{unpaidObjects} Bidang ({Math.round((unpaidObjects/totalObjects)*100)}%)</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-[#121212] h-1.5 rounded-full overflow-hidden border border-slate-200 dark:border-[rgba(255,255,255,0.02)]">
              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(unpaidObjects/totalObjects)*100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
