/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import VoterList from './components/VoterList';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import Home from './components/Home';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { LogOut, Shield, Database, Settings, LayoutDashboard, Globe, AlertTriangle, Users, Search, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [selectedVillage, setSelectedVillage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unions, setUnions] = useState<any[]>([]);
  const [villagesList, setVillagesList] = useState<any[]>([]);
  const [unionCounts, setUnionCounts] = useState<Record<string, number>>({});
  const [villageCounts, setVillageCounts] = useState<Record<string, number>>({});
  const [voterCount, setVoterCount] = useState<number | null>(null);
  const [globalVoterCount, setGlobalVoterCount] = useState<number>(0);
  const [isLoadingDynamicData, setIsLoadingDynamicData] = useState(false);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'user' | 'admin' | 'login'>('user');
  const [isConfigured] = useState(isSupabaseConfigured());

  const [isTableMissing, setIsTableMissing] = useState(false);

  const fetchGlobalCount = async () => {
    try {
      const { count, error } = await supabase
        .from('voters')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      setGlobalVoterCount(count || 0);
      setIsTableMissing(false);
    } catch (err: any) {
      console.error("Error fetching global count:", err);
      if (err.message?.includes('schema cache') || err.message?.includes('does not exist')) {
        setIsTableMissing(true);
      }
    }
  };

  const fetchUnionsAndVillages = async () => {
    setIsLoadingDynamicData(true);
    try {
      const { data: unionsData } = await supabase.from('unions').select('*').order('name');
      const { data: villagesData } = await supabase.from('villages').select('*').order('name');
      
      const currentUnions = unionsData || [];
      const currentVillages = villagesData || [];
      
      setUnions(currentUnions);
      setVillagesList(currentVillages);
      
      // Fetch global total
      await fetchGlobalCount();
      
      // Fetch counts in parallel with safety
      if (currentUnions.length > 0) {
        const uCounts: Record<string, number> = {};
        const vCounts: Record<string, number> = {};
        
        // Safety wrapper for parallel calls to prevent one crash from breaking the app
        const safeFetch = async (promise: Promise<any>, fallback: any) => {
          try {
            return await promise;
          } catch (e) {
            console.error("Single fetch failed:", e);
            return fallback;
          }
        };

        // Parallel fetching for unions
        const unionCountPromises = currentUnions.map(async (union) => {
          return safeFetch((async () => {
            const unionNameClean = union.name.replace(' ইউনিয়ন', '').trim();
            const unionVillages = currentVillages.filter(v => v.union_id === union.id);
            const villageNames = unionVillages.map(v => v.name);

            // Constructing OR filter for union name and its villages
            // This captures new data (union_name) and old data (village match)
            let filter = `union_name.ilike.%${union.name}%,union_name.ilike.%${unionNameClean}%`;
            if (villageNames.length > 0) {
              const villageInFilter = `village.in.("${villageNames.join('","')}")`;
              filter += `,${villageInFilter}`;
            }

            const { count, error } = await supabase
              .from('voters')
              .select('*', { count: 'exact', head: true })
              .or(filter);
            
            if (error) throw error;
            return { name: union.name, count: count || 0 };
          })(), { name: union.name, count: 0 });
        });

        // Parallel fetching for villages
        const villageCountPromises = currentVillages.map(async (village) => {
          return safeFetch((async () => {
            const { count, error } = await supabase
              .from('voters')
              .select('*', { count: 'exact', head: true })
              .ilike('village', `%${village.name}%`);
            
            if (error) throw error;
            return { name: village.name, count: count || 0 };
          })(), { name: village.name, count: 0 });
        });

        const [unionResults, villageResults] = await Promise.all([
          Promise.all(unionCountPromises),
          Promise.all(villageCountPromises)
        ]);

        unionResults.forEach(r => { if(r) uCounts[r.name] = r.count; });
        villageResults.forEach(r => { if(r) vCounts[r.name] = r.count; });

        setUnionCounts(uCounts);
        setVillageCounts(vCounts);
      }
    } catch (err) {
      console.error("Error fetching dynamic lists:", err);
    } finally {
      setIsLoadingDynamicData(false);
    }
  };

  useEffect(() => {
    if (isConfigured) {
      fetchUnionsAndVillages();
    }
  }, [isConfigured]);

  const [villageStats, setVillageStats] = useState<{ total: number, male: number, female: number }>({ total: 0, male: 0, female: 0 });

  const fetchCount = async () => {
    if (!selectedVillage) return;
    setIsLoadingCount(true);
    try {
      // Parallelize count fetching
      const [totalRes, maleRes, femaleRes] = await Promise.all([
        supabase
          .from('voters')
          .select('*', { count: 'exact', head: true })
          .eq('village', selectedVillage),
        supabase
          .from('voters')
          .select('*', { count: 'exact', head: true })
          .eq('village', selectedVillage)
          .eq('gender', 'Male'),
        supabase
          .from('voters')
          .select('*', { count: 'exact', head: true })
          .eq('village', selectedVillage)
          .eq('gender', 'Female')
      ]);
      
      if (totalRes.error) throw totalRes.error;
      if (maleRes.error) throw maleRes.error;
      if (femaleRes.error) throw femaleRes.error;

      setVoterCount(totalRes.count);
      setVillageStats({ 
        total: totalRes.count || 0, 
        male: maleRes.count || 0, 
        female: femaleRes.count || 0 
      });
      setIsTableMissing(false);
    } catch (err: any) {
      console.error("Error fetching count:", err);
      if (err.message?.includes('schema cache') || err.message?.includes('does not exist')) {
        setIsTableMissing(true);
      }
    } finally {
      setIsLoadingCount(false);
    }
  };

  useEffect(() => {
    if (selectedVillage) {
      fetchCount();
    } else {
      setVoterCount(null);
    }
  }, [selectedVillage]);

  useEffect(() => {
    console.log("Pangashi Voter Pro: Initializing App...");
    console.log("Supabase Configured:", isConfigured);

    if (!isConfigured) return;

    try {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      }).catch(err => {
        console.error("Session fetch failed:", err);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user && view === 'admin') {
          setView('user');
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    } catch (err) {
      console.error("Auth listener error:", err);
    }
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('user');
  };

  if (!isConfigured || isTableMissing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-line shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={36} />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-3">
            {!isConfigured ? 'Supabase Needed' : 'Database Tables Missing'}
          </h1>
          <p className="text-slate-500 mb-8">
            {!isConfigured 
              ? 'Pangashi Voter Pro requires a Supabase connection to store voter data.' 
              : 'The required tables were not found in your Supabase database.'}
          </p>
          <div className="space-y-4 text-left bg-slate-50 p-6 rounded-2xl border border-line font-mono text-[11px] leading-relaxed text-slate-600">
            <p className="font-bold text-ink">প্রয়োজনীয় সেটআপ নির্দেশিকা (Setup Instructions):</p>
            <ol className="list-decimal list-inside space-y-3 text-[11px]">
              {!isConfigured && (
                <>
                  <li><a href="https://supabase.com" target="_blank" className="text-accent underline font-bold">supabase.com</a>-এ একটি প্রোজেক্ট তৈরি করুন।</li>
                  <li>Project Settings → API থেকে <span className="font-bold">Project URL</span> এবং <span className="font-bold">anon public key</span> সংগ্রহ করুন।</li>
                  <li className="text-brand font-bold bg-amber-50 p-2 rounded-lg border border-amber-100">Vercel-এ সেটআপ:
                    <ol className="list-decimal list-inside ml-4 mt-2 space-y-2 text-slate-700">
                      <li>আপনার Vercel ড্যাশবোর্ডে গিয়ে <span className="font-bold">Settings → Environment Variables</span>-এ যান।</li>
                      <li>নিচের ৩টি ভেরিয়েবল যোগ করুন:
                        <ul className="list-disc list-inside ml-6 mt-1 font-mono text-[10px] text-slate-900">
                          <li>VITE_SUPABASE_URL</li>
                          <li>VITE_SUPABASE_ANON_KEY</li>
                          <li>VITE_GEMINI_API_KEY</li>
                        </ul>
                      </li>
                      <li className="text-red-600 font-extrabold uppercase">গুরুত্বপূর্ণ: ভেরিয়েবলগুলো সেভ করার পর অবশ্যই 'Deployments' ট্যাবে গিয়ে সর্বশেষ বিল্ডটি 'Redeploy' করুন।</li>
                    </ol>
                  </li>
                  <li>লোকাল টেস্টের জন্য: আপনার কম্পিউটারে একটি <span className="font-bold">.env</span> ফাইল তৈরি করে ভেরিয়েবলগুলো সেখানে লিখুন।</li>
                </>
              )}
              <li>আপনার Supabase <span className="font-bold">SQL Editor</span>-এ গিয়ে নিচের কোডটি রান করুন:</li>
            </ol>
            <div className="mt-3 relative group">
              <div className="p-3 bg-slate-800 text-slate-300 rounded-lg overflow-x-auto text-[10px] font-mono max-h-60">
                <pre id="sql-code">{`create table if not exists unions (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default now()
);

create table if not exists villages (
  id uuid default gen_random_uuid() primary key,
  union_name text references unions(name) on delete cascade on update cascade,
  name text not null,
  created_at timestamp with time zone default now(),
  unique(union_name, name)
);

create table if not exists voters (
  id uuid default gen_random_uuid() primary key,
  serial_no text,
  voter_no text not null,
  name text not null,
  father_name text,
  mother_name text,
  date_of_birth text,
  gender text check (gender in ('Male', 'Female')),
  village text not null,
  union_name text,
  created_at timestamp with time zone default now()
);

alter table voters enable row level security;
alter table unions enable row level security;
alter table villages enable row level security;

create policy "public_voters" on voters for all using (true) with check (true);
create policy "public_unions" on unions for all using (true) with check (true);
create policy "public_villages" on villages for all using (true) with check (true);`}</pre>
              </div>
              <button 
                onClick={() => {
                  const code = document.getElementById('sql-code')?.innerText;
                  if (code) {
                    navigator.clipboard.writeText(code);
                    toast.success('SQL copied to clipboard!');
                  }
                }}
                className="absolute top-2 right-2 p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="Copy SQL"
              >
                <Database size={14} />
              </button>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 w-full bg-ink text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all font-sans"
          >
            I've Completed the Setup, Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg">
      <Toaster position="top-right" />
      
      <Sidebar 
        selectedVillage={selectedVillage} 
        unionsData={unions}
        villagesData={villagesList}
        unionCounts={unionCounts}
        villageCounts={villageCounts}
        voterCount={globalVoterCount}
        selectedVillageStats={villageStats}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectVillage={(v) => {
          setSelectedVillage(v);
          setIsSidebarOpen(false);
          if (view !== 'admin') setView('user');
        }} 
      />

      <main className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
        {/* Header/Nav */}
        <header className="h-14 bg-white border-b border-line flex items-center justify-between px-4 lg:px-6 shadow-sm shrink-0">
          <div className="flex items-center gap-3 text-xs overflow-hidden">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-brand"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:block text-slate-400 font-medium shrink-0">Union Portal</div>
            <div className="hidden sm:block text-slate-300 shrink-0">/</div>
            <div className="font-bold text-slate-900 flex items-center gap-1.5 font-bengali truncate">
              {selectedVillage || 'Select Village'}
              {voterCount !== null && !isTableMissing && (
                <div className="flex items-center gap-1 ml-1 scale-[0.85] origin-left">
                  <span className="bg-brand/10 text-brand text-[10px] px-2 py-0.5 rounded-full font-mono font-bold whitespace-nowrap shadow-sm border border-brand/5">
                    ALL ({voterCount})
                  </span>
                  <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold whitespace-nowrap shadow-sm border border-blue-100">
                    M ({villageStats.male})
                  </span>
                  <span className="bg-pink-50 text-pink-600 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold whitespace-nowrap shadow-sm border border-pink-100">
                    F ({villageStats.female})
                  </span>
                </div>
              )}
              {isTableMissing && (
                <span className="bg-red-50 text-red-600 text-[9px] px-2 py-0.5 rounded-full border border-red-100 flex items-center gap-1">
                  <AlertTriangle size={8} /> MISSING TABLE
                </span>
              )}
              <button 
                onClick={fetchCount}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-brand transition-colors"
                title="Refresh Total"
              >
                <div className={isLoadingCount ? "animate-spin" : ""}>
                  <Database size={12} />
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setView('user')}
              className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                view === 'user' ? 'bg-brand/10 text-brand' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Globe size={14} />
              DIRECTORY
            </button>
            {user && (
              <button 
                onClick={() => setView('admin')}
                className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                  view === 'admin' ? 'bg-brand/10 text-brand' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Shield size={14} />
                ADMIN
              </button>
            )}
            
            <div className="w-[1px] h-4 bg-line mx-1" />

            {user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleLogout}
                  className="text-[11px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-tighter"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setView('login')}
                className="text-[11px] font-bold text-slate-400 hover:text-brand uppercase tracking-tighter flex items-center gap-1.5"
              >
                <Settings size={14} />
                LOGIN
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          {isLoadingDynamicData && view === 'user' && !selectedVillage && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
              <div className="text-xs font-bold text-slate-500 animate-pulse">লোড হচ্ছে...</div>
            </div>
          )}
          <AnimatePresence mode="wait">
            {view === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex items-center justify-center p-8"
              >
                <Login onLogin={() => setView('admin')} />
              </motion.div>
            )}

            {view === 'admin' && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full"
              >
        <AdminPanel 
          onDataSaved={() => {
            fetchCount();
            fetchUnionsAndVillages();
          }} 
          unionsData={unions}
          villagesData={villagesList}
          onRefreshLists={fetchUnionsAndVillages}
        />
              </motion.div>
            )}

            {view === 'user' && (
              <motion.div
                key="user"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                {selectedVillage ? (
                  <VoterList village={selectedVillage} isAdmin={false} />
                ) : (
                  <Home 
                    unionsCount={unions.length}
                    villagesCount={villagesList.length}
                    voterCount={globalVoterCount}
                    onExplore={() => setIsSidebarOpen(true)}
                    onSelectVillage={setSelectedVillage}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
