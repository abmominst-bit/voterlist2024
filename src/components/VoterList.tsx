import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Voter, Gender } from '../constants';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Existing imports
import { Search, Users, User, UserCheck, Calendar, Hash, FileUp, Download, Edit2, X, Save, Trash2, Image as ImageIcon, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface VoterListProps {
  village: string;
  isAdmin: boolean;
}

interface EditModalProps {
  voter: Voter;
  onClose: () => void;
  onSave: (updatedVoter: Voter) => void;
}

function EditVoterModal({ voter, onClose, onSave }: EditModalProps) {
  const [formData, setFormData] = useState<Voter>({ ...voter });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedVoter = {
        ...formData,
        serial_no: bnToEn(formData.serial_no),
        voter_no: bnToEn(formData.voter_no),
        date_of_birth: bnToEn(formData.date_of_birth),
      };

      const { error } = await supabase
        .from('voters')
        .update({
          serial_no: updatedVoter.serial_no,
          voter_no: updatedVoter.voter_no,
          name: updatedVoter.name,
          father_name: updatedVoter.father_name,
          mother_name: updatedVoter.mother_name,
          date_of_birth: updatedVoter.date_of_birth,
          gender: updatedVoter.gender
        })
        .eq('id', voter.id);

      if (error) throw error;
      onSave(updatedVoter);
      toast.success('voter updated successfully');
      onClose();
    } catch (error: any) {
      console.error('Error updating voter:', error);
      toast.error('Failed to update voter');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Edit2 size={18} className="text-brand" />
            Edit Voter Details
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Serial No</label>
              <input 
                type="text" 
                value={formData.serial_no || ''} 
                onChange={(e) => setFormData({ ...formData, serial_no: e.target.value })}
                className="px-3 py-2 border rounded border-slate-200 focus:outline-brand bg-slate-50 text-xs font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Voter ID</label>
              <input 
                type="text" 
                required
                value={formData.voter_no || ''} 
                onChange={(e) => setFormData({ ...formData, voter_no: e.target.value })}
                className="px-3 py-2 border rounded border-slate-200 focus:outline-brand bg-slate-50 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Full Name</label>
            <input 
              type="text" 
              required
              value={formData.name || ''} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 border rounded border-slate-200 focus:outline-brand bg-slate-50 text-sm font-bengali"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Father's Name</label>
              <input 
                type="text" 
                value={formData.father_name || ''} 
                onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                className="px-3 py-2 border rounded border-slate-200 focus:outline-brand bg-slate-50 text-sm font-bengali"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Mother's Name</label>
              <input 
                type="text" 
                value={formData.mother_name || ''} 
                onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                className="px-3 py-2 border rounded border-slate-200 focus:outline-brand bg-slate-50 text-sm font-bengali"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Date of Birth</label>
              <input 
                type="text" 
                value={formData.date_of_birth || ''} 
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                placeholder="DD/MM/YYYY"
                className="px-3 py-2 border rounded border-slate-200 focus:outline-brand bg-slate-50 text-xs font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Sex</label>
              <select 
                value={formData.gender || 'Male'} 
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                className="px-3 py-2 border rounded border-slate-200 focus:outline-brand bg-slate-50 text-xs"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded font-bold text-[11px] text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all uppercase tracking-widest"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-brand text-white rounded font-bold text-[11px] hover:bg-brand-dark transition-all uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

const bnToEn = (str: string | undefined): string => {
  if (!str) return '';
  const map: { [key: string]: string } = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return str.replace(/[০-৯]/g, (m) => map[m]);
};

export default function VoterList({ village, isAdmin }: VoterListProps) {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState<Gender | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingVoter, setEditingVoter] = useState<Voter | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Voter | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const pageSize = 100;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [village, genderFilter, debouncedSearch]);

  useEffect(() => {
    fetchVoters();
  }, [village, currentPage, genderFilter, debouncedSearch]);

  const fetchVoters = async () => {
    setLoading(true);
    try {
      // 1. Get total count for the specific village, gender, and search filter
      let countQuery = supabase
        .from('voters')
        .select('*', { count: 'exact', head: true })
        .eq('village', village);

      if (genderFilter !== 'All') {
        countQuery = countQuery.eq('gender', genderFilter);
      }

      if (debouncedSearch) {
        const s = `%${debouncedSearch}%`;
        countQuery = countQuery.or(`voter_no.ilike.${s},name.ilike.${s},father_name.ilike.${s},mother_name.ilike.${s},date_of_birth.ilike.${s}`);
      }

      const { count, error: countError } = await countQuery;

      if (countError) throw countError;
      setTotalRecords(count || 0);
      
      if (!count) {
        setVoters([]);
        setLoading(false);
        return;
      }

      // 2. Fetch only the current page of records
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let dataQuery = supabase
        .from('voters')
        .select('*')
        .eq('village', village)
        .order('serial_no', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true })
        .range(from, to);

      if (genderFilter !== 'All') {
        dataQuery = dataQuery.eq('gender', genderFilter);
      }

      if (debouncedSearch) {
        const s = `%${debouncedSearch}%`;
        dataQuery = dataQuery.or(`voter_no.ilike.${s},name.ilike.${s},father_name.ilike.${s},mother_name.ilike.${s},date_of_birth.ilike.${s}`);
      }

      const { data, error } = await dataQuery;

      if (error) throw error;
      setVoters(data || []);
    } catch (error: any) {
      console.error('Error fetching voters:', error);
      if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
        toast.error('Database table "voters" is missing. Please run the SQL setup script in your Supabase SQL editor.');
      } else {
        toast.error('Failed to load voter list');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVoter = (updatedVoter: Voter) => {
    setVoters(current => current.map(v => v.id === updatedVoter.id ? updatedVoter : v));
  };

  const handleDeleteVoter = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('voters')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setVoters(current => current.filter(v => v.id !== id));
      toast.success('Record deleted successfully');
    } catch (error: any) {
      console.error('Error deleting voter:', error);
      toast.error('Failed to delete record');
    }
  };

  const handleExportPDF = async () => {
    const toastId = toast.loading('Generating PDF...');
    try {
      const element = document.getElementById('pdf-printable-content');
      if (!element) {
        toast.error('Printable content not found', { id: toastId });
        return;
      }

      // Temporarily make it visible for capture
      element.style.display = 'block';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      element.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Voter_List_${village}.pdf`);
      toast.success('PDF exported successfully!', { id: toastId });
    } catch (err) {
      console.error('PDF Export Error:', err);
      toast.error('Failed to export PDF', { id: toastId });
    }
  };

  const filteredVoters = voters;

  return (
    <div className="p-6 h-full flex flex-col gap-5 overflow-hidden bg-surface">
      {/* Hidden Printable Area for PDF Export */}
      <div id="pdf-printable-content" style={{ display: 'none', width: '800px', padding: '40px', backgroundColor: 'white', position: 'absolute', left: '-9999px' }}>
        <div style={{ marginBottom: '20px', borderBottom: '2px solid #2874fc', paddingBottom: '10px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>Voter Directory</h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>Village: {village} | Total: {filteredVoters.length} | Date: {new Date().toLocaleDateString()}</p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', width: '40px' }}>SL</th>
              <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', width: '120px' }}>Voter ID</th>
              <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>Name</th>
              <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', width: '50px' }}>Sex</th>
              <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>Parents</th>
              <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', width: '100px' }}>DOB</th>
            </tr>
          </thead>
          <tbody>
            {filteredVoters.map((v, i) => (
              <tr key={v.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px', fontSize: '11px' }}>{v.serial_no || i + 1}</td>
                <td style={{ padding: '8px', fontSize: '11px', fontWeight: 'bold' }}>{v.voter_no}</td>
                <td style={{ padding: '8px', fontSize: '12px', fontWeight: 'bold' }}>{v.name}</td>
                <td style={{ padding: '8px', fontSize: '11px' }}>{v.gender}</td>
                <td style={{ padding: '8px', fontSize: '11px' }}>{v.father_name} / {v.mother_name}</td>
                <td style={{ padding: '8px', fontSize: '11px' }}>{v.date_of_birth}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {editingVoter && (
          <EditVoterModal 
            voter={editingVoter} 
            onClose={() => setEditingVoter(null)}
            onSave={handleUpdateVoter}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {zoomedImage && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/80 backdrop-blur-md" 
            onClick={() => setZoomedImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-xs w-full bg-white p-2 rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setZoomedImage(null)}
                className="absolute -top-12 right-0 p-2 text-white hover:text-slate-300 transition-colors"
              >
                <X size={24} />
              </button>
              <img 
                src={zoomedImage} 
                className="w-full h-auto rounded-xl shadow-inner border border-slate-100" 
                alt="Zoomed Snapshot" 
              />
              <div className="mt-3 p-2 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Snapshot View</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedProfile(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
            >
              <div className="relative h-32 bg-gradient-to-br from-brand to-brand-dark">
                <button 
                  onClick={() => setSelectedProfile(null)}
                  className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors z-10"
                >
                  <X size={20} />
                </button>
                <div className="absolute -bottom-12 left-8 p-1.5 bg-white rounded-2xl shadow-lg">
                  {selectedProfile.thumbnail ? (
                    <img src={selectedProfile.thumbnail} className="w-24 h-24 object-contain rounded-xl bg-slate-50 border border-slate-100" />
                  ) : (
                    <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-100">
                      <User size={40} className="text-slate-300" />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-16 pb-8 px-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bengali font-bold text-slate-900 leading-tight">{selectedProfile.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold font-mono tracking-tighter">ID: {selectedProfile.voter_no}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-wider">Guardian Information</p>
                    <div className="font-bengali text-sm text-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                         <span className="text-slate-400">পিতা:</span>
                         <span className="font-semibold">{selectedProfile.father_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-slate-400">মাতা:</span>
                         <span className="font-semibold">{selectedProfile.mother_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-wider">Birth Date</p>
                      <p className="font-mono font-bold text-slate-700 text-sm">{selectedProfile.date_of_birth || 'N/A'}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-wider">Sex</p>
                      <p className="text-xs font-bold text-slate-700">{selectedProfile.gender}</p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Village</p>
                        <p className="font-bengali font-bold text-slate-700 text-sm">{selectedProfile.village}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-brand/5 flex items-center justify-center text-brand">
                        <Users size={18} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Filter Tabs & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 px-1">
        <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 p-1 rounded-lg w-fit border border-slate-200 overflow-x-auto max-w-full no-scrollbar">
          {['All', 'Male', 'Female'].map((g) => (
            <button
              key={g}
              onClick={() => setGenderFilter(g as any)}
              className={`px-3 sm:px-6 py-2 rounded-md font-bold text-[10px] sm:text-xs transition-all whitespace-nowrap ${
                genderFilter === g
                  ? 'bg-white shadow-sm text-brand-dark'
                  : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
            Village: <span className="text-slate-900">{village}</span>
          </div>
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
            Total Found: <span className="text-brand">{totalRecords}</span>
          </div>
        </div>
      </div>

      {/* Unified Search & Export */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 lg:p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input 
            type="text" 
            placeholder="Search by ID, Name, Parents or Date..." 
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl border-slate-200 focus:outline-brand bg-slate-50 text-[11px] lg:text-sm font-bengali shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button 
          onClick={handleExportPDF}
          className="flex items-center justify-center gap-2 bg-brand text-white px-6 py-2.5 rounded-xl font-bold text-[10px] lg:text-xs hover:bg-brand-dark transition-all uppercase tracking-widest shadow-md shadow-brand/20 shrink-0"
        >
          <Download size={14} />
          Export Village PDF
        </button>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-0">
        <div className="overflow-auto custom-scrollbar h-full">
          <table className="w-full text-left border-collapse min-w-[800px] table-auto">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-500 text-[11px] uppercase w-12">SL</th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-[11px] uppercase w-48">Voter ID</th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-[11px] uppercase">Voter Name</th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-[11px] uppercase">Parents</th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-[11px] uppercase w-20">Sex</th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-[11px] uppercase w-28">D.O.B</th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-[11px] uppercase w-24 text-right pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  Array.from({ length: 15 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse">
                      <td colSpan={7} className="px-4 py-3"><div className="h-4 bg-slate-50 rounded w-full" /></td>
                    </tr>
                  ))
                ) : filteredVoters.length > 0 ? (
                  filteredVoters.map((voter, index) => (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={voter.id || index}
                      className="data-row"
                    >
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        {voter.serial_no || String((currentPage - 1) * pageSize + index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3 font-mono text-brand-dark font-bold text-[11.5px] tabular-nums">{voter.voter_no}</td>
                      <td className="px-4 py-3 font-bengali text-[13.5px] font-semibold text-slate-900 group-hover:text-brand transition-colors">
                        {voter.name}
                      </td>
                      <td className="px-4 py-3 font-bengali text-[13px] text-slate-600">
                        {voter.father_name} / {voter.mother_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          voter.gender === 'Male' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-pink-50 text-pink-600 border border-pink-100'
                        }`}>
                          {voter.gender}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{voter.date_of_birth}</td>
                      <td className="px-4 py-3 text-right pr-8">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => setSelectedProfile(voter)}
                            className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors"
                            title="View Profile"
                          >
                            <Eye size={16} />
                          </button>
                          {isAdmin && (
                            <>
                              <button 
                                onClick={() => setEditingVoter(voter)}
                                className="text-brand hover:underline text-[11px] font-bold uppercase tracking-tight"
                                title="Edit Voter"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteVoter(voter.id!)}
                                className="text-red-500 hover:underline text-[11px] font-bold uppercase tracking-tight"
                                title="Delete Voter"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-16 text-center text-slate-400 italic text-sm">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                          <Users className="text-slate-200" size={24} />
                        </div>
                        No records match your search criteria.
                      </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {/* Simple Dense Footer */}
        <div className="mt-auto p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} Records
          </span>
          <div className="flex items-center gap-3">
             <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-bold hover:bg-slate-50 transition-colors shadow-sm"
              >
                Prev
              </button>
              <div className="flex items-center px-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                <span className="text-[10px] font-bold text-brand">Page {currentPage} of {Math.max(1, Math.ceil(totalRecords / pageSize))}</span>
              </div>
              <button 
                onClick={() => setCurrentPage(prev => (prev * pageSize < totalRecords ? prev + 1 : prev))}
                disabled={currentPage * pageSize >= totalRecords || loading}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-bold hover:bg-slate-50 transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
            <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
