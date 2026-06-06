import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiArrowLeft, FiTrash2, FiPlus, FiAlertCircle } from "react-icons/fi";
import { FaPlane, FaHotel } from "react-icons/fa";
import { MdBusiness } from "react-icons/md";
import { toast } from "sonner";
import { getAllCorporateMarkups, deleteCorporateMarkup, saveCorporateMarkup } from "../../Redux/Actions/markup.thunks";
import axios from "../../API/axios";
import { airlineLogo } from "../../utils/formatter";

const C = {
  navy: "#003399",
  offWhite: "#f8fafc",
};

const CABIN_CLASS_MAP = {
  1: "All",
  2: "Economy",
  3: "Premium Economy",
  4: "Business",
  5: "Premium Business",
  6: "First"
};

export default function CorporateMarkupList() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const corporate = location.state?.corporate || {
    _id: id,
    corporateName: "Corporate Account",
    corporateCode: "CORP-" + id?.substring(0, 4)?.toUpperCase() || "CORP-001",
  };

  const { configuredMarkups, fetchMarkupsLoading, deleteMarkupLoading } = useSelector(state => state.markup);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, markupDoc: null, idx: null, type: null, rule: null, productType: null });
  const [resolvedNames, setResolvedNames] = useState({});

  useEffect(() => {
    dispatch(getAllCorporateMarkups(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (!configuredMarkups || configuredMarkups.length === 0) return;
    
    const airlinesToFetch = new Set();
    const airportsToFetch = new Set();

    configuredMarkups.forEach(doc => {
      if (doc.productType === 'flight' && doc.rules) {
        doc.rules.forEach(rule => {
          if (rule.criteria?.airline) airlinesToFetch.add(rule.criteria.airline);
          if (rule.criteria?.origin) airportsToFetch.add(rule.criteria.origin);
          if (rule.criteria?.destination) airportsToFetch.add(rule.criteria.destination);
        });
      }
    });

    const fetchNames = async () => {
      const newNames = { ...resolvedNames };
      let changed = false;

      for (const code of airlinesToFetch) {
        if (!newNames[code]) {
          try {
            const res = await axios.get(`/markup/airlines?search=${code}&limit=1`);
            if (res.data?.data?.[0]) {
              newNames[code] = res.data.data[0].name;
              changed = true;
            }
          } catch(e) {}
        }
      }

      for (const code of airportsToFetch) {
        if (!newNames[code]) {
          try {
            const res = await axios.get(`/markup/airports?search=${code}&limit=1`);
            if (res.data?.data?.[0]) {
              const apt = res.data.data[0];
              newNames[code] = apt.name ? `${apt.name}, ${apt.city}` : apt.city;
              changed = true;
            }
          } catch(e) {}
        }
      }

      if (changed) setResolvedNames(newNames);
    };

    fetchNames();
  }, [configuredMarkups]);

  const handleDeleteClick = (productType, markupDoc) => {
    setDeleteModal({ isOpen: true, type: 'doc', productType, markupDoc });
  };

  const updateSlab = (sIdx, field, val) => {
    const updated = [...editFareSlabs];
    updated[sIdx] = { ...updated[sIdx], [field]: val };
    setEditFareSlabs(updated);
  };

  const startEdit = (docId, idx, rule, markupDoc) => {
    navigate(`/corporate-markup/${id}`, {
      state: {
        corporate,
        editMode: true,
        editRule: rule,
        editIndex: idx,
        markupDoc: markupDoc
      }
    });
  };

  const handleSaveEdit = async (markupDoc, idx) => {
    try {
      const updatedRules = [...markupDoc.rules];
      updatedRules[idx] = {
        ...updatedRules[idx],
        markupValue: Number(editValue),
        markupMethod: editMethod,
        fareSlabs: editFareSlabs
      };

      const payload = {
        corporateId: id,
        productType: markupDoc.productType,
        isActive: markupDoc.isActive,
        rules: updatedRules
      };

      await dispatch(saveCorporateMarkup(payload)).unwrap();
      toast.success("Rule updated successfully!");
      setEditingRule(null);
      dispatch(getAllCorporateMarkups(id));
    } catch (error) {
      toast.error(error || "Failed to update rule");
    }
  };

  const handleDeleteRuleClick = (markupDoc, idx, rule) => {
    setDeleteModal({ isOpen: true, type: 'rule', markupDoc, idx, rule });
  };

  const confirmDelete = async () => {
    const { markupDoc, idx, type, productType } = deleteModal;
    
    if (type === 'rule') {
      try {
        const updatedRules = [...markupDoc.rules];
        updatedRules.splice(idx, 1);

        if (updatedRules.length === 0) {
          await dispatch(deleteCorporateMarkup({ corporateId: id, productType: markupDoc.productType })).unwrap();
        } else {
          const payload = {
            corporateId: id,
            productType: markupDoc.productType,
            isActive: markupDoc.isActive,
            rules: updatedRules
          };
          await dispatch(saveCorporateMarkup(payload)).unwrap();
        }
        
        toast.success("Rule deleted successfully!");
        dispatch(getAllCorporateMarkups(id));
      } catch (error) {
        toast.error(error || "Failed to delete rule");
      }
    } else if (type === 'doc') {
      try {
        await dispatch(deleteCorporateMarkup({ corporateId: id, productType })).unwrap();
        toast.success(`${productType.charAt(0).toUpperCase() + productType.slice(1)} markup deleted successfully!`);
        dispatch(getAllCorporateMarkups(id));
      } catch (error) {
        toast.error(error || "Failed to delete markup configuration");
      }
    }
    
    setDeleteModal({ isOpen: false, markupDoc: null, idx: null, type: null, rule: null, productType: null });
  };

  return (
    <div className="min-h-screen font-sans pb-32 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* HEADER SECTION */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(-1)}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white shadow-sm"
            >
              <FiArrowLeft size={20} />
            </button>
            <div className="h-12 w-px bg-white/10 mx-2 hidden md:block" />
            <div>
              <h1 className="text-3xl font-black tracking-tight leading-none">Configured Markups</h1>
              <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                Manage saved markup rules
              </p>
            </div>
          </div>
          
          <div className="flex flex-col md:items-end text-left md:text-right shrink-0">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Selected Corporate</p>
            <div className="flex items-center gap-2">
              <MdBusiness size={18} className="text-white/80" />
              <p className="text-lg font-black text-white truncate max-w-[280px]" title={corporate.corporateName}>
                {corporate.corporateName}
              </p>
            </div>
            <button
              onClick={() => navigate(`/corporate-markup/${id}`, { state: { corporate } })}
              className="mt-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white flex items-center gap-2 transition-colors shadow-lg"
            >
              <FiPlus size={14} /> Add New Rules
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT SECTION */}
      <div className="w-full px-4 md:px-10 -mt-10 max-w-6xl mx-auto space-y-6">
        {fetchMarkupsLoading ? (
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500 font-medium">
            Loading configured markups...
          </div>
        ) : configuredMarkups?.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FiAlertCircle size={28} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-black text-slate-700 mb-2">No Markups Configured</h3>
            <p className="text-sm text-slate-500 max-w-md">
              There are currently no active markup rules configured for this corporate account.
            </p>
            <button
              onClick={() => navigate(`/corporate-markup/${id}`, { state: { corporate } })}
              className="mt-6 px-6 py-3 bg-[#003399] hover:bg-[#002266] rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-colors"
            >
              Create First Markup
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {configuredMarkups.map((markupDoc) => (
              <div key={markupDoc._id} className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${markupDoc.productType === 'flight' ? 'bg-blue-100 text-[#003399]' : 'bg-orange-100 text-orange-600'}`}>
                      {markupDoc.productType === 'flight' ? <FaPlane size={18} /> : <FaHotel size={18} />}
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-800 capitalize">{markupDoc.productType} Markup</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {markupDoc.rules?.length || 0} Rule(s) Active
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteClick(markupDoc.productType, markupDoc)}
                    disabled={deleteMarkupLoading}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs uppercase tracking-widest rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FiTrash2 size={14} /> Delete {markupDoc.productType} Config
                  </button>
                </div>
                
                <div className="flex-1 bg-white overflow-x-auto">
                  {markupDoc.rules?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6 bg-slate-50/50">
                      {markupDoc.rules.map((rule, idx) => {
                        return (
                          <div 
                            key={idx} 
                            className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-300 transition-all flex flex-col group"
                          >
                            {/* Card Header (Category & Actions) */}
                            <div className="flex items-start justify-between mb-5">
                              <span className="text-[10px] font-black text-[#003399] bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg uppercase tracking-wider inline-block">
                                {rule.category}
                              </span>
                              
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEdit(markupDoc._id, idx, rule, markupDoc)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-[#003399] hover:bg-blue-50 rounded-md transition-colors bg-white border border-slate-200" title="Edit">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button onClick={() => handleDeleteRuleClick(markupDoc, idx, rule)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors bg-white border border-slate-200" title="Delete">
                                  <FiTrash2 size={12} />
                                </button>
                              </div>
                            </div>
                            
                            {/* Criteria Section */}
                            <div className="flex-1 mb-6">
                              <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Criteria Target</h4>
                              {Object.keys(rule.criteria || {}).length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(rule.criteria).map(([key, val]) => {
                                    if (!val) return null;
                                    
                                    let displayValue = val;
                                    if (key === 'airline') {
                                      displayValue = resolvedNames[val] ? `${resolvedNames[val]} (${val})` : val;
                                    } else if (key === 'origin' || key === 'destination') {
                                      displayValue = resolvedNames[val] ? `${resolvedNames[val]} (${val})` : val;
                                    } else if (key === 'cabinClass') {
                                      displayValue = `${CABIN_CLASS_MAP[val] || val} (Code: ${val})`;
                                    }

                                    return (
                                      <span key={key} className="text-xs font-bold text-slate-700 bg-slate-100/80 border border-slate-200/60 px-2.5 py-1.5 rounded-md flex items-center">
                                        <span className="text-slate-500 capitalize mr-1.5 font-medium">{key}:</span>
                                        {key === 'airline' && (
                                          <img src={airlineLogo(val)} alt={val} className="w-5 h-5 object-contain inline-block mr-1.5 rounded-sm" />
                                        )}
                                        {displayValue}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : rule.category !== "Fare Slab Based" ? (
                                <span className="text-xs font-medium text-slate-400 italic">
                                  {rule.category === 'Domestic Flights' 
                                    ? 'India to India flights (Origin and Destination both in India)' 
                                    : rule.category === 'International Flights' 
                                    ? 'International flights (Outside India, or between India and other countries)' 
                                    : 'No specific criteria (Applies to all)'}
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-slate-400 italic">Based on Fare Slabs</span>
                              )}
                            </div>
                            
                            {/* Markup Value Section */}
                            <div className="pt-4 border-t border-slate-100 mt-auto">
                              <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Markup Value</h4>
                              {rule.category !== "Fare Slab Based" ? (
                                <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 inline-block">
                                  {rule.markupMethod === 'percentage' ? `${rule.markupValue}%` : `₹${rule.markupValue}`}
                                </span>
                              ) : (
                                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                  {rule.fareSlabs?.map((slab, sIdx) => (
                                    <div key={sIdx} className="text-xs flex items-center justify-between bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                                      <span className="text-slate-500 font-medium">₹{slab.from} - ₹{slab.to}</span>
                                      <span className="font-bold text-emerald-600">
                                        {slab.method === 'percentage' ? `${slab.value}%` : `₹${slab.value}`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-slate-400 italic">No rules defined.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-rose-50/50 border-b border-rose-100/50 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
                <FiTrash2 size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-800">Confirm Deletion</h3>
              <p className="text-sm text-slate-500 mt-1">
                {deleteModal.type === 'rule' 
                  ? "Are you sure you want to delete this specific rule? This action cannot be undone."
                  : `Are you sure you want to delete ALL ${deleteModal.productType} rules for this corporate? This action cannot be undone.`}
              </p>
            </div>
            
            <div className="p-6">
              {deleteModal.type === 'rule' && deleteModal.rule && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="mb-3 pb-3 border-b border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Category</p>
                    <p className="text-sm font-bold text-[#003399]">{deleteModal.rule.category}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Criteria Target</p>
                    {Object.keys(deleteModal.rule.criteria || {}).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(deleteModal.rule.criteria).map(([key, val]) => {
                          if (!val) return null;
                          return (
                            <span key={key} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-md">
                              <span className="text-slate-400 capitalize mr-1 font-medium">{key}:</span>{val}
                            </span>
                          );
                        })}
                      </div>
                    ) : deleteModal.rule.category !== "Fare Slab Based" ? (
                      <p className="text-xs text-slate-500 italic font-medium">Applies to all</p>
                    ) : (
                      <p className="text-xs text-slate-500 italic font-medium">Based on Fare Slabs</p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, markupDoc: null, idx: null, type: null, rule: null, productType: null })}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm shadow-rose-200"
                >
                  Delete {deleteModal.type === 'rule' ? 'Rule' : 'All Rules'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
