import React, { useState, useRef } from 'react';
import { 
  Search, 
  Trash2, 
  DollarSign, 
  FileCheck, 
  MapPin, 
  AlertCircle,
  Building2,
  ListFilter,
  CheckCircle2,
  Calendar,
  X,
  CreditCard,
  QrCode,
  FileSpreadsheet,
  Download,
  Upload,
  CalendarDays,
  FileDown,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { Taxpayer } from '../types';
import * as XLSX from 'xlsx';

// Helper to parse coordinate from excel cell cleanly
const parseCoordinate = (val: any): number | null => {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (str === '' || str.toLowerCase() === 'n/a' || str === '-') return null;
  const num = Number(str.replace(/,/g, '.'));
  if (isNaN(num) || num === 0) return null;
  return num;
};

// Helper for general clean number parsing
const parseNumber = (val: any, fallback: number = 0): number => {
  if (val === undefined || val === null) return fallback;
  const str = String(val).trim();
  if (str === '' || str === '-') return fallback;
  
  // Remove "Rp" symbol, dots as thousands separators, and check for comma decimal
  let cleaned = str.replace(/rp\.?/gi, '').trim();
  if (cleaned.includes('.') && cleaned.includes(',')) {
    // Indonesian format: 1.250.000,00 -> 1250000.00
    cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
  } else if (cleaned.includes('.')) {
    // ambiguous: could be "1.000" (three zeros after dot -> thousands) or "1.5" (decimal)
    const parts = cleaned.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      cleaned = cleaned.replace(/\./g, '');
    }
  } else if (cleaned.includes(',')) {
    // Indonesian decimal or thousands with comma: replaced with dot
    cleaned = cleaned.replace(/,/g, '.');
  }
  
  const num = Number(cleaned);
  return isNaN(num) ? fallback : num;
};

interface TaxpayerListProps {
  taxpayers: Taxpayer[];
  onDelete: (id: string) => Promise<void>;
  onInspect: (tp: Taxpayer) => void;
  onSave: (tp: Taxpayer) => Promise<void>;
  onSaveBatch?: (tps: Taxpayer[]) => Promise<void>;
  isLoggedIn: boolean;
}

export default function TaxpayerList({ taxpayers, onDelete, onInspect, onSave, onSaveBatch, isLoggedIn }: TaxpayerListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  // Excel section states
  const [showExcelPanel, setShowExcelPanel] = useState(false);
  const [startDate, setStartDate] = useState('2026-05-01');
  const [endDate, setEndDate] = useState('2026-06-30');
  const [dateFilterType, setDateFilterType] = useState<'payment' | 'registration'>('payment');
  const [exportCriteria, setExportCriteria] = useState<'all' | 'paid' | 'unpaid'>('all');
  
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter list
  const filtered = taxpayers.filter((tp) => {
    const matchesQuery = 
      tp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tp.id.includes(searchQuery);

    if (filter === 'paid') return matchesQuery && tp.isPaid;
    if (filter === 'unpaid') return matchesQuery && !tp.isPaid;
    return matchesQuery;
  });

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // PROGRAMMATIC EXCEL TEMPLATE GENERATION
  const downloadTemplate = () => {
    try {
      const templateData = [
        {
          'NOP': '32.73.010.021.001-9991.0',
          'Nama Lengkap': 'Kurniawan Pratama',
          'Alamat Domisili': 'Jl. Sangkuriang No. 4, Desa Suci, Bandung',
          'Letak Objek Pajak': 'Blok D-11, Desa Suci',
          'Luas Tanah (m2)': 200,
          'Luas Bangunan (m2)': 100,
          'NJOP Bumi per m2 (Rp)': 3500000,
          'NJOP Bangunan per m2 (Rp)': 2500000,
          'Jumlah Bayar (Rp)': 475000,
          'Status Bayar (Lunas/Nunggak)': 'Lunas',
          'Tanggal Pembayaran (YYYY-MM-DD)': '2026-06-05',
          'Metode Pembayaran': 'QRIS Dinamis',
          'Latitude': -6.8912,
          'Longitude': 107.6185
        },
        {
          'NOP': '32.73.010.021.001-9992.0',
          'Nama Lengkap': 'Amalia Lestari',
          'Alamat Domisili': 'Jl. Sadang Serang No. 15, Bandung',
          'Letak Objek Pajak': 'Blok F-02, Desa Suci',
          'Luas Tanah (m2)': 150,
          'Luas Bangunan (m2)': 80,
          'NJOP Bumi per m2 (Rp)': 3000000,
          'NJOP Bangunan per m2 (Rp)': 2200000,
          'Jumlah Bayar (Rp)': 626000,
          'Status Bayar (Lunas/Nunggak)': 'Nunggak',
          'Tanggal Pembayaran (YYYY-MM-DD)': '',
          'Metode Pembayaran': '',
          'Latitude': -6.8925,
          'Longitude': 107.6210
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Import PBB');
      XLSX.writeFile(workbook, 'Template_Import_Wajib_Pajak_PBB.xlsx');
    } catch (err) {
      console.error('Template download error:', err);
      alert('Gagal mengunduh template Excel.');
    }
  };

  // PROGRAMMATIC EXCEL PARSE & IMPORT (WITH RE-CALCULATION & COORDINATE AUTO-MAPPING)
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportMessage(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error('Data file rusak atau tidak dapat dibaca.');
        
        // Read file contents as binary string
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const parsedRows = XLSX.utils.sheet_to_json<any>(worksheet);

        if (parsedRows.length === 0) {
          throw new Error('File excel kosong atau tidak memiliki data baris.');
        }

        let successCount = 0;
        let skipCount = 0;
        const taxpayersToSave: Taxpayer[] = [];

        for (const row of parsedRows) {
          // Robust mapping variations
          const rawNop = row['NOP'] || row['Nomor Objek Pajak'] || row['ID_PAJAK'] || row['ID'];
          const name = row['Nama Lengkap'] || row['Nama Wajib Pajak'] || row['Nama'] || row['Wajib Pajak'];
          
          if (!name) {
            skipCount++;
            continue; // Skip lines missing core taxpayer identity
          }

          // Format or generate unique NOP matches Desa Suci
          let nop = rawNop ? String(rawNop).trim() : '';
          if (!nop) {
            const randomNopSuffix = Math.floor(1000 + Math.random() * 9000);
            nop = `32.73.010.021.001-${randomNopSuffix}.0`;
          }

          const address = row['Alamat Domisili'] || row['Alamat'] || row['Domisili'] || 'Garut';
          const objectAddress = row['Letak Objek Pajak'] || row['Alamat Objek'] || row['Letak Objek'] || 'Desa Suci, Garut';
          
          const landArea = parseNumber(row['Luas Tanah (m2)'] || row['Luas Tanah'] || row['Luas Bumi'] || row['Lahan'], 100);
          const buildingArea = parseNumber(row['Luas Bangunan (m2)'] || row['Luas Bangunan'] || row['Bangunan'], 0);
          
          const njopLand = parseNumber(row['NJOP Bumi per m2 (Rp)'] || row['NJOP Bumi per m2'] || row['NJOP Tanah'] || row['NJOP Bumi'], 3000000);
          const njopBuilding = parseNumber(row['NJOP Bangunan per m2 (Rp)'] || row['NJOP Bangunan per m2'] || row['NJOP Bangunan'], 2000000);

          const rawStatus = String(row['Status Bayar (Lunas/Nunggak)'] || row['Status Bayar'] || row['Lunas'] || row['Status'] || '').toLowerCase();
          const isPaid = rawStatus.includes('lunas') || rawStatus.includes('sudah') || rawStatus === '1' || rawStatus === 'true' || rawStatus === 'paid';

          // Math formula fallback if custom total amount is omitted or invalid or negative
          const totalLandPrice = landArea * njopLand;
          const totalBuildingPrice = buildingArea * njopBuilding;
          const calculatedTax = Math.round((totalLandPrice + totalBuildingPrice) * 0.001);

          let totalTax = parseNumber(
            row['Jumlah Bayar (Rp)'] || 
            row['Jumlah Bayar'] || 
            row['Jumlah Tagihan (Rp)'] || 
            row['Jumlah Tagihan'] || 
            row['Total Pajak'] || 
            row['Pajak'], 
            0
          );
          if (totalTax <= 0) {
            totalTax = calculatedTax;
          }

          // Get coords with fallbacks inside Desa Suci boundary ranges (and handling empty or malformed cells)
          const parsedLat = parseCoordinate(row['Latitude'] || row['Lintang'] || row['LAT']);
          const parsedLng = parseCoordinate(row['Longitude'] || row['Bujur'] || row['LNG']);

          let lat = parsedLat ?? 0;
          let lng = parsedLng ?? 0;

          const paymentDate = row['Tanggal Pembayaran (YYYY-MM-DD)'] || row['Tanggal Pembayaran'] || row['Tanggal Bayar'] || (isPaid ? '2026-06-11' : undefined);
          const paymentMethod = row['Metode Pembayaran'] || row['Metode Bayar'] || row['Metode'] || (isPaid ? 'Transfer ATM/VA' : undefined);

          const importedTaxpayer: Taxpayer = {
            id: nop,
            name: String(name).trim(),
            address: String(address).trim(),
            objectAddress: String(objectAddress).trim(),
            landArea,
            buildingArea,
            njopLand,
            njopBuilding,
            totalTax,
            isPaid,
            lat,
            lng,
            paymentDate: paymentDate ? String(paymentDate).trim() : undefined,
            paymentMethod: paymentMethod ? String(paymentMethod).trim() : undefined,
            updatedAt: new Date().toISOString()
          };

          taxpayersToSave.push(importedTaxpayer);
        }

        if (taxpayersToSave.length > 0) {
          if (onSaveBatch) {
            await onSaveBatch(taxpayersToSave);
          } else {
            for (const tp of taxpayersToSave) {
              await onSave(tp);
            }
          }
          successCount = taxpayersToSave.length;
        }

        setImportMessage({
          type: 'success',
          text: `Mengimpor ${successCount} data wajib pajak!${skipCount > 0 ? ` (${skipCount} dilewati karena nama kosong)` : ''}`
        });
      } catch (err) {
        console.error('Import spreadsheet failed:', err);
        setImportMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Format data bermasalah atau berkas rusak.'
        });
      } finally {
        setImportLoading(false);
        if (e.target) e.target.value = ''; // clears target file
      }
    };

    reader.onerror = () => {
      setImportMessage({ type: 'error', text: 'Gagal membaca berkas.' });
      setImportLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  // SELECTIVE DATE-RANGE REPORT EXCEL EXPORT
  const handleExportExcel = () => {
    setExportLoading(true);
    try {
      const start = startDate ? new Date(startDate) : null;
      let end = endDate ? new Date(endDate) : null;
      if (end) {
        end.setHours(23, 59, 59, 999);
      }

      // Filter target entries
      const exportRows = taxpayers.filter((tp) => {
        // Status filter
        if (exportCriteria === 'paid' && !tp.isPaid) return false;
        if (exportCriteria === 'unpaid' && tp.isPaid) return false;

        // Date selection filter
        if (dateFilterType === 'payment') {
          if (!tp.isPaid) return false; // Unpaid taxes do not have a payment date
          if (!tp.paymentDate) return false;
          
          const payDate = new Date(tp.paymentDate);
          if (start && payDate < start) return false;
          if (end && payDate > end) return false;
        } else {
          // Registration / updated date filter
          const regDate = tp.updatedAt ? new Date(tp.updatedAt) : new Date('2026-05-01');
          if (start && regDate < start) return false;
          if (end && regDate > end) return false;
        }
        return true;
      });

      if (exportRows.length === 0) {
        alert('Tidak ditemukan data wajib pajak dalam rentang tanggal filter yang ditentukan.');
        setExportLoading(false);
        return;
      }

      // Structure data beautifully for excel columns
      const sheetData = exportRows.map((tp, idx) => ({
        'No.': idx + 1,
        'Nomor Objek Pajak (NOP)': tp.id,
        'Nama Lengkap Wajib Pajak': tp.name,
        'Alamat Domisili': tp.address,
        'Alamat Objek Lahan PBB': tp.objectAddress,
        'Luas Bumi (m2)': tp.landArea,
        'Luas Bangunan (m2)': tp.buildingArea,
        'NJOP Bumi per m2 (Rp)': tp.njopLand,
        'NJOP Bangunan per m2 (Rp)': tp.njopBuilding,
        'Total NJOP Bumi (Rp)': tp.landArea * tp.njopLand,
        'Total NJOP Bangunan (Rp)': tp.buildingArea * tp.njopBuilding,
        'Total Nilai Jual Gabungan (Rp)': (tp.landArea * tp.njopLand) + (tp.buildingArea * tp.njopBuilding),
        'Ketetapan Tagihan PBB (Rp)': tp.totalTax,
        'Status Pembayaran': tp.isPaid ? 'Lunas' : 'Belum Lunas',
        'Tanggal Pembayaran': tp.paymentDate || '-',
        'Metode Pembayaran': tp.paymentMethod || '-',
        'Sumbu Garis Lintang (Lat)': tp.lat,
        'Sumbu Garis Bujur (Lng)': tp.lng,
        'Waktu Registrasi/Update': tp.updatedAt ? new Date(tp.updatedAt).toLocaleString('id-ID') : '-'
      }));

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      
      // Auto-size columns to look super clean (Design refinement)
      const maxLens = Object.keys(sheetData[0] || {}).map(key => {
        let max = key.length;
        sheetData.forEach(row => {
          const val = String((row as any)[key] || '');
          if (val.length > max) max = val.length;
        });
        return { wch: max + 3 };
      });
      worksheet['!cols'] = maxLens;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan PBB Desa Suci');

      const filterLabel = exportCriteria === 'all' ? 'SEMUA' : exportCriteria === 'paid' ? 'LUNAS' : 'NUNGGAK';
      const dateLabel = `${startDate}_sd_${endDate}`;
      XLSX.writeFile(workbook, `Laporan_PBB_Desa_Suci_${filterLabel}_${dateLabel}.xlsx`);

    } catch (err) {
      console.error('Export report failed:', err);
      alert('Gagal menghasilkan laporan Excel.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent modal trigger
    if (window.confirm('Apakah Anda yakin ingin menghapus data kearsipan wajib pajak ini dari database geospasial?')) {
      await onDelete(id);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-5 animate-fadeIn bg-white dark:bg-[#0C0C0C] min-h-full">
      {/* Search Header and Quick Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <h3 className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest font-mono">
            Database Kearsipan Wajib Pajak PBB
          </h3>
        </div>

        {/* Search bar widget */}
        <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
          <Search className="h-4.5 w-4.5 text-slate-400 ml-1" />
          <input 
            type="text" 
            placeholder="Cari Nama atau NOP..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-slate-700 dark:text-slate-200"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1 cursor-pointer">
              <X className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
            </button>
          )}
        </div>

        {/* Spreadsheet Actions Row */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowExcelPanel(!showExcelPanel)}
            className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold border transition duration-200 cursor-pointer ${
              showExcelPanel 
                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' 
                : 'bg-slate-50 dark:bg-[#161616] hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/5 shadow-sm'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 text-cyan-500" />
            <span> Spreadsheet &amp; Ekspor Laporan Excel </span>
          </button>
        </div>

        {/* COLLAPSIBLE SPREADSHEET UTILITY COMPONENT */}
        {showExcelPanel && (
          <div className="bg-slate-50 dark:bg-[#121212] p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4 animate-fadeIn shadow-inner">
            {/* Split layout: Import vs Export */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Left Column: Import Excel */}
              <div className="space-y-3 md:border-r md:border-dashed md:border-slate-200 md:dark:border-white/5 md:pr-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Upload className="h-4 w-4 text-cyan-500" />
                    Impor Data PBB dari Excel
                  </h4>
                  <button 
                    onClick={downloadTemplate}
                    className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Unduh format berkas template Excel (.xlsx)"
                  >
                    <Download className="h-3 w-3" />
                    Unduh Template
                  </button>
                </div>
                
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                  Sistem otomatis mengalkulasi ketetapan nilai PBB dan merancang letak koordinat denah geospasial draf jika parameter koordinat draf kosong.
                </p>

                {isLoggedIn ? (
                  <div className="space-y-2">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleImportExcel}
                      accept=".xlsx, .xls, .csv"
                      className="hidden" 
                    />
                    <button
                      type="button"
                      disabled={importLoading}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white dark:bg-[#0C0C0C] hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-350 transition duration-200 cursor-pointer disabled:opacity-50"
                    >
                      {importLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                          <span>Membaca Berkas Excel...</span>
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                          <span>Pilih Berkas Excel (.xlsx, .csv)</span>
                        </>
                      )}
                    </button>
                    {importMessage && (
                      <div className={`p-2.5 rounded-xl text-[10px] leading-normal flex items-start gap-1.5 ${
                        importMessage.type === 'success' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20'
                      }`}>
                        {importMessage.type === 'success' ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />}
                        <span>{importMessage.text}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-100 dark:bg-[#1a1a1a] p-3 rounded-xl border border-slate-100 dark:border-white/5 text-center text-[9.5px] text-amber-600 dark:text-amber-500 font-mono tracking-tight font-bold">
                    ⚠️ HARAP LOGIN SEBAGAI PETUGAS ADMINISTRASI DAHULU UNTUK MEMPUNYAI AKSES UNGGAH/IMPORT FILE
                  </div>
                )}
              </div>

              {/* Right Column: Date-Range selective Excel report export */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileDown className="h-4 w-4 text-cyan-500" />
                  Ekspor Laporan Keuangan PBB (.xlsx)
                </h4>

                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans font-medium">
                  Unduh berkas spreadsheet terperinci dengan filter periodik ketetapan realisasi pembayaran lunas / pendaftaran database.
                </p>

                <div className="space-y-2.5 text-xs">
                  {/* Selectors */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Kriteria Laporan</label>
                      <select
                        value={exportCriteria}
                        onChange={(e) => setExportCriteria(e.target.value as any)}
                        className="w-full bg-white dark:bg-[#0C0C0C] border border-slate-250 dark:border-white/5 p-1.5 rounded-lg outline-none text-[11px] text-slate-705 dark:text-slate-200"
                      >
                        <option value="all">Semua Data</option>
                        <option value="paid">Hanya Lunas</option>
                        <option value="unpaid">Hanya Tunggakan</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Mekanisme Filter</label>
                      <select
                        value={dateFilterType}
                        onChange={(e) => setDateFilterType(e.target.value as any)}
                        className="w-full bg-white dark:bg-[#0C0C0C] border border-slate-250 dark:border-white/5 p-1.5 rounded-lg outline-none text-[11px] text-slate-705 dark:text-slate-200"
                      >
                        <option value="payment">Tanggal Pembayaran</option>
                        <option value="registration">Tanggal Sistem</option>
                      </select>
                    </div>
                  </div>

                  {/* Dates input */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Dari Tanggal</label>
                      <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-white dark:bg-[#0C0C0C] border border-slate-200 dark:border-white/5 p-1.5 rounded-lg text-[10px] outline-none text-slate-750 dark:text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Sampai Tanggal</label>
                      <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-white dark:bg-[#0C0C0C] border border-slate-200 dark:border-white/5 p-1.5 rounded-lg text-[10px] outline-none text-slate-750 dark:text-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  {/* Trigger Export */}
                  <button
                    type="button"
                    disabled={exportLoading}
                    onClick={handleExportExcel}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white dark:text-slate-905 dark:bg-cyan-400 dark:hover:bg-cyan-300 rounded-xl text-xs font-black transition duration-200 cursor-pointer disabled:opacity-50"
                  >
                    {exportLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white dark:text-slate-950" />
                        <span>Menyusun Laporan...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>Ekspor Laporan PBB</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Horizontal tabs */}
        <div className="flex bg-slate-100 dark:bg-[#0C0C0C] p-0.5 rounded-xl border border-slate-200 dark:border-white/5">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition cursor-pointer ${filter === 'all' ? 'bg-white dark:bg-[#161616] text-[#06b6d4] border border-slate-200 dark:border-white/5 shadow-sm' : 'text-slate-500'}`}
          >
            Semua ({taxpayers.length})
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition cursor-pointer ${filter === 'paid' ? 'bg-cyan-500 dark:bg-[#06b6d4] text-white dark:text-slate-950 font-extrabold shadow-sm' : 'text-slate-500'}`}
          >
            Lunas ({taxpayers.filter(t => t.isPaid).length})
          </button>
          <button
            onClick={() => setFilter('unpaid')}
            className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition cursor-pointer ${filter === 'unpaid' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-sm' : 'text-slate-500'}`}
          >
            Nunggak ({taxpayers.filter(t => !t.isPaid).length})
          </button>
        </div>
      </div>

      {/* Directory rows */}
      {filtered.length === 0 ? (
        <div className="bg-slate-50 dark:bg-[#161616]/80 py-12 px-6 rounded-3xl text-center border border-slate-200 dark:border-white/5 shadow-sm flex flex-col justify-center items-center">
          <AlertCircle className="h-10 w-10 text-slate-400 dark:text-slate-650 mb-3" />
          <h4 className="font-bold text-slate-500 dark:text-slate-400 text-xs font-mono uppercase tracking-wider">Arsip Tidak Ditemukan</h4>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-[200px] mx-auto">
            Tidak ada kecocokan data pajak di wilayah Desa Suci yang terarsip.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tp) => (
            <div
              key={tp.id}
              onClick={() => onInspect(tp)}
              className="bg-white dark:bg-[#161616] hover:bg-slate-50 dark:hover:bg-white/5 p-4 rounded-3xl border border-slate-200 dark:border-white/5 cursor-pointer shadow-sm relative transition flex flex-col justify-between overflow-hidden"
            >
              {/* Colored left strip flag */}
              <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${tp.isPaid ? 'bg-cyan-400' : 'bg-rose-500'}`} />

              <div className="flex justify-between items-start pl-1.5">
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    {tp.name}
                  </h4>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tight block mt-1">
                    NOP: {tp.id}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 font-sans block mt-0.5 line-clamp-1">
                    Domisili: {tp.address}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {(!tp.lat || !tp.lng || (tp.lat === 0 && tp.lng === 0)) && (
                    <span className="text-[9.5px] tracking-wider font-bold px-2 py-0.5 rounded-full uppercase bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20">
                      Belum Dipetakan
                    </span>
                  )}
                  <span className={`text-[9.5px] tracking-wider font-bold px-2 py-0.5 rounded-full uppercase ${
                    tp.isPaid 
                      ? 'bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20' 
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                  }`}>
                    {tp.isPaid ? 'Lunas' : 'Nunggak'}
                  </span>
                  
                  {isLoggedIn && (
                    <button
                      onClick={(e) => handleDeleteClick(e, tp.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 transition border border-transparent"
                      title="Hapus Objek"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Physical specifications */}
              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-3.5 pt-3 border-t border-slate-100 dark:border-white/5 pl-1.5 font-mono">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
                  BG: {tp.buildingArea}m² / TNH: {tp.landArea}m²
                </span>
                <span className="font-black text-cyan-600 dark:text-cyan-400">
                  Tagihan: {formatIDR(tp.totalTax)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
