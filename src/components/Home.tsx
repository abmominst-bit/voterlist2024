import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, User, MapPin, Database, ArrowRight, ShieldCheck, Info, Search, Bot, Loader2, X, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Voter } from '../constants';
import toast from 'react-hot-toast';

interface HomeProps {
  unionsCount: number;
  villagesCount: number;
  voterCount: number | null;
  onExplore: () => void;
  onSelectVillage: (village: string) => void;
}

export default function Home({ unionsCount, villagesCount, voterCount, onExplore, onSelectVillage }: HomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Voter[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase
        .from('voters')
        .select('*')
        .or(`voter_no.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,father_name.ilike.%${searchQuery}%,mother_name.ilike.%${searchQuery}%,date_of_birth.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err: any) {
      toast.error('Search failed: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 lg:p-8 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-brand rounded-2xl p-6 lg:p-10 text-white shadow-2xl shadow-brand/20">
          <div className="relative z-10 max-w-2xl">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl lg:text-4xl font-bold font-bengali leading-tight"
            >
              স্বাগতম ৮ নং পাঙ্গাসী ইউনিয়ন <br/> ভোটার ম্যানেজমেন্ট সিস্টেমে
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-slate-100 text-sm lg:text-base font-medium opacity-90"
            >
              This centralized portal allows administrators to manage voter lists, analyze demographics, and ensure accurate data across all unions and villages.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 flex flex-wrap gap-4"
            >
              <button 
                onClick={onExplore}
                className="bg-white text-brand px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                Start Exploring
                <ArrowRight size={18} />
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 text-xs font-bold uppercase tracking-widest">
                <ShieldCheck size={16} />
                Secure Portal
              </div>
            </motion.div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        </div>

        {/* AI Global Search Agent */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
            <Bot className="text-brand" size={24} />
            <h3 className="font-bengali">AI ভোটার সার্চ এজেন্ট</h3>
          </div>
          <form onSubmit={handleGlobalSearch} className="group relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand transition-colors">
              {isSearching ? <Loader2 size={24} className="animate-spin" /> : <Search size={24} />}
            </div>
            <input 
              type="text" 
              placeholder="যেকোনো তথ্য দিয়ে সার্চ করুন (ID, নাম, পিতা/মাতা, সাল...)"
              className="w-full pl-14 pr-16 py-5 bg-white border-2 border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 focus:outline-none focus:border-brand font-bengali text-lg transition-all placeholder:text-slate-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </form>

          <AnimatePresence>
            {hasSearched && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden"
              >
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center px-6">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Search Results: {searchResults.length} {searchResults.length === 20 ? '(Limit Reached)' : 'Found'}
                  </span>
                  <button onClick={clearSearch} className="text-slate-400 hover:text-brand">
                    <X size={16} />
                  </button>
                </div>
                
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {searchResults.length > 0 ? (
                    searchResults.map((voter) => (
                      <div 
                        key={voter.id} 
                        className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-brand/5 rounded-full flex items-center justify-center text-brand font-bold text-sm shrink-0 border border-brand/10">
                            <User size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 font-bengali text-base">{voter.name}</h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                              <span className="text-[10px] font-mono text-slate-400">ID: {voter.voter_no}</span>
                              <span className="text-[10px] font-mono text-slate-400">DOB: {voter.date_of_birth}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                voter.gender === 'Female' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'
                              }`}>
                                {voter.gender}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                <MapPin size={10} />
                                {voter.village} ({voter.union_name})
                              </span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => onSelectVillage(voter.village)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-brand hover:text-white text-[10px] font-bold transition-all"
                        >
                          OPEN LIST
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Search size={32} />
                      </div>
                      <p className="text-slate-500 font-medium">No records matching "{searchQuery}"</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Try searching by ID or Name</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 border border-blue-100">
              <Database size={24} />
            </div>
            <div className="text-3xl font-bold text-slate-900">{unionsCount}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Total Unions</div>
            <p className="mt-2 text-xs text-slate-500">Active unions being managed in the current database session.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4 border border-emerald-100">
              <MapPin size={24} />
            </div>
            <div className="text-3xl font-bold text-slate-900">{villagesCount}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Total Villages</div>
            <p className="mt-2 text-xs text-slate-500">Villages mapped and linked to their respective union entities.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4 border border-amber-100">
              <Users size={24} />
            </div>
            <div className="text-3xl font-bold text-slate-900">{voterCount || '---'}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Total Voters</div>
            <p className="mt-2 text-xs text-slate-500">Aggregated voter data synchronized from the cloud infrastructure.</p>
          </div>
        </div>

        {/* Information Section */}
        <div className="bg-slate-900 rounded-2xl p-6 lg:p-8 text-white">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
              <Info className="text-sky-400" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold">System Information</h3>
              <p className="mt-2 text-slate-400 text-sm leading-relaxed">
                This system provides real-time access to voter registration data. Please use the sidebar to select a specific union and village to view detailed voter lists. Admins can access the management panel to import new records or update directory structure.
              </p>
              <div className="mt-6 flex flex-wrap gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Version</span>
                  <span className="text-xs font-mono">v2.4.0 (Enterprise)</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Environment</span>
                  <span className="text-xs font-mono">Production / Cloud Run</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Last Updated</span>
                  <span className="text-xs font-mono">{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
