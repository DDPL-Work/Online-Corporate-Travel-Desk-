import { useState, useRef, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";
import { ToastWithTimer } from "../../utils/ToastConfirm";
import {
  HiDocumentText,
  HiXMark,
  HiCloudArrowUp,
  HiArrowDownTray,
  HiCheckCircle,
  HiExclamationCircle,
  HiExclamationTriangle,
  HiTableCells,
  HiArrowRight,
} from "react-icons/hi2";
import { FiRefreshCw, FiArrowRight as FiArrow } from "react-icons/fi";
import { MdOutlineFolder } from "react-icons/md";
import { uploadProjectsExcel } from "../../Redux/Actions/project.thunk";
import { fetchCorporateAdmin } from "../../Redux/Slice/corporateAdminSlice";
import { C } from "../Shared/color";

const REQUIRED_HEADERS = ["Project Name", "Project Code ID", "Client Name"];

function fmtSize(bytes) {
  return (bytes / 1024).toFixed(1) + " KB";
}

/* ─────────────────────────────────────────────────────────────── */
/*  Sub-Components                                                 */
/* ─────────────────────────────────────────────────────────────── */
function ValidationBox({ type, title, items }) {
  const styles = {
    success: { bg: "#ECFDF5", border: "#10B98130", text: "#065F46", icon: "#10B981" },
    error: { bg: "#FEF2F2", border: "#EF444430", text: "#991B1B", icon: "#EF4444" },
    warning: { bg: "#FFFBEB", border: "#F59E0B30", text: "#92400E", icon: "#F59E0B" },
  };
  const Icon = type === "success" ? HiCheckCircle : type === "error" ? HiExclamationCircle : HiExclamationTriangle;
  const s = styles[type] || styles.warning;
  
  return (
    <div className="rounded-2xl px-5 py-4 text-[13px] border animate-in fade-in slide-in-from-top-2" style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}>
      <div className="flex items-start gap-4">
        <Icon className="w-6 h-6 shrink-0" style={{ color: s.icon }} />
        <div>
          <p className="font-black uppercase tracking-tight text-sm">{title}</p>
          {items.length > 0 && (
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-xs opacity-75 font-bold">
              {items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ total, uploaded, skipped, failed }) {
  const pct = (v) => (total > 0 ? ((v / total) * 100).toFixed(1) + "%" : "0%");
  return (
    <div>
      <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200/50">
        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000 shadow-sm" style={{ width: pct(uploaded) }} />
        <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-1000 shadow-sm" style={{ width: pct(skipped) }} />
        <div className="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-1000 shadow-sm" style={{ width: pct(failed) }} />
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-3 text-[10px] font-black uppercase tracking-widest text-slate-400 mt-5">
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" /> Uploaded ({uploaded})</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" /> Duplicates ({skipped})</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm" /> Errors ({failed})</span>
      </div>
    </div>
  );
}

function ReportStat({ label, val, icon, color }) {
  return (
    <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 text-center transition-all hover:shadow-md hover:scale-[1.02]">
       <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm" style={{ background: `${color}15`, color }}>
         {icon}
       </div>
       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
       <p className="text-3xl font-black tabular-nums tracking-tight" style={{ color }}>{val}</p>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* ROOT                                                                          */
/* ───────────────────────────────────────────────────────────────────────────── */
export default function ProjectManagement() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);
  const [validation, setValidation] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const { loading } = useSelector((state) => state.corporateProject);
  const { corporate } = useSelector((state) => state.corporateAdmin);

  useEffect(() => {
    if (!corporate) dispatch(fetchCorporateAdmin());
  }, [corporate, dispatch]);

  const loadFile = useCallback((file) => {
    if (!file) return;
    const allowed = [".xlsx", ".xls", ".csv"];
    if (!allowed.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      setValidation({ type: "error", title: "Invalid File Type", items: ["Please provide a valid Excel (.xlsx, .xls) or CSV file."] });
      return;
    }
    setSelectedFile(file);
    setValidation(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (!rows.length) { 
          setValidation({ type: "error", title: "Empty File", items: ["The provided file contains no content."] }); 
          return; 
        }
        const headers = rows[0].map((h) => String(h || "").trim());
        const missing = REQUIRED_HEADERS.filter((r) => !headers.includes(r));
        if (missing.length) {
          setValidation({ type: "error", title: "Missing Headers", items: missing.map(h => `Missing Required Field: ${h}`) });
        } else {
          const dataRows = rows.slice(1).filter((r) => r.some((c) => c !== undefined && c !== ""));
          setValidation({ type: "success", title: "File Validated", items: [`${dataRows.length} projects ready to upload.`] });
        }
      } catch {
        setValidation({ type: "error", title: "Error Reading File", items: ["There was an error reading your file."] });
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files[0]);
  }, [loadFile]);

  const removeFile = () => {
    setSelectedFile(null); setValidation(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processUpload = async () => {
    if (!selectedFile) return;
    try {
      const res = await dispatch(uploadProjectsExcel(selectedFile)).unwrap();
      setResult({ 
        total: (res.insertedCount || 0) + (res.skippedCount || 0), 
        uploaded: res.insertedCount || 0, 
        skipped: res.skippedCount || 0, 
        failed: 0, 
        ts: new Date() 
      });
      ToastWithTimer({ 
        type: res.insertedCount > 0 ? "success" : "warning", 
        message: res.insertedCount > 0 ? `Successfully uploaded ${res.insertedCount} projects.` : "No new projects found." 
      });
      removeFile();
    } catch (err) { 
      ToastWithTimer({ type: "error", message: err.message || "Failed to upload." }); 
    }
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["Project Name", "Project Code ID", "Client Name"], ["Alpha Operations", "ALPHA-001", "Global Systems"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(wb, "Project_Upload_Template.xlsx");
  };

  const canUpload = selectedFile && validation?.type === "success" && !loading;

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      
      {/* Navy Header Section */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button onClick={() => navigate(-1)} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10">
                 <FiArrow className="rotate-180" size={20} />
               </button>
               <button onClick={() => dispatch(fetchCorporateAdmin())} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10">
                 <FiRefreshCw size={20} />
               </button>
             </div>
             
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />

             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10" >
                 <MdOutlineFolder size={28} />
               </div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">Projects</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                   Manage projects for {corporate?.corporateName || "Corporate"}
                 </p>
               </div>
             </div>
          </div>

          <button onClick={() => navigate("/projects-table")} className="group bg-[#E7C695] hover:bg-white text-[#000D26] px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl transition-all flex items-center gap-3 active:scale-[0.98]">
             View Projects <HiArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-10">
           <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-2xl overflow-hidden">
              <div className="px-10 py-6 border-b flex items-center justify-between" style={{ borderColor: C.border, background: C.offWhite }}>
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                    <h2 className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: C.navy }}>Bulk Import</h2>
                 </div>
                 <button onClick={downloadTemplate} className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-all" style={{ color: C.gold }}>
                    <HiArrowDownTray size={16} /> Get Template
                 </button>
              </div>

              <div className="p-10 space-y-8">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative border-2 border-dashed rounded-[2rem] p-16 text-center cursor-pointer transition-all ${dragOver ? "bg-[#003399]05 border-gold scale-[0.99]" : "border-slate-200 hover:border-[#003399] hover:bg-slate-50"}`}
                >
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => loadFile(e.target.files[0])} />
                  <div className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 transition-transform group-hover:-translate-y-2" style={{ background: `${C.gold}15`, color: C.gold }}>
                    <HiCloudArrowUp size={40} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight" style={{ color: C.navy }}>Upload Excel File</h3>
                  <p className="text-[10px] font-bold uppercase tracking-[2px] mt-2 opacity-40">Drag & Drop Excel File or Browse Files</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {REQUIRED_HEADERS.map(h => (
                    <div key={h} className="p-4 rounded-2xl border flex items-center gap-3 transition-all hover:shadow-sm" style={{ background: C.offWhite, borderColor: C.border }}>
                       <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                         <HiCheckCircle className="text-emerald-500" size={14} />
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-tight text-slate-500">{h}</span>
                    </div>
                  ))}
                </div>

                {selectedFile && (
                  <div className="p-5 rounded-2xl border flex items-center gap-4 animate-in slide-in-from-top-4" style={{ background: `${C.navy}05`, borderColor: `${C.navy}15` }}>
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                      <HiDocumentText className="text-[#003399]" size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-sm font-black truncate text-slate-800">{selectedFile.name}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{fmtSize(selectedFile.size)}</p>
                    </div>
                    <button onClick={removeFile} className="w-10 h-10 rounded-xl hover:bg-white hover:text-rose-500 transition-all flex items-center justify-center text-slate-300 shadow-sm"><HiXMark size={20} /></button>
                  </div>
                )}

                {validation && <ValidationBox {...validation} />}

                <div className="flex gap-5 pt-4">
                  <button
                    disabled={!canUpload}
                    onClick={processUpload}
                    className="flex-[2] py-5 rounded-[1.2rem] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-br from-[#003399] to-[#000d26]"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-3">
                         <FiRefreshCw className="animate-spin" /> Uploading...
                      </span>
                    ) : "Upload"}
                  </button>
                  <button onClick={removeFile} className="flex-1 py-5 rounded-[1.2rem] border-2 border-slate-100 font-black text-xs uppercase tracking-[0.2em] transition-all hover:bg-slate-50 text-slate-400">
                    Cancel
                  </button>
                </div>
              </div>
           </div>

           {result && (
              <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-2xl overflow-hidden animate-in zoom-in duration-500">
                <div className="px-10 py-6 border-b bg-slate-50/50" style={{ borderColor: C.border }}>
                   <div className="flex items-center gap-3">
                      <HiTableCells className="text-[#003399]" />
                      <h2 className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: C.navy }}>Upload Summary</h2>
                   </div>
                </div>
                <div className="p-10 space-y-10">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <ReportStat label="Total Found" val={result.total} icon={<HiTableCells size={24} />} color={C.navy} />
                    <ReportStat label="Success" val={result.uploaded} icon={<HiCheckCircle size={24} />} color="#10B981" />
                    <ReportStat label="Duplicate" val={result.skipped} icon={<HiExclamationTriangle size={24} />} color="#F59E0B" />
                    <ReportStat label="Errors" val={result.failed} icon={<HiExclamationCircle size={24} />} color="#EF4444" />
                  </div>
                  <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                     <ProgressBar {...result} />
                  </div>
                </div>
              </div>
           )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-2xl overflow-hidden sticky top-8">
              <div className="px-8 py-6 border-b" style={{ borderColor: C.border, background: C.offWhite }}>
                 <h2 className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: C.navy }}>How to Upload</h2>
              </div>
              <div className="p-8 space-y-8">
                 {[
                   { n: "01", t: "Download Template", d: "Download the template to see the required format." },
                   { n: "02", t: "Fill Data", d: "Ensure Project IDs and Client Names are unique." },
                   { n: "03", t: "Upload", d: "Upload the file to add projects." }
                 ].map(step => (
                   <div key={step.n} className="flex gap-5 group">
                      <span className="text-3xl font-black italic text-[#E7C695]/20 group-hover:text-[#E7C695]/40 transition-colors">{step.n}</span>
                      <div className="pt-1">
                         <p className="text-[13px] font-black tracking-tight" style={{ color: C.navy }}>{step.t}</p>
                         <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-medium">{step.d}</p>
                      </div>
                   </div>
                 ))}

                 <div className="p-6 rounded-[1.5rem] bg-amber-50/50 border border-amber-100 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                       <HiExclamationTriangle className="text-amber-500" size={14} />
                       <p className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-700">Important Rules</p>
                    </div>
                    <ul className="space-y-2 text-[11px] text-amber-900/60 font-bold leading-tight">
                       <li className="flex gap-2"><span>•</span> Duplicate Project Codes will be skipped.</li>
                       <li className="flex gap-2"><span>•</span> Empty fields in required columns will be skipped.</li>
                    </ul>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
