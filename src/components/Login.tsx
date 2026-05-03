import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, Key, Mail, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success('Admin login successful');
      onLogin();
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto p-6 sm:p-10 bg-white border border-slate-200 rounded-2xl shadow-xl mt-10 lg:mt-20">
      <div className="text-center mb-10">
        <div className="w-14 h-14 bg-brand/10 text-brand rounded-xl flex items-center justify-center mx-auto mb-4 border border-brand/20 shadow-inner">
          <Key size={28} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Gateway</h2>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2 px-6">Administrative Access Portal for Pangashi Voter Pro</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Terminal</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input
              type="email"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pl-11 pr-4 text-xs font-mono focus:outline-brand transition-all placeholder:text-slate-300"
              placeholder="admin@pangashi.union"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Secure Passkey</label>
          <div className="relative">
            <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input
              type="password"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pl-11 pr-4 text-xs font-mono focus:outline-brand transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-white rounded-lg py-3 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-brand-dark transition-all disabled:opacity-50 mt-2 shadow-md shadow-brand/20"
        >
          {loading ? 'Validating Metadata...' : 'Establish Connection'}
        </button>
      </form>

      <div className="mt-10 pt-8 border-t border-slate-100">
        <div className="flex gap-4 text-[10px] text-slate-500 bg-slate-50 p-5 rounded-xl border border-slate-200 leading-relaxed font-medium">
          <AlertCircle size={18} className="shrink-0 text-amber-500" />
          <p>
            WARNING: Unauthorized access attempts are monitored and logged. Restricted to Union authorized personnel only.
          </p>
        </div>
      </div>
    </div>
  );
}
