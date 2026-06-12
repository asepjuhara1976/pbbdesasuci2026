import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  User, 
  FileText, 
  Layers, 
  CheckCircle2, 
  HelpCircle,
  Hash,
  AlertTriangle
} from 'lucide-react';
import { Taxpayer } from '../types';

interface TaxpayerFormProps {
  onAdd: (taxpayer: Taxpayer) => Promise<void>;
  onCancel: () => void;
  isLoggedIn: boolean;
  onLoginDemo: () => void;
}

export default function TaxpayerForm({ onAdd, onCancel, isLoggedIn, onLoginDemo }: TaxpayerFormProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [objectAddress, setObjectAddress] = useState('');
  
  // Sizing and NJOP calculations
  const [landArea, setLandArea] = useState<number>(100);
  const [buildingArea, setBuildingArea] = useState<number>(60);
  const [njopLand, setNjopLand] = useState<number>(3000000); // default per m2
  const [njopBuilding, setNjopBuilding] = useState<number>(2000000); // default per m2

  const [lat, setLat] = useState<number>(-6.8942);
  const [lng, setLng] = useState<number>(107.6186);

  const [errorText, setErrorText] = useState('');
  const [isDone, setIsDone] = useState(false);

  // Auto-calculated fields
  const totalLandPrice = landArea * njopLand;
  const totalBuildingPrice = buildingArea * njopBuilding;
  const totalNjopValue = totalLandPrice + totalBuildingPrice;
  // Standard PBB calculation rate (simplification 0.1% of total NJOP)
  const calculatedTax = Math.round(totalNjopValue * 0.001);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (!isLoggedIn) {
      setErrorText('Anda harus login sebagai Petugas Lapangan terlebih dahulu untuk menambah objek!');
      return;
    }

    if (!name || !address || !objectAddress) {
      setErrorText('Harap lengkapi seluruh formulir wajib!');
      return;
    }

    // Generate NOP (Nomor Objek Pajak) uniquely
    const randomNopSuffix = Math.floor(1000 + Math.random() * 9000);
    const nop = `32.73.010.021.001-${randomNopSuffix}.0`;

    const newTaxpayer: Taxpayer = {
      id: nop,
      name,
      address,
      objectAddress: `${objectAddress} (Persil Tambahan)`,
      landArea: Number(landArea),
      buildingArea: Number(buildingArea),
      njopLand: Number(njopLand),
      njopBuilding: Number(njopBuilding),
      totalTax: calculatedTax,
      isPaid: false, // defaults to unpaid
      lat: Number(lat),
      lng: Number(lng),
      updatedAt: new Date().toISOString()
    };

    try {
      await onAdd(newTaxpayer);
      setIsDone(true);
      setTimeout(() => {
        onCancel(); // navigate back after completion
      }, 1500);
    } catch (err: any) {
      setErrorText('Gagal mendaftarkan objek PBB baru. Silakan periksa koneksi.');
    }
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Helper to generate dynamic coordinates around Bandung Desa Suci
  const randomizeCoordinates = () => {
    const latOffset = (Math.random() - 0.5) * 0.01;
    const lngOffset = (Math.random() - 0.5) * 0.01;
    setLat(Number((-7.216212 + latOffset).toFixed(6)));
    setLng(Number((107.923912 + lngOffset).toFixed(6)));
  };

  return (
    <div className="flex flex-col p-5 animate-fadeIn bg-white dark:bg-[#0C0C0C] min-h-full text-slate-800 dark:text-slate-200">
      {/* Upper header */}
      <div className="flex items-center gap-1.5 mb-5">
        <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        <h3 className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest font-mono">
          Registrasi Objek PBB Baru
        </h3>
      </div>

      {!isLoggedIn ? (
        <div className="bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-white/5 p-5 rounded-2xl text-center space-y-4 shadow-sm">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs font-mono uppercase tracking-wider">Akses Diperketat</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Sesuai regulasi sistem, penambahan kearsipan wilayah lahan dilarang bagi publik demi menghindari manipulasi. Harap login sebagai petugas administrasi dahulu.
          </p>
          <button
            type="button"
            onClick={onLoginDemo}
            className="w-full py-3 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer transition uppercase tracking-wider"
          >
            Aktifkan Akses Petugas
          </button>
        </div>
      ) : isDone ? (
        <div className="bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-cyan-500/20 p-6 rounded-2xl text-center space-y-3 shadow-sm">
          <CheckCircle2 className="h-12 w-12 text-cyan-500 dark:text-cyan-400 mx-auto animate-bounce" />
          <h4 className="font-extrabold text-cyan-600 dark:text-cyan-400 text-sm">Registrasi Berhasil</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Arsip geospasial wajib pajak baru telah disimpan real-time ke database.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorText && (
            <div className="bg-rose-500/15 p-3 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-500/25">
              ⚠️ {errorText}
            </div>
          )}

          {/* Section 1: Pemilik data */}
          <div className="space-y-3 bg-slate-50 dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-200 dark:border-white/5 pb-2">
              <User className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              Informasi Wajib Pajak
            </h4>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Nama Lengkap</label>
              <div className="flex items-center gap-2 p-2.5 bg-white dark:bg-[#0C0C0C] rounded-xl border border-slate-200 dark:border-white/5">
                <User className="h-4 w-4 text-slate-400 dark:text-slate-550" />
                <input 
                  type="text" 
                  placeholder="Contoh: Siti Syarifah"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs w-full text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Alamat Domisili KTP</label>
              <div className="flex items-start gap-2 p-2.5 bg-white dark:bg-[#0C0C0C] rounded-xl border border-slate-200 dark:border-white/5">
                <FileText className="h-4 w-4 text-slate-400 dark:text-slate-500 mt-1" />
                <textarea 
                  rows={2}
                  placeholder="Alamat domisili wajib pajak saat ini..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs w-full text-slate-800 dark:text-slate-200 resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Objek Pajak geospasial */}
          <div className="space-y-3 bg-slate-50 dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-200 dark:border-white/5 pb-2">
              <Building2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              Arsip Fisik Objek Bumi & Bangunan
            </h4>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Letak Wilayah Objek</label>
              <div className="flex items-start gap-2 p-2.5 bg-white dark:bg-[#0C0C0C] rounded-xl border border-slate-200 dark:border-white/5">
                <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500 mt-1" />
                <textarea 
                  rows={2}
                  placeholder="Desa Suci, Garut (Nomor kavling/persil)..."
                  value={objectAddress}
                  onChange={(e) => setObjectAddress(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs w-full text-slate-800 dark:text-slate-200 resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Luas Tanah (m²)</label>
                <input 
                  type="number" 
                  value={landArea}
                  onChange={(e) => setLandArea(Math.max(1, Number(e.target.value)))}
                  className="p-2.5 bg-white dark:bg-[#0C0C0C] rounded-xl border border-slate-200 dark:border-white/5 text-xs w-full text-slate-800 dark:text-slate-200 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Luas Bangunan (m²)</label>
                <input 
                  type="number" 
                  value={buildingArea}
                  onChange={(e) => setBuildingArea(Math.max(0, Number(e.target.value)))}
                  className="p-2.5 bg-white dark:bg-[#0C0C0C] rounded-xl border border-slate-200 dark:border-white/5 text-xs w-full text-slate-800 dark:text-slate-200 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">NJOP Bumi / m²</label>
                <input 
                  type="number" 
                  step="50000"
                  value={njopLand}
                  onChange={(e) => setNjopLand(Math.max(1, Number(e.target.value)))}
                  className="p-2.5 bg-white dark:bg-[#0C0C0C] rounded-xl border border-slate-200 dark:border-white/5 text-xs w-full text-slate-800 dark:text-slate-200 text-right font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">NJOP Bangunan / m²</label>
                <input 
                  type="number" 
                  step="50000"
                  value={njopBuilding}
                  onChange={(e) => setNjopBuilding(Math.max(0, Number(e.target.value)))}
                  className="p-2.5 bg-white dark:bg-[#0C0C0C] rounded-xl border border-slate-200 dark:border-white/5 text-xs w-full text-slate-800 dark:text-slate-200 text-right font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Geotags */}
          <div className="space-y-3 bg-slate-50 dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/5 pb-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                Data Geospasial Lahan
              </h4>
              <button
                type="button"
                onClick={randomizeCoordinates}
                className="text-[9px] font-bold font-mono bg-white dark:bg-[#0C0C0C] text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-white/5 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition shadow-sm"
              >
                Acak Koordinat GPS
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-slate-500 text-[9px] block uppercase">LATITUDE LINTANG</span>
                <input 
                  type="number" 
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  className="p-2.5 bg-white dark:bg-[#0C0C0C] rounded-xl border border-slate-200 dark:border-white/5 w-full text-slate-800 dark:text-slate-200 font-bold"
                />
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 text-[9px] block uppercase">LONGITUDE BUJUR</span>
                <input 
                  type="number" 
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                  className="p-2.5 bg-white dark:bg-[#0C0C0C] rounded-xl border border-slate-200 dark:border-white/5 w-full text-slate-800 dark:text-slate-200 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Live TAX PREVIEW ASSESSMENT SHEET */}
          <div className="bg-slate-50 dark:bg-[#121212] p-4 rounded-3xl border border-slate-200 dark:border-white/5 text-xs shadow-inner">
            <h5 className="font-extrabold text-slate-700 dark:text-slate-300">Estimasi Tagihan PBB Pertahun</h5>
            <div className="space-y-1 mt-2.5 text-slate-500 dark:text-slate-450">
              <div className="flex justify-between">
                <span>Total NJOP Bumi:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{formatIDR(totalLandPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total NJOP Bangunan:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{formatIDR(totalBuildingPrice)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-dashed border-slate-200 dark:border-white/5 text-cyan-600 dark:text-cyan-400 font-extrabold mt-1">
                <span>Rencana Nilai Ketetapan PBB (0.1%):</span>
                <span>{formatIDR(calculatedTax)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 text-xs bg-slate-50 dark:bg-[#161616] hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 font-bold rounded-xl border border-slate-200 dark:border-white/5 transition cursor-pointer"
            >
              Kembali
            </button>
            <button
              type="submit"
              className="flex-grow py-3 px-6 text-xs bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-black rounded-xl transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Daftarkan Objek Lahan
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
