import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  CheckCircle2, 
  Key,
  ShieldCheck
} from 'lucide-react';
import { PetugasUser } from '../lib/firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: PetugasUser) => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loggingInUser, setLoggingInUser] = useState<PetugasUser | null>(null);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normUser = username.trim().toLowerCase();
    const pin = password.trim();

    if (!normUser || !pin) {
      setError('Harap isi semua kolom username dan password!');
      return;
    }

    // Matching username & password roles
    let matchedUser: PetugasUser | null = null;

    if (normUser === 'admin' && (pin === 'Joe12hara' || pin === 'admin' || pin === 'suci123')) {
      matchedUser = {
        uid: 'admin-01',
        name: 'Asep Juhara',
        email: 'asjoe11122GMAIL/COM',
        role: 'Admin'
      };
    } else if (normUser === 'petugas' && (pin === 'pbb2007' || pin === 'petugas' || pin === 'petugas123')) {
      matchedUser = {
        uid: 'petugas-02',
        name: 'Dadang.R',
        email: 'budi.gunawan@pemkot.go.id',
        role: 'Petugas'
      };
    }

    if (matchedUser) {
      setIsSuccess(true);
      setLoggingInUser(matchedUser);
      localStorage.setItem('pbb_logged_in_user', JSON.stringify(matchedUser));
      window.dispatchEvent(new Event('auth_updated'));
      
      setTimeout(() => {
        onLoginSuccess(matchedUser!);
        setIsSuccess(false);
        setUsername('');
        setPassword('');
        onClose();
      }, 1200);
    } else {
      setError('Kombinasi Username atau Password salah!');
    }
  };

  const handleAutoFill = (role: 'admin' | 'petugas') => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('petugas');
      setPassword('pbb123');
    }
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Blurred overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm"
      />

      {/* Modal card */}
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className="relative w-full max-w-md bg-white dark:bg-[#0A0A0A] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-2xl overflow-hidden"
      >
        {/* Decorative ambient color blobbies */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-rose-500/5 blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex justify-between items-center mb-6 relative">
          <div className="flex items-center gap-2">
            <div className="bg-cyan-500/10 p-1.5 rounded-xl text-cyan-400">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Autentikasi Petugas</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">SIG-PBB DESA SUCI</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3 flex flex-col justify-center items-center">
            <motion.div
              initial={{ scale: 0.8, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              className="bg-cyan-500/10 p-4 rounded-3xl text-cyan-400 border border-cyan-500/20"
            >
              <ShieldCheck className="h-10 w-10 text-cyan-500 dark:text-cyan-400" />
            </motion.div>
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">Login Berhasil</h4>
            <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">
              Selamat datang kembali, <strong className="text-cyan-600 dark:text-cyan-400 font-extrabold">{loggingInUser?.name}</strong>.
            </p>
            <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/15 text-cyan-500 dark:text-cyan-400 px-2.5 py-0.5 rounded-md font-mono uppercase font-bold tracking-widest">
              AKSES {loggingInUser?.role} AKTIF
            </span>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/25 p-3 rounded-2xl flex items-start gap-2 text-rose-600 dark:text-rose-450 text-xs font-semibold">
                <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Username</label>
              <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-[#0C0C0C] rounded-2xl border border-slate-200 dark:border-white/5 focus-within:border-cyan-500/50 transition">
                <User className="h-4.5 w-4.5 text-slate-400 dark:text-slate-550" />
                <input 
                  type="text" 
                  placeholder="Masukkan username (contoh: admin / petugas)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs w-full text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Password</label>
              <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-[#0C0C0C] rounded-2xl border border-slate-200 dark:border-white/5 focus-within:border-cyan-500/50 transition">
                <Lock className="h-4.5 w-4.5 text-slate-400 dark:text-slate-550" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs w-full text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="w-full py-3 bg-slate-950 dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-black rounded-2xl transition shadow-lg cursor-pointer tracking-wider uppercase"
            >
              Autentikasi Pertugas Masuk
            </button>

            {/* Auto fill Accounts demo section */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
              <span className="text-[9.5px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest block mb-2">Simulasi Akun Cepat</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleAutoFill('admin')}
                  className="py-2 px-3 text-left bg-slate-50 hover:bg-slate-100 dark:bg-[#121212] dark:hover:bg-white/5 text-[10.5px] rounded-xl border border-slate-200 dark:border-white/5 transition flex flex-col justify-start text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  <span className="font-extrabold text-cyan-600 dark:text-cyan-400">Sebagai ADMIN</span>
                  <span className="text-[9px] text-slate-400 font-mono mt-0.5">admin / admin123</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAutoFill('petugas')}
                  className="py-2 px-3 text-left bg-slate-50 hover:bg-slate-100 dark:bg-[#121212] dark:hover:bg-white/5 text-[10.5px] rounded-xl border border-slate-200 dark:border-white/5 transition flex flex-col justify-start text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  <span className="font-extrabold text-[#06b6d4]">Sebagai PETUGAS</span>
                  <span className="text-[9px] text-slate-400 font-mono mt-0.5">petugas / pbb123</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
