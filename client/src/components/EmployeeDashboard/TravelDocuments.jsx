// client/src/components/EmployeeDashboard/TravelDocuments.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  FiUpload,
  FiTrash2,
  FiEye,
  FiFileText,
  FiCreditCard,
  FiGlobe,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiArrowRight,
  FiRefreshCw,
  FiX,
  FiPlus,
  FiHash,
  FiXCircle,
  FiChevronRight,
  FiLayers,
  FiShield,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchMyDocuments,
  uploadDocument,
  deleteDocument,
} from "../../Redux/Slice/documentSlice";
import { ToastWithTimer } from "../../utils/ToastConfirm";
import CustomDatePicker from "../Shared/CustomDatePicker";
import Swal from "sweetalert2";
import { C } from "../Shared/color";

const DOC_TYPES = [
  { id: "passport", label: "Passport", icon: FiGlobe, color: "#003399" },
  { id: "visa", label: "Visa", icon: FiFileText, color: "#003399" },
  { id: "pan", label: "Pan card", icon: FiCreditCard, color: "#003399" },
  { id: "upload", label: "Add Document", icon: FiPlus, color: "#E7C695" },
];

const STATUS_MAP = {
  expired: {
    label: "Expired",
    icon: FiXCircle,
    badge: "bg-rose-50 text-rose-600 border border-rose-100",
  },
  soon: {
    label: "Expiring Soon",
    icon: FiClock,
    badge: "bg-amber-50 text-amber-600 border border-amber-100",
  },
  valid: {
    label: "Valid",
    icon: FiCheckCircle,
    badge: "bg-teal-50 text-teal-600 border border-teal-100",
  },
};

export default function TravelDocuments() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { documents, uploading, error } = useSelector((s) => s.documents);
  const fileRef = useRef();
  
  const [activeTab, setActiveTab] = useState("passport");
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({
    type: "passport",
    name: "Passport",
    number: "",
    issue: "",
    expiry: "",
    file: null,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => { dispatch(fetchMyDocuments()); }, [dispatch]);

  useEffect(() => {
    if (error) ToastWithTimer({ message: error, type: "error" });
  }, [error]);

  const getStatus = (expiry, type) => {
    if (type === "pan" || !expiry) return null;
    const diff = (new Date(expiry) - new Date()) / 86400000;
    if (diff < 0) return STATUS_MAP.expired;
    if (diff <= 30) return STATUS_MAP.soon;
    return STATUS_MAP.valid;
  };

  const handleUpload = async () => {
    if (!form.file) {
      ToastWithTimer({ message: "Please select a file first", type: "error" });
      return;
    }
    try {
      const res = await dispatch(uploadDocument(form)).unwrap();
      ToastWithTimer({ message: "Document uploaded successfully", type: "success" });
      if (res?.extracted) {
        setForm({ type: form.type, name: "", number: res.extracted.number || "", issue: res.extracted.issue || "", expiry: res.extracted.expiry || "", file: null });
      } else {
        setForm((f) => ({ ...f, name: "", number: "", issue: "", expiry: "", file: null }));
      }
      if (fileRef.current) fileRef.current.value = "";
      setActiveTab(form.type === "passport" ? "passport" : form.type === "pan" ? "pan" : "visa");
    } catch (err) {
      ToastWithTimer({ message: err || "Upload failed", type: "error" });
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This document will be permanently removed from your profile.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#003399",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
      background: "#fff",
      borderRadius: "1.5rem",
    });

    if (result.isConfirmed) {
      try {
        await dispatch(deleteDocument(id)).unwrap();
        ToastWithTimer({ message: "Document deleted successfully", type: "success" });
      } catch (err) {
        ToastWithTimer({ message: err || "Delete failed", type: "error" });
      }
    }
  };

  const filteredDocs = useMemo(() => {
    if (activeTab === "upload") return [];
    return documents.filter(d => d.type === (activeTab === "visa" ? "visa" : activeTab));
  }, [documents, activeTab]);



  return (
    <div className="min-h-screen font-sans pb-24 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* ── Page Header ── */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-24 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button onClick={() => navigate(-1)} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"><FiArrowRight className="rotate-180" size={20} /></button>
               <div className={`p-3 rounded-xl bg-white/10 border border-white/10 ${uploading ? "animate-spin" : ""}`}>
                  <FiRefreshCw size={20} />
               </div>
             </div>
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />
             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10"><FiCreditCard size={28} /></div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">My Documents</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">Manage your travel documents</p>
               </div>
             </div>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md rounded-[1.25rem] border border-white/10">
              <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Items</p>
                  <p className="text-xl font-black">{documents.length}</p>
              </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="w-full px-4 md:px-10 -mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ── Sidebar Tabs ── */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden p-4">
              <div className="space-y-2">
                {DOC_TYPES.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setErrors({}); }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group
                      ${activeTab === tab.id 
                        ? "shadow-lg scale-[1.02]" 
                        : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                      }`}
                    style={{ background: activeTab === tab.id ? C.gold : undefined }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                        ${activeTab === tab.id ? "bg-[#003399]/10" : "bg-slate-50 group-hover:bg-white shadow-sm"}`}>
                        <tab.icon size={20} className={activeTab === tab.id ? "text-[#003399]" : ""} />
                      </div>
                      <div className="text-left">
                        <p className={`text-[11px] font-black uppercase tracking-widest ${activeTab === tab.id ? "text-[#003399]" : "text-slate-700"}`}>{tab.label}</p>
                        {tab.id !== "upload" && (
                          <p className={`text-[9px] font-bold ${activeTab === tab.id ? "text-[#003399]/60" : "text-slate-400"}`}>
                            {documents.filter(d => d.type === (tab.id === "visa" ? "visa" : tab.id)).length} Assets
                          </p>
                        )}
                      </div>
                    </div>
                    {activeTab === tab.id && <FiChevronRight size={16} className="text-[#003399]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Main Content Area ── */}
          <div className="lg:col-span-9">
            {activeTab === "upload" ? (
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="p-8 border-b border-slate-50 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#E7C695]/10 flex items-center justify-center text-[#E7C695] shadow-sm">
                       <FiPlus size={24} />
                    </div>
                    <div>
                       <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">Add New Document</h2>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Upload a new travel document</p>
                    </div>
                 </div>

                 <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                          <div className="space-y-4">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Document Type</label>
                             <div className="grid grid-cols-3 gap-3">
                                {DOC_TYPES.filter(t => t.id !== "upload").map(type => (
                                   <button
                                      key={type.id}
                                      onClick={() => {
                                         setForm(f => ({ ...f, type: type.id === "visa" ? "visa" : type.id, name: type.label, number: "", issue: "", expiry: "" }));
                                         setErrors({});
                                      }}
                                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all
                                        ${form.type === (type.id === "visa" ? "visa" : type.id) 
                                          ? "bg-[#E7C695]/10 text-[#003399]" 
                                          : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"}`}
                                      style={{ borderColor: form.type === (type.id === "visa" ? "visa" : type.id) ? C.gold : undefined }}
                                   >
                                      <type.icon size={20} />
                                      <span className="text-[9px] font-black uppercase tracking-tight">{type.id === "passport" ? "Passport" : type.id === "visa" ? "Visa" : "PAN Card"}</span>
                                   </button>
                                ))}
                             </div>
                          </div>

                          <div className="grid grid-cols-1 gap-6">
                             {[
                                { label: "Display Name", key: "name", type: "text", icon: FiFileText },
                                { label: `${form.type.charAt(0).toUpperCase() + form.type.slice(1)} No.`, key: "number", type: "text", icon: FiHash },
                                ...(form.type !== "pan" ? [
                                   { label: "Issue Date", key: "issue", type: "date", icon: FiClock },
                                   { label: "Expiry Date", key: "expiry", type: "date", icon: FiClock }
                                ] : []),
                             ].map((f) => (
                                <div key={f.key} className="space-y-2">
                                   {f.type === "date" ? (
                                      <CustomDatePicker 
                                         label={f.label}
                                         value={form[f.key]}
                                         onChange={(val) => setForm(prev => ({ ...prev, [f.key]: val }))}
                                      />
                                   ) : (
                                      <>
                                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                            <f.icon size={10} style={{ color: C.gold }} /> {f.label}
                                         </label>
                                         <input
                                            type={f.type}
                                            value={form[f.key]}
                                            onChange={(e) => {
                                               let val = e.target.value;
                                               if (f.key === "number") {
                                                  val = val.toUpperCase();
                                                  if (form.type === "pan") {
                                                     // Limit to 10 chars, enforce alpha/numeric blocks where possible
                                                     val = val.slice(0, 10).replace(/[^A-Z0-9]/g, "");
                                                  }
                                               }
                                               setForm(prev => ({ ...prev, [f.key]: val }));
                                            }}
                                            onBlur={(e) => {
                                               if (f.key === "number" && form.type === "pan" && form.number.length > 0) {
                                                  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
                                                  if (!panRegex.test(form.number)) {
                                                     setErrors(prev => ({ ...prev, number: "Invalid PAN format (Expected: ABCDE1234F)" }));
                                                  } else {
                                                     setErrors(prev => { const { number, ...rest } = prev; return rest; });
                                                  }
                                               }
                                            }}
                                            className={`w-full px-5 py-3 text-sm font-bold text-slate-900 border-1.5 rounded-2xl outline-none transition-all shadow-sm
                                               ${errors[f.key] ? "border-rose-400 bg-rose-50" : ""}`}
                                            style={{ backgroundColor: !errors[f.key] ? C.gold + "11" : undefined, borderColor: !errors[f.key] ? C.gold + "44" : undefined }}
                                         />
                                         {errors[f.key] && (
                                            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-2 animate-in fade-in slide-in-from-top-1">
                                               {errors[f.key]}
                                            </p>
                                         )}
                                      </>
                                   )}
                                </div>
                             ))}
                          </div>
                       </div>

                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Attachment</label>
                          <div
                             onDragOver={(e) => { e.preventDefault(); !form.file && setDragOver(true); }}
                             onDragLeave={() => setDragOver(false)}
                             onDrop={(e) => { e.preventDefault(); setDragOver(false); if(form.file) return; const f = e.dataTransfer.files[0]; if (f) setForm(s => ({ ...s, file: f })); }}
                             className={`h-[350px] relative flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed transition-all 
                               ${form.file ? "border-[#003399] bg-[#003399]/5 cursor-default" : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-[#003399]/40"}
                               ${dragOver ? "border-[#003399] bg-[#003399]/5" : ""}`}
                          >
                             <input 
                                ref={fileRef} 
                                type="file" 
                                className="hidden" 
                                accept="image/*,application/pdf"
                                onChange={(e) => setForm(f => ({ ...f, file: e.target.files[0] }))} 
                             />
                             
                             {form.file ? (
                                <>
                                   <div className="w-20 h-20 rounded-[2rem] bg-white flex items-center justify-center text-[#003399] shadow-xl mb-4 animate-in zoom-in-50"><FiFileText size={40} /></div>
                                   <p className="text-sm font-black text-[#003399] px-8 text-center truncate w-full">{form.file.name}</p>
                                   <button 
                                      onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, file: null })); if(fileRef.current) fileRef.current.value = ""; }}
                                      className="mt-4 flex items-center gap-2 px-6 py-2 bg-rose-50 text-rose-500 rounded-xl border border-rose-100 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                   >
                                      <FiX size={14} /> Cancel Selection
                                   </button>
                                </>
                             ) : (
                                <>
                                   <div className="w-20 h-20 rounded-[2rem] bg-white flex items-center justify-center text-slate-200 shadow-sm border border-slate-100 mb-6"><FiUpload size={40} /></div>
                                   <p className="text-sm font-black text-slate-600 mb-8">Authorize your document attachment</p>
                                   
                                   <div className="w-full px-12">
                                      <button 
                                         onClick={() => fileRef.current?.click()}
                                         className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-[#003399] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#000d26] transition-all shadow-xl"
                                      >
                                         <FiFileText size={16} /> Browse Assets
                                      </button>
                                   </div>
                                   
                                   <p className="text-[9px] text-slate-400 mt-8 font-bold uppercase tracking-widest opacity-60">Supported: All Images & PDFs</p>
                                </>
                             )}
                          </div>
                       </div>
                    </div>

                    <button
                       onClick={handleUpload}
                       disabled={uploading}
                       className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-[3px] transition-all shadow-xl flex items-center justify-center gap-4
                         ${uploading ? "bg-slate-100 text-slate-300 cursor-not-allowed" : "hover:shadow-2xl hover:scale-[1.01] active:scale-[0.98]"}`}
                       style={{ background: uploading ? undefined : C.gold, color: uploading ? undefined : "#003399" }}
                    >
                       {uploading ? <FiRefreshCw className="animate-spin" size={18} /> : <FiUpload size={18} />}
                       {uploading ? "Securing Asset..." : "Confirm & Deposit to Vault"}
                    </button>
                 </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center justify-between p-6 rounded-[2rem] shadow-xl mb-4" style={{ background: C.gold }}>
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-[#003399]">
                         {DOC_TYPES.find(t => t.id === activeTab)?.icon({ size: 24 })}
                      </div>
                      <div>
                         <h2 className="text-xl font-black text-[#003399] tracking-tight leading-none">{DOC_TYPES.find(t => t.id === activeTab)?.label}</h2>
                         <p className="text-[10px] font-bold text-[#003399]/60 uppercase tracking-widest mt-2">{filteredDocs.length} Documents</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => {
                       const selected = DOC_TYPES.find(t => t.id === activeTab);
                       setActiveTab("upload");
                       setForm(f => ({ ...f, type: activeTab, name: selected?.label || "", number: "", issue: "", expiry: "" }));
                       setErrors({});
                    }}
                    className="flex items-center gap-3 px-6 py-3 bg-[#003399] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#000d26] transition-all shadow-lg"
                   >
                     <FiPlus size={16} /> Add Document
                   </button>
                </div>

                {filteredDocs.length === 0 ? (
                  <div className="py-32 bg-white rounded-[3rem] border border-slate-100 shadow-xl flex flex-col items-center gap-6">
                     <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center text-slate-100">
                        {DOC_TYPES.find(t => t.id === activeTab)?.icon({ size: 48 })}
                     </div>
                     <div className="text-center">
                        <p className="text-lg font-black text-slate-400">No records found</p>
                        <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest mt-1">Please deposit your credentials to this category</p>
                     </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredDocs.map((doc) => (
                      <DocumentCard key={doc._id} doc={doc} getStatus={getStatus} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentCard({ doc, getStatus, onDelete }) {
  const status = getStatus(doc.expiry, doc.type);
  return (
    <div className="group bg-white rounded-[2.5rem] border border-slate-200 shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500">
      <div className="h-2.5 bg-gradient-to-r from-[#003399] to-[#000d26]" />
      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-[#003399] shadow-sm border border-slate-100">
                 {doc.type === "passport" ? <FiGlobe size={20} /> : doc.type === "visa" ? <FiFileText size={20} /> : <FiCreditCard size={20} />}
              </div>
              <div>
                 <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight truncate max-w-[150px]">{doc.name || doc.type}</h3>
                 <p className="text-[10px] font-bold text-gold uppercase tracking-widest mt-1">{doc.type}</p>
              </div>
           </div>
           {status && (
             <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm ${status.badge}`}>
               <status.icon size={12} /> {status.label}
             </span>
           )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {doc.number && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><FiHash size={10} /> Doc Number</p>
               <p className="text-[12px] font-black text-slate-800 truncate">{doc.number}</p>
            </div>
          )}
          {doc.type !== "pan" && doc.expiry && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><FiClock size={10} /> Validity</p>
               <p className="text-[12px] font-black text-slate-800">{new Date(doc.expiry).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
            </div>
          )}
          {doc.type === "pan" && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><FiShield size={10} /> Status</p>
               <p className="text-[12px] font-black text-slate-800">Permanent ID</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 pt-6 border-t border-slate-50">
          <a 
            href={doc.fileUrl} 
            target="_blank" 
            rel="noreferrer" 
            className="flex-1 flex items-center justify-center gap-3 py-3 bg-[#003399] text-white rounded-2xl text-[11px] font-black uppercase tracking-[2px] hover:bg-[#000d26] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
          >
             <FiEye size={14} /> Open File
          </a>
          <button 
            onClick={() => onDelete(doc._id)} 
            className="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-500 border border-rose-100 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm group"
          >
             <FiTrash2 size={18} className="transition-transform group-hover:scale-110" />
          </button>
        </div>
      </div>
    </div>
  );
}
