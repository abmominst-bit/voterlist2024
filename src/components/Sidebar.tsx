import React, { useState } from 'react';
import { UNIONS } from '../constants';
import { Folder, ChevronRight, MapPin, ChevronDown, X, LayoutDashboard, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  selectedVillage: string | null;
  onSelectVillage: (village: string) => void;
  unionsData?: any[];
  villagesData?: any[];
  unionCounts?: Record<string, number>;
  villageCounts?: Record<string, number>;
  voterCount?: number | null;
  selectedVillageStats?: { total: number, male: number, female: number };
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ 
  selectedVillage, 
  onSelectVillage, 
  unionsData = [], 
  villagesData = [],
  unionCounts = {},
  villageCounts = {},
  voterCount = 0,
  selectedVillageStats,
  isOpen = true,
  onClose
}: SidebarProps) {
  const [expandedUnions, setExpandedUnions] = useState<Record<string, boolean>>({});

  // Build the hierarchical structure from dynamic data and merge with constants
  const dynamicUnions = unionsData.map(u => ({
    name: u.name,
    villages: villagesData.filter(v => v.union_name === u.name).map(v => v.name)
  }));

  // Combine static and dynamic data. Dynamic (DB) takes precedence for the same union name.
  const combined = [...UNIONS];
  dynamicUnions.forEach(du => {
    const idx = combined.findIndex(u => u.name === du.name);
    if (idx > -1) {
      // Merge: take static villages and add dynamic ones, and remove duplicates
      const mergedVillages = Array.from(new Set([...combined[idx].villages, ...du.villages]));
      combined[idx] = { ...du, villages: mergedVillages };
    } else {
      combined.push(du);
    }
  });

  const displayUnions = combined;

  React.useEffect(() => {
    if (displayUnions.length > 0 && Object.keys(expandedUnions).length === 0) {
      setExpandedUnions({ [displayUnions[0].name]: true });
    }
  }, [displayUnions]);

  const toggleUnion = (name: string) => {
    setExpandedUnions(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.div 
        className={`fixed lg:static inset-y-0 left-0 w-72 lg:w-64 h-full border-r border-sidebar-border bg-sidebar flex flex-col overflow-hidden z-[110] lg:z-0 shadow-2xl lg:shadow-none transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-base leading-tight italic flex items-center gap-2">
              <MapPin className="text-brand" size={18} />
              8 No. Pangashi
            </h1>
            <p className="text-[10px] text-sidebar-ink uppercase tracking-widest mt-1 font-semibold">
              Voter Management System
            </p>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Voter Count Summary */}
        <div className="px-5 py-4 bg-slate-900/30 border-b border-sidebar-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-brand/10 text-brand rounded-xl flex items-center justify-center border border-brand/20 shadow-inner">
                <Users size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">মোট ভোটার</span>
                <span className="text-base font-black text-white leading-none mt-1">
                  {voterCount?.toLocaleString() || '0'}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">ইউনিয়ন</span>
              <span className="text-lg font-black text-brand leading-none">
                {unionsData.length}
              </span>
            </div>
          </div>
          
          {selectedVillage && selectedVillageStats && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 pt-4 border-t border-sidebar-border/40 grid grid-cols-3 gap-2"
            >
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tight">Total</span>
                <span className="text-xs font-bold text-white">{selectedVillageStats.total}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-blue-500 font-bold uppercase tracking-tight">Male</span>
                <span className="text-xs font-bold text-blue-400">{selectedVillageStats.male}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-pink-500 font-bold uppercase tracking-tight">Female</span>
                <span className="text-xs font-bold text-pink-400">{selectedVillageStats.female}</span>
              </div>
            </motion.div>
          )}
        </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
          Navigation
        </div>
        <div className="px-2 mb-4">
          <button 
            onClick={() => {
              onSelectVillage('');
              if (onClose) onClose();
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              !selectedVillage ? 'bg-brand/10 text-brand shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard size={14} />
            <span>Home Dashboard</span>
          </button>
        </div>

        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter transition-all">Unions & Villages</span>
          <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
            {displayUnions.reduce((acc, u) => acc + u.villages.length, 0)} Villages
          </span>
        </div>
        
        <div className="space-y-1">
          {displayUnions.map((union) => (
            <div key={union.name} className="px-2">
              <button 
                onClick={() => toggleUnion(union.name)}
                className="w-full flex items-center justify-between px-3 py-2 text-slate-400 hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Folder size={14} className={expandedUnions[union.name] ? "text-brand" : "text-slate-500"} />
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="text-xs font-bold font-bengali uppercase tracking-tight truncate">{union.name}</span>
                      {unionCounts[union.name] !== undefined && (
                        <span className="bg-brand/10 text-brand text-[9px] px-1.5 py-0 rounded-full font-mono font-bold shrink-0 border border-brand/20">
                          {unionCounts[union.name].toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500 font-medium">{union.villages.length} Villages</span>
                    </div>
                  </div>
                </div>
                {expandedUnions[union.name] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              
              <AnimatePresence initial={false}>
                {expandedUnions[union.name] && (
                  <motion.nav 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-[1px] ml-4 mt-1 border-l border-slate-800"
                  >
                    {union.villages.map((id) => (
                      <button
                        key={id}
                        onClick={() => onSelectVillage(id)}
                        className={`w-full flex items-center justify-between px-4 py-2 text-[11px] transition-all duration-150 group text-left ${
                          selectedVillage === id
                            ? 'bg-brand/10 text-brand font-bold'
                            : 'text-sidebar-ink hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="truncate font-bengali">
                          {id}
                        </span>
                        {villageCounts[id] !== undefined && (
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full border font-mono font-bold ${
                            selectedVillage === id 
                              ? 'bg-brand/20 border-brand/20 text-brand' 
                              : 'bg-slate-900 border-slate-700 text-slate-500'
                          }`}>
                            {villageCounts[id].toLocaleString()}
                          </span>
                        )}
                      </button>
                    ))}
                  </motion.nav>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-3 bg-slate-950">
        <div className="flex items-center gap-3 bg-slate-800 p-2 rounded border border-slate-700">
          <div className="w-8 h-8 rounded bg-brand flex items-center justify-center font-bold text-slate-900 text-xs">
            AD
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[11px] text-white truncate font-medium">Administrator</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-tight">Supabase Cloud</p>
          </div>
        </div>
      </div>
    </motion.div>
    </>
  );
}
