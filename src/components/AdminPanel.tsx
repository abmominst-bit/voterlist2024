import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '../lib/supabase';
import { UNIONS, VILLAGES, Voter, Gender } from '../constants';
import VoterList from './VoterList';
import { FileUp, Save, Trash2, CheckCircle, AlertCircle, Loader2, Upload, FileText, Image as ImageIcon, ListFilter, Settings, Globe, MapPin, Edit2, Check, X, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { GoogleGenAI, Type } from "@google/genai";

// Set up pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const bnToEn = (str: string | undefined): string => {
  if (!str) return '';
  const map: { [key: string]: string } = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return str.replace(/[০-৯]/g, (m) => map[m]);
};

export interface ExtractedVoter extends Voter {
  thumbnail?: string;
  box_2d?: number[];
}

export default function AdminPanel({ onDataSaved, unionsData = [], villagesData = [], onRefreshLists }: { 
  onDataSaved?: () => void, 
  unionsData?: any[], 
  villagesData?: any[],
  onRefreshLists?: () => void
}) {
  // Build dynamic hierarchical list and merge with defaults
  const dynamicUnions = unionsData.map(u => ({
    name: u.name,
    villages: villagesData.filter(v => v.union_name === u.name).map(v => v.name)
  }));
  
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
  const allVillages = displayUnions.flatMap(u => u.villages);

  const [selectedUnion, setSelectedUnion] = useState<string>('');
  const [targetVillage, setTargetVillage] = useState(allVillages[0] || VILLAGES[0]);
  const [defaultGender, setDefaultGender] = useState<Gender>('Male');
  const [activeTab, setActiveTab] = useState<'import' | 'manage' | 'setup'>('import');
  const [extractedVoters, setExtractedVoters] = useState<ExtractedVoter[]>([]);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastUploadedIds, setLastUploadedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // API Key State
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedApiKey, setSavedApiKey] = useState<string | null>(() => localStorage.getItem('CUSTOM_GEMINI_API_KEY'));

  // Management UI State
  const [newUnion, setNewUnion] = useState('');
  const [newVillage, setNewVillage] = useState('');
  const [selectedUnionForVillage, setSelectedUnionForVillage] = useState('');

  // Editing State
  const [editingUnionId, setEditingUnionId] = useState<string | null>(null);
  const [editUnionName, setEditUnionName] = useState('');
  const [editingVillageId, setEditingVillageId] = useState<string | null>(null);
  const [editVillageName, setEditVillageName] = useState('');
  const [villageStats, setVillageStats] = useState<{[key: string]: {male: number, female: number}}>({});

  React.useEffect(() => {
    fetchVillageStats();
  }, [villagesData]);

  const fetchVillageStats = async () => {
    try {
      // 1. Get total count first
      const { count: total, error: countError } = await supabase
        .from('voters')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      if (!total) return;

      const pageSize = 1000;
      const maxPages = 50; // Cap at 50k records for stats calculation to ensure performance
      const totalPages = Math.min(Math.ceil(total / pageSize), maxPages);
      
      // 2. Fetch pages in parallel
      const pagePromises = Array.from({ length: totalPages }).map((_, i) => 
        supabase
          .from('voters')
          .select('village, gender')
          .range(i * pageSize, (i + 1) * pageSize - 1)
      );

      const results = await Promise.all(pagePromises);
      const allVoterData: {village: string, gender: string}[] = [];
      
      for (const { data, error } of results) {
        if (error) throw error;
        if (data) allVoterData.push(...data);
      }
      
      const stats: {[key: string]: {male: number, female: number}} = {};
      allVoterData.forEach(v => {
        if (!stats[v.village]) stats[v.village] = { male: 0, female: 0 };
        if (v.gender === 'Male') stats[v.village].male++;
        else if (v.gender === 'Female') stats[v.village].female++;
      });
      setVillageStats(stats);
    } catch (err) {
      console.error('Failed to fetch village stats:', err);
    }
  };

  React.useEffect(() => {
    if (displayUnions.length > 0 && !selectedUnion) {
      setSelectedUnion(displayUnions[0].name);
    }
  }, [displayUnions]);

  const handleUnionChange = (unionName: string) => {
    setSelectedUnion(unionName);
    const union = displayUnions.find(u => u.name === unionName);
    if (union && union.villages.length > 0) {
      setTargetVillage(union.villages[0]);
    }
  };

  React.useEffect(() => {
    if (unionsData.length > 0 && !selectedUnionForVillage) {
      setSelectedUnionForVillage(unionsData[0].name);
    }
  }, [unionsData]);

  React.useEffect(() => {
    if (allVillages.length > 0 && !allVillages.includes(targetVillage)) {
      setTargetVillage(allVillages[0]);
    }
  }, [allVillages]);

  const handleAddUnion = async () => {
    if (!newUnion.trim()) return;
    try {
      const { error } = await supabase.from('unions').insert({ name: newUnion.trim() });
      if (error) throw error;
      setNewUnion('');
      toast.success('Union added!');
      if (onRefreshLists) onRefreshLists();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add union');
    }
  };

  const handleUpdateUnion = async (id: string, oldName: string) => {
    if (!editUnionName.trim() || editUnionName.trim() === oldName) {
      setEditingUnionId(null);
      return;
    }
    try {
      const { error } = await supabase.from('unions').update({ name: editUnionName.trim() }).eq('id', id);
      if (error) throw error;
      setEditingUnionId(null);
      toast.success('Union updated!');
      if (onRefreshLists) onRefreshLists();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update union');
    }
  };

  const handleAddVillage = async () => {
    if (!newVillage.trim() || !selectedUnionForVillage) {
      toast.error('Select a union and enter village name');
      return;
    }
    try {
      const { error } = await supabase.from('villages').insert({ 
        name: newVillage.trim(), 
        union_name: selectedUnionForVillage 
      });
      if (error) throw error;
      setNewVillage('');
      toast.success('Village added!');
      if (onRefreshLists) onRefreshLists();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add village');
    }
  };

  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) return;
    localStorage.setItem('CUSTOM_GEMINI_API_KEY', apiKeyInput.trim());
    setSavedApiKey(apiKeyInput.trim());
    setApiKeyInput('');
    toast.success('Gemini API Key saved locally!');
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('CUSTOM_GEMINI_API_KEY');
    setSavedApiKey(null);
    toast.success('Custom API Key cleared. Now using system key.');
  };

  const handleUpdateVillage = async (id: string, oldName: string) => {
    if (!editVillageName.trim() || editVillageName.trim() === oldName) {
      setEditingVillageId(null);
      return;
    }
    try {
      const { error } = await supabase.from('villages').update({ name: editVillageName.trim() }).eq('id', id);
      if (error) throw error;
      setEditingVillageId(null);
      toast.success('Village updated!');
      if (onRefreshLists) onRefreshLists();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update village');
    }
  };

  const handleDeleteUnion = async (name: string) => {
    if (!window.confirm(`Delete "${name}" union and all its villages?`)) return;
    try {
      const { error } = await supabase.from('unions').delete().eq('name', name);
      if (error) throw error;
      toast.success('Union deleted');
      if (onRefreshLists) onRefreshLists();
    } catch (err: any) {
      toast.error('Failed to delete union');
    }
  };

  const handleDeleteVillage = async (union: string, name: string) => {
    if (!window.confirm(`Delete "${name}" village from ${union}?`)) return;
    try {
      const { error } = await supabase.from('villages').delete().match({ name, union_name: union });
      if (error) throw error;
      toast.success('Village deleted');
      if (onRefreshLists) onRefreshLists();
    } catch (err: any) {
      toast.error('Failed to delete village');
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const limitedFiles = files.slice(0, 3);
    if (limitedFiles.length === 0) return;

    setProcessing(true);
    setExtractedVoters([]);

    let allExtracted: ExtractedVoter[] = [];
    let successCount = 0;

    for (const file of limitedFiles) {
      const isPDF = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');

      if (!isPDF && !isImage) {
        toast.error(`Skipping invalid file: ${file.name}`);
        continue;
      }

      try {
        // Look for the key in multiple possible locations
        // Priority: Local Storage (User Manual) > Vite Env > Process Env
        const apiKey = savedApiKey || 
                       import.meta.env.VITE_GEMINI_API_KEY || 
                       (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined) ||
                       (typeof process !== 'undefined' ? (process.env as any).VITE_GEMINI_API_KEY : undefined);
        
        if (!apiKey || apiKey === "undefined" || apiKey === "MY_GEMINI_API_KEY" || apiKey.length < 10) {
          console.error("Gemini API Key validation failed.");
          throw new Error("Gemini API Key পাওয়া যায়নি বা এটি ভুল। \n\nসমাধান:\n১. নিচের 'Settings' থেকে আপনার নিজস্ব API Key যোগ করুন।\n২ অথবা Vercel Settings-এ 'VITE_GEMINI_API_KEY' যোগ করে Redeploy করুন।");
        }

        const ai = new GoogleGenAI({ apiKey });
        const base64Data = await fileToBase64(file);
        const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
        
        const systemInstruction = `You are a professional OCR assistant for the Bangladesh Election Commission.
        Extract voter records from the provided image/PDF.
        
        CRITICAL LANGUAGE RULES:
        - All person names (name, father_name, mother_name) MUST be extracted in BENGALI UNICODE.
        - NEVER translate names into English.
        - Many EC documents use a "Board" font which appears garbled or like weird English characters in raw text. You MUST decode these into standard Bengali Unicode based on your knowledge of Bangladesh Election Commission documents.
  
        CRITICAL NUMERAL RULE:
        - ALL numbers (serial_no, voter_no, date_of_birth) MUST be in standard English numerals (0-9).
        - If the document contains Bengali numerals (০-৯), you MUST convert them to standard English numerals (0-9). Example: ০০১৬ becomes 0016, ০১/০১/১৯৮২ becomes 01/01/1982.
  
        DOCUMENT ANALYSIS:
        1. Detect if this is a COVER PAGE (summary, logos, counts) or a RECORDS PAGE (grid of voter boxes).
        2. If COVER PAGE: Output [{"message": "COVER_PAGE_DETECTED"}].
        3. If RECORDS PAGE: Extract all voter records.
  
        DATA MAPPING:
        - serial_no: The small serial number usually at the top left of each voter box (e.g., 0001, 0002).
        - voter_no: The voter ID.
        - name: Correct Bengali Unicode.
        - father_name / mother_name: Bengali names.
        - date_of_birth: DD/MM/YYYY.
        - gender: Male/Female.
  
        LIMIT: Extract up to 30 records maximum per page to ensure JSON validity.`;
  
        const generationConfig = {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                serial_no: { type: Type.STRING },
                voter_no: { type: Type.STRING },
                name: { type: Type.STRING, description: "Full name in Bengali Unicode" },
                father_name: { type: Type.STRING, description: "Father's name in Bengali" },
                mother_name: { type: Type.STRING, description: "Mother's name in Bengali" },
                date_of_birth: { type: Type.STRING, description: "DD/MM/YYYY" },
                gender: { type: Type.STRING, enum: ["Male", "Female"] },
                message: { type: Type.STRING }
              },
              required: ["voter_no", "name"],
            },
          },
        };
  
        // Prepare original image for cropping
        let originalImageCanvas: HTMLCanvasElement | null = null;
        
        if (isImage) {
          const img = new Image();
          img.src = `data:${file.type};base64,${base64Data}`;
          await new Promise((res) => img.onload = res);
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          originalImageCanvas = canvas;
        } else if (isPDF) {
          try {
            const loadingTask = pdfjsLib.getDocument({ data: atob(base64Data) });
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            if (context) {
              // @ts-ignore - Handle version differences in pdfjs-dist types
              await page.render({ canvasContext: context, viewport: viewport, canvas: canvas }).promise;
              originalImageCanvas = canvas;
            }
          } catch (pdfErr) {
            console.error("PDF preview error:", pdfErr);
          }
        }
  
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{
            parts: [{ inlineData: { mimeType: mimeType, data: base64Data } }]
          }],
          config: {
            ...generationConfig,
            systemInstruction
          }
        });
  
        const text = response.text;
        if (!text) {
          throw new Error("AI returned an empty response. The image might be too blurry or contains no readable text.");
        }

        let parsedResult;
        try {
          parsedResult = JSON.parse(text);
        } catch (jsonErr) {
          console.error("AI JSON Parse Error. Raw text:", text);
          throw new Error("AI returned invalid data format. Please try again with a clearer image.");
        }
        
        if (Array.isArray(parsedResult)) {
          const isCoverPage = parsedResult.some((item: any) => item.message === "COVER_PAGE_DETECTED");
          
          if (isCoverPage) {
            toast.error(`File "${file.name}" is a cover page. Skipped.`);
            continue;
          }
  
          if (parsedResult.length === 0) {
            toast.error(`No records found in "${file.name}".`);
          } else {
            const votersWithVillage = parsedResult
              .filter((v: any) => v.voter_no && v.name)
              .map((v: any): ExtractedVoter => {
                return {
                  serial_no: bnToEn(v.serial_no),
                  voter_no: bnToEn(v.voter_no),
                  name: v.name?.trim(),
                  father_name: v.father_name?.trim(),
                  mother_name: v.mother_name?.trim(),
                  date_of_birth: bnToEn(v.date_of_birth || v.dob),
                  gender: (v.gender === 'Female' ? 'Female' : (v.gender === 'Male' ? 'Male' : defaultGender)) as Gender,
                  village: targetVillage,
                  union_name: selectedUnion
                };
              });
            
            allExtracted = [...allExtracted, ...votersWithVillage];
            successCount++;
          }
        }
      } catch (err: any) {
        console.error(`Error processing ${file.name}:`, err);
        const errorMessage = err.message || "Unknown error";
        toast.error(`Failed to process ${file.name}: ${errorMessage.substring(0, 50)}${errorMessage.length > 50 ? '...' : ''}`, {
          duration: 5000
        });
      }
    }

    setExtractedVoters(allExtracted);
    if (successCount > 0) {
      toast.success(`Processed ${successCount} files. Found ${allExtracted.length} total records.`);
    }

    setProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      toast.error('Please upload a valid JSON file');
      return;
    }

    setProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const voters = Array.isArray(json) ? json : [json];
        
        const validatedVoters = voters.map((v: any) => ({
          serial_no: bnToEn(String(v.serial_no || '')),
          voter_no: bnToEn(String(v.voter_no || '')),
          name: String(v.name || ''),
          father_name: String(v.father_name || v.FatherName || ''),
          mother_name: String(v.mother_name || v.mother_Name || v.MotherName || ''),
          date_of_birth: bnToEn(String(v.date_of_birth || v.dob || v.DateOfBirth || '')),
          gender: (v.gender === 'Female' ? 'Female' : (v.gender === 'Male' ? 'Male' : defaultGender)) as Gender,
          village: targetVillage,
          union_name: selectedUnion
        })).filter(v => v.voter_no && v.name);

        setExtractedVoters(prev => [...prev, ...validatedVoters]);
        toast.success(`Imported ${validatedVoters.length} records from JSON`);
      } catch (err) {
        toast.error('Failed to parse JSON file');
      } finally {
        setProcessing(false);
        if (jsonInputRef.current) jsonInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleUndoLastUpload = async () => {
    if (lastUploadedIds.length === 0 || uploading) return;
    if (!window.confirm(`Undo last upload? This will delete the ${lastUploadedIds.length} records you just added.`)) return;

    setUploading(true);
    try {
      const { error } = await supabase
        .from('voters')
        .delete()
        .in('id', lastUploadedIds);

      if (error) throw error;
      
      toast.success(`Undo successful: Removed last ${lastUploadedIds.length} records.`);
      setLastUploadedIds([]);
      fetchVillageStats();
      if (onDataSaved) onDataSaved();
    } catch (err: any) {
      console.error('Undo error:', err);
      toast.error('Failed to undo upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAll = async () => {
    if (extractedVoters.length === 0) return;
    setUploading(true);

    try {
      const { data, error } = await supabase.from('voters').insert(extractedVoters).select('id');
      if (error) throw error;

      if (data) {
        setLastUploadedIds(data.map(d => d.id));
      }

      toast.success(`Saved ${extractedVoters.length} records!`);
      setExtractedVoters([]);
      fetchVillageStats();
      if (onDataSaved) onDataSaved();
    } catch (error: any) {
      console.error('Error saving records:', error);
      if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
        toast.error('Database table "voters" is missing. Please run the SQL setup script shown below.');
      } else {
        toast.error(error.message || 'Failed to save');
      }
    } finally {
      setUploading(false);
    }
  };

  const removeVoter = (index: number) => {
    setExtractedVoters(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearVillageData = async () => {
    if (!window.confirm(`WARNING: Are you sure you want to delete ALL records for ${targetVillage}?`)) return;
    if (!window.confirm(`FINAL CONFIRMATION: This will permanently erase everything from the database for ${targetVillage}. Continue?`)) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('voters')
        .delete()
        .eq('village', targetVillage);

      if (error) throw error;
      
      toast.success(`Successfully cleared all data for ${targetVillage}`);
      fetchVillageStats();
      if (onDataSaved) onDataSaved();
    } catch (error: any) {
      console.error('Error clearing village data:', error);
      toast.error('Failed to clear data');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col gap-4 lg:gap-6 max-w-7xl mx-auto w-full overflow-hidden min-h-0 bg-surface">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-4 lg:p-5 rounded-xl border border-slate-200 shadow-sm gap-4 shrink-0">
        <div className="w-full lg:w-auto">
          <h2 className="text-lg lg:text-xl font-bold text-slate-900 leading-tight">Admin Operations</h2>
          <p className="text-[10px] lg:text-[11px] text-slate-500 font-medium uppercase tracking-tighter mt-0.5">Bulk Upload & Database Management</p>
        </div>
        
        <div className="flex flex-col xl:flex-row xl:items-center gap-4 w-full lg:w-auto">
          {activeTab === 'import' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 h-10 shadow-sm shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Default Sex:</span>
              <select 
                value={defaultGender}
                onChange={(e) => setDefaultGender(e.target.value as Gender)}
                className="bg-transparent text-[11px] font-bold focus:outline-none cursor-pointer text-brand"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          )}

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto no-scrollbar shrink-0">
            <button 
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-2 px-3 lg:px-4 py-1.5 rounded text-[10px] lg:text-[11px] font-bold transition-all whitespace-nowrap ${
                activeTab === 'import' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-brand'
              }`}
            >
              <FileUp size={14} />
              IMPORT
            </button>
            <button 
              onClick={() => setActiveTab('manage')}
              className={`flex items-center gap-2 px-3 lg:px-4 py-1.5 rounded text-[10px] lg:text-[11px] font-bold transition-all whitespace-nowrap ${
                activeTab === 'manage' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-brand'
              }`}
            >
              <ListFilter size={14} />
              DATA
            </button>
            <button 
              onClick={() => setActiveTab('setup')}
              className={`flex items-center gap-2 px-3 lg:px-4 py-1.5 rounded text-[10px] lg:text-[11px] font-bold transition-all whitespace-nowrap ${
                activeTab === 'setup' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-brand'
              }`}
            >
              <Settings size={14} />
              SETUP
            </button>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full xl:w-auto">
            <div className="flex flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-lg p-1 shadow-sm h-10 overflow-hidden">
              <select 
                value={selectedUnion}
                onChange={(e) => handleUnionChange(e.target.value)}
                className="flex-1 sm:flex-none bg-transparent px-2 lg:px-3 py-1 text-[11px] lg:text-[12px] font-bold focus:outline-none cursor-pointer border-r border-slate-200 font-bengali min-w-[80px] lg:min-w-[120px]"
              >
                {displayUnions.map(u => (
                  <option key={u.name} value={u.name}>{u.name}</option>
                ))}
              </select>
              
              <select 
                value={targetVillage}
                onChange={(e) => setTargetVillage(e.target.value)}
                className="flex-1 sm:flex-none bg-transparent px-2 lg:px-3 py-1 text-[11px] lg:text-[12px] font-bold focus:outline-none cursor-pointer font-bengali min-w-[80px] lg:min-w-[120px]"
              >
                {displayUnions.find(u => u.name === selectedUnion)?.villages.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={handleClearVillageData}
              disabled={processing}
              className="px-3 border border-red-200 text-red-500 hover:bg-red-50 rounded transition-all disabled:opacity-50 flex items-center justify-center shrink-0 h-10"
              title={`Delete all data for ${targetVillage}`}
            >
              <Trash2 size={14} />
            </button>

            {activeTab === 'import' && lastUploadedIds.length > 0 && (
              <button 
                onClick={handleUndoLastUpload}
                disabled={uploading}
                className="px-3 border border-amber-200 text-amber-600 hover:bg-amber-50 rounded transition-all disabled:opacity-50 flex items-center justify-center shrink-0 h-10 gap-2 font-bold text-[10px]"
                title={`Undo last upload (${lastUploadedIds.length} records)`}
              >
                <RotateCcw size={14} />
                <span className="hidden lg:inline">UNDO</span>
              </button>
            )}

            {activeTab === 'import' && (
              <>
                <button
                  onClick={() => jsonInputRef.current?.click()}
                  disabled={processing}
                  className="flex-1 sm:flex-none h-10 flex items-center justify-center gap-2 bg-slate-900 text-white px-4 lg:px-5 rounded text-[10px] lg:text-[11px] font-bold hover:bg-black transition-all disabled:opacity-50 shadow-sm whitespace-nowrap"
                >
                  <FileText size={14} />
                  IMPORT JSON
                </button>

                <input 
                  type="file" 
                  ref={jsonInputRef} 
                  onChange={handleJsonUpload} 
                  className="hidden" 
                  accept=".json"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'setup' ? (
        <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-12">
            
            {/* Gemini API Key Management */}
            <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand border border-slate-100 shadow-sm">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Gemini API Configuration</h3>
                    <p className="text-xs text-slate-500">Add your own API key if the default limit is reached</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={savedApiKey ? "••••••••••••••••••••••••" : "Paste your Gemini API Key here..."}
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm font-mono focus:outline-brand"
                    />
                    <button 
                      onClick={handleSaveApiKey}
                      className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all flex items-center gap-2"
                    >
                      <CheckCircle size={14} />
                      SAVE KEY
                    </button>
                  </div>
                  
                  {savedApiKey && (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-500" />
                        <span className="text-[11px] font-bold text-emerald-700">Custom API Key is active from your local storage.</span>
                      </div>
                      <button 
                        onClick={handleClearApiKey}
                        className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-all"
                      >
                        REMOVE CUSTOM KEY
                      </button>
                    </div>
                  )}
                  
                  <p className="text-[10px] text-slate-400 font-medium">
                    * Your API Key is stored safely in your browser and is never sent to our servers. 
                    Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-brand underline">Google AI Studio</a>.
                  </p>
                </div>
            </section>

            <div className="h-[1px] bg-slate-100" />

            {/* Union Management */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Manage Unions (UP)</h3>
                    <p className="text-xs text-slate-500">Add or remove Unions from the system</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <input 
                    type="text" 
                    value={newUnion}
                    onChange={(e) => setNewUnion(e.target.value)}
                    placeholder="New Union Name (e.g. পাঙ্গাসী ইউনিয়ন)..."
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bengali focus:outline-brand"
                  />
                  <button 
                    onClick={handleAddUnion}
                    className="px-6 py-2 bg-brand text-white rounded-xl font-bold text-xs hover:bg-brand-dark transition-all"
                  >
                    ADD UNION
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {unionsData.map(union => (
                    <div key={union.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-brand/30 transition-all group">
                      {editingUnionId === union.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                           <input 
                             autoFocus
                             type="text" 
                             value={editUnionName}
                             onChange={(e) => setEditUnionName(e.target.value)}
                             className="flex-1 px-2 py-1 border border-brand/50 rounded-lg text-sm font-bengali focus:outline-none"
                             onKeyDown={(e) => e.key === 'Enter' && handleUpdateUnion(union.id, union.name)}
                           />
                           <button onClick={() => handleUpdateUnion(union.id, union.name)} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg">
                             <Check size={14} />
                           </button>
                           <button onClick={() => setEditingUnionId(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg">
                             <X size={14} />
                           </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-bengali text-sm font-bold text-slate-700">{union.name}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => {
                                setEditingUnionId(union.id);
                                setEditUnionName(union.name);
                              }}
                              className="p-1.5 text-slate-300 hover:text-brand hover:bg-brand/5 rounded-lg transition-all"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUnion(union.name)}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
            </section>

            <div className="h-[1px] bg-slate-100" />

            {/* Village Management */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Manage Villages</h3>
                    <p className="text-xs text-slate-500">Assign villages to Unions</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <select 
                    value={selectedUnionForVillage}
                    onChange={(e) => setSelectedUnionForVillage(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bengali focus:outline-brand"
                  >
                    <option value="">Select Union...</option>
                    {unionsData.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                  <input 
                    type="text" 
                    value={newVillage}
                    onChange={(e) => setNewVillage(e.target.value)}
                    placeholder="New Village Name..."
                    className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bengali focus:outline-brand"
                  />
                  <button 
                    onClick={handleAddVillage}
                    className="bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all"
                  >
                    ADD VILLAGE
                  </button>
                </div>

                <div className="space-y-6">
                  {displayUnions.map(union => {
                    const dbUnion = unionsData.find(u => u.name === union.name);
                    const isStatic = !dbUnion;
                    
                    return (
                      <div key={union.name} className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          {union.name}
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          {union.villages.length} Villages
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {union.villages.map(v => {
                            const dbVillage = villagesData.find(dv => dv.name === v && dv.union_name === union.name);
                            const isVillageStatic = !dbVillage;

                            return (
                              <div key={v} className="flex items-center gap-2 pl-3 pr-1 py-1 bg-slate-50 border border-slate-200 rounded-lg group hover:border-brand/30 transition-all min-h-[32px]">
                                {editingVillageId === dbVillage?.id ? (
                                  <div className="flex items-center gap-1">
                                    <input 
                                      autoFocus
                                      type="text" 
                                      value={editVillageName}
                                      onChange={(e) => setEditVillageName(e.target.value)}
                                      className="w-24 px-1 py-0.5 border border-brand/50 rounded text-[11px] font-bengali focus:outline-none bg-white"
                                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateVillage(dbVillage.id, dbVillage.name)}
                                    />
                                    <button onClick={() => handleUpdateVillage(dbVillage.id, dbVillage.name)} className="p-0.5 text-emerald-500">
                                      <Check size={12} />
                                    </button>
                                    <button onClick={() => setEditingVillageId(null)} className="p-0.5 text-slate-400">
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-xs font-bengali font-medium text-slate-600">{v}</span>
                                    <div className="flex items-center gap-1.5 ml-1">
                                      <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1 rounded">M: {villageStats[v]?.male || 0}</span>
                                      <span className="text-[9px] font-bold text-pink-500 bg-pink-50 px-1 rounded">F: {villageStats[v]?.female || 0}</span>
                                    </div>
                                    {!isVillageStatic && (
                                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                        <button 
                                          onClick={() => {
                                            setEditingVillageId(dbVillage.id);
                                            setEditVillageName(dbVillage.name);
                                          }}
                                          className="p-1 text-slate-300 hover:text-brand hover:bg-white rounded transition-all shadow-sm"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteVillage(union.name, v)}
                                          className="p-1 text-slate-300 hover:text-red-500 hover:bg-white rounded transition-all shadow-sm"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
            </section>
          </div>
        </div>
      ) : activeTab === 'manage' ? (
        <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <VoterList village={targetVillage} isAdmin={true} />
        </div>
      ) : (
        <>
          <AnimatePresence>
        {extractedVoters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 flex flex-col gap-3 min-h-0"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-1 gap-4">
              <div className="flex items-center gap-2 text-[10px] lg:text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                {extractedVoters.length} Records extracted by AI
              </div>
              <button
                onClick={handleSaveAll}
                disabled={uploading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded font-bold text-[10px] lg:text-[11px] hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 disabled:opacity-50 uppercase tracking-tighter whitespace-nowrap"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Confirm & Sync to Supabase
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-0">
              <div className="overflow-y-auto custom-scrollbar overflow-x-auto min-h-0 flex-1">
                <table className="w-full text-left border-collapse table-auto sm:table-fixed min-w-[800px]">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                    <tr>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-6 w-12">SL</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-30">Voter ID</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parents</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20">Sex</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-28">DOB</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-6 w-20">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {extractedVoters.map((voter, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-[10px] font-mono text-slate-400 pl-6">{voter.serial_no || i + 1}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-brand-dark font-bold tabular-nums">{voter.voter_no}</td>
                        <td className="px-4 py-3 font-bengali text-xs font-semibold">{voter.name}</td>
                        <td className="px-4 py-3 font-bengali text-[11px] text-slate-500 truncate">
                          {voter.father_name} / {voter.mother_name}
                        </td>
                        <td className="px-4 py-3">
                          <select 
                            value={voter.gender}
                            onChange={(e) => {
                              const newVoters = [...extractedVoters];
                              newVoters[i].gender = e.target.value as Gender;
                              setExtractedVoters(newVoters);
                            }}
                            className="text-[10px] font-bold border border-slate-200 rounded px-1 py-0.5 bg-slate-50"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{voter.date_of_birth}</td>
                        <td className="px-4 py-3 text-right pr-6">
                          <button 
                            onClick={() => removeVoter(i)}
                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!extractedVoters.length && !processing && (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-2xl p-6 bg-white/40">
          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4 text-slate-400 border border-slate-200">
            <FileText size={20} className="mr-0.5" />
            <ImageIcon size={20} className="-ml-0.5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Import Voter Data</h3>
          <p className="text-slate-500 text-center max-w-xs mb-6 text-[10px] font-medium leading-relaxed">
            Drag and drop your PDF or Image voter list for <span className="font-bengali font-bold text-brand-dark">{targetVillage}</span>.
            AI will automatically parse name, father's name, and DOB, even with complex fonts.
          </p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white border border-slate-300 px-6 py-2 rounded font-bold text-[10px] uppercase tracking-widest hover:border-brand hover:text-brand transition-all shadow-sm"
          >
            SELECT FILE
          </button>
          
          <div className="mt-8 w-full max-w-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Supabase Database Setup</p>
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-[9px] leading-relaxed text-slate-400 border border-slate-800 shadow-xl self-stretch overflow-x-auto">
              <pre className="text-slate-300">
{`create table unions (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  created_at timestamp with time zone default now()
);

create table villages (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  union_name text not null,
  created_at timestamp with time zone default now(),
  unique(name, union_name)
);

create table voters (
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

-- RLS & Policies
alter table unions enable row level security;
alter table villages enable row level security;
alter table voters enable row level security;

create policy "public_all" on unions for all using (true);
create policy "public_all" on villages for all using (true);
create policy "public_all" on voters for all using (true);`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {processing && (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <Loader2 size={32} className="animate-spin text-brand mb-4" />
          <h3 className="text-base font-bold text-slate-900 mb-1">AI-Powered Extraction Active</h3>
          <p className="text-[10px] text-slate-500 animate-pulse uppercase tracking-widest font-bold">Fixing Bengali Font & Scanning Records...</p>
        </div>
      )}
    </>
  )}
</div>
  );
}
