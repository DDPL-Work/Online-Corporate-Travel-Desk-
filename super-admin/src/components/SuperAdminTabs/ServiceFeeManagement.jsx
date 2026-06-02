import React, { useMemo, useRef, useState } from "react";
import {
  FiDownload,
  FiEdit2,
  FiEye,
  FiInbox,
  FiPlusCircle,
  FiSearch,
  FiSliders,
  FiToggleLeft,
  FiToggleRight,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { FaHotel, FaPlane, FaRupeeSign } from "react-icons/fa";
import TableActionBar from "../Shared/TableActionBar";

const C = {
  navy: "#003399",
  navyDeep: "#000d26",
  offWhite: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
  muted: "#64748b",
  gold: "#d97706",
};

const initialRules = [
  {
    id: 1,
    ruleName: "Domestic Economy Flight Booking",
    productType: "Flight",
    operation: "Book",
    tripType: "Domestic",
    cabinClass: "Economy",
    starRating: "",
    roomCount: "",
    feeType: "Fixed",
    feeValue: 250,
    status: "Active",
    lastUpdated: "2026-05-28",
  },
  {
    id: 2,
    ruleName: "International Hotel Five Star",
    productType: "Hotel",
    operation: "Book",
    tripType: "International",
    cabinClass: "",
    starRating: "5 Star",
    roomCount: 2,
    feeType: "Percentage",
    feeValue: 5,
    status: "Active",
    lastUpdated: "2026-05-27",
  },
  {
    id: 3,
    ruleName: "Business Class Re-Issue",
    productType: "Flight",
    operation: "Re-Issue",
    tripType: "International",
    cabinClass: "Business",
    starRating: "",
    roomCount: "",
    feeType: "Fixed",
    feeValue: 900,
    status: "Inactive",
    lastUpdated: "2026-05-24",
  },
];

const emptyForm = {
  id: null,
  ruleName: "",
  productType: "Flight",
  operation: "Book",
  tripType: "Domestic",
  cabinClass: "Economy",
  starRating: "3 Star",
  roomCount: 1,
  feeType: "Fixed",
  feeValue: "",
  status: "Active",
};

const flightOperations = ["Book", "Cancel", "Re-Issue"];
const hotelOperations = ["Book", "Cancel"];
const cabinClasses = ["Economy", "Premium Economy", "Business", "Premium Business", "First Class"];
const starRatings = ["1 Star", "2 Star", "3 Star", "4 Star", "5 Star"];

export default function ServiceFeeManagement() {
  const tableScrollRef = useRef(null);
  const [rules, setRules] = useState(initialRules);
  const [filters, setFilters] = useState({
    productType: "All",
    operation: "All",
    tripType: "All",
    status: "All",
    search: "",
  });
  const [openForm, setOpenForm] = useState(false);
  const [viewRule, setViewRule] = useState(null);
  const [deleteRule, setDeleteRule] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const operations = filters.productType === "Hotel" ? hotelOperations : filters.productType === "Flight" ? flightOperations : [...new Set([...flightOperations, ...hotelOperations])];

  const filteredRules = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return rules.filter((rule) => {
      const productMatch = filters.productType === "All" || rule.productType === filters.productType;
      const operationMatch = filters.operation === "All" || rule.operation === filters.operation;
      const tripMatch = filters.tripType === "All" || rule.tripType === filters.tripType;
      const statusMatch = filters.status === "All" || rule.status === filters.status;
      const searchMatch =
        !q ||
        rule.ruleName.toLowerCase().includes(q) ||
        rule.productType.toLowerCase().includes(q) ||
        rule.operation.toLowerCase().includes(q) ||
        rule.tripType.toLowerCase().includes(q);
      return productMatch && operationMatch && tripMatch && statusMatch && searchMatch;
    });
  }, [filters, rules]);

  const stats = useMemo(() => ({
    total: rules.length,
    active: rules.filter((rule) => rule.status === "Active").length,
    flights: rules.filter((rule) => rule.productType === "Flight").length,
    hotels: rules.filter((rule) => rule.productType === "Hotel").length,
  }), [rules]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "productType" ? { operation: "All" } : {}),
    }));
  };

  const resetFilters = () => {
    setFilters({ productType: "All", operation: "All", tripType: "All", status: "All", search: "" });
  };

  const openCreate = () => {
    setForm(emptyForm);
    setOpenForm(true);
  };

  const openEdit = (rule) => {
    setForm({
      ...emptyForm,
      ...rule,
      feeValue: String(rule.feeValue),
      roomCount: rule.roomCount || 1,
    });
    setOpenForm(true);
  };

  const setProductType = (productType) => {
    setForm((prev) => ({
      ...prev,
      productType,
      operation: "Book",
      cabinClass: productType === "Flight" ? prev.cabinClass || "Economy" : "",
      starRating: productType === "Hotel" ? prev.starRating || "3 Star" : "",
      roomCount: productType === "Hotel" ? prev.roomCount || 1 : "",
    }));
  };

  const saveRule = (event) => {
    event.preventDefault();

    const isDuplicate = rules.some(r => 
      r.id !== form.id &&
      r.productType === form.productType &&
      r.operation === form.operation &&
      r.tripType === form.tripType &&
      (form.productType === "Flight" 
        ? r.cabinClass === form.cabinClass 
        : (r.starRating === form.starRating && r.roomCount === Number(form.roomCount || 1)))
    );

    if (isDuplicate) {
      alert("A rule for this scenario already exists. Please edit the existing rule instead.");
      return;
    }

    setLoading(true);

    const nextRule = {
      ...form,
      ruleName: form.ruleName.trim() || buildRuleName(form),
      feeValue: Number(form.feeValue || 0),
      roomCount: form.productType === "Hotel" ? Number(form.roomCount || 1) : "",
      lastUpdated: new Date().toISOString().slice(0, 10),
    };

    window.setTimeout(() => {
      setRules((prev) => (
        nextRule.id
          ? prev.map((rule) => (rule.id === nextRule.id ? nextRule : rule))
          : [{ ...nextRule, id: Date.now() }, ...prev]
      ));
      setLoading(false);
      setOpenForm(false);
    }, 250);
  };

  const toggleRule = (id) => {
    setRules((prev) => prev.map((rule) => (
      rule.id === id
        ? { ...rule, status: rule.status === "Active" ? "Inactive" : "Active", lastUpdated: new Date().toISOString().slice(0, 10) }
        : rule
    )));
  };

  const confirmDelete = () => {
    setRules((prev) => prev.filter((rule) => rule.id !== deleteRule.id));
    setDeleteRule(null);
  };

  const exportRules = () => {
    const headers = ["Rule Name", "Product Type", "Operation", "Trip Type", "Cabin / Star Rating", "Room Count", "Fee Type", "Fee Value", "Status", "Last Updated"];
    const rows = filteredRules.map((rule) => [
      rule.ruleName,
      rule.productType,
      rule.operation,
      rule.tripType,
      getConditionLabel(rule),
      rule.roomCount || "",
      rule.feeType,
      formatFee(rule),
      rule.status,
      rule.lastUpdated,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "service_fee_rules.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
              <FiSliders size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight leading-none">Service Fee Management</h1>
              <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                Configure and manage service fee rules for Flights and Hotels.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={exportRules}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
            >
              <FiDownload size={16} />
              Export Rules
            </button>
            <button
              onClick={openCreate}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-[#003399] rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm hover:bg-slate-50"
            >
              <FiPlusCircle size={16} />
              Create Rule
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard label="Total Rules" value={stats.total} trend="+3 this month" icon={<FiSliders size={21} />} borderCls="border-[#000D26]" iconBgCls="bg-slate-100" iconColorCls="text-[#000D26]" />
          <StatCard label="Active Rules" value={stats.active} trend={`${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% enabled`} icon={<FiToggleRight size={21} />} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
          <StatCard label="Flight Rules" value={stats.flights} trend="Air products" icon={<FaPlane size={21} />} borderCls="border-[#003399]" iconBgCls="bg-indigo-50" iconColorCls="text-[#003399]" />
          <StatCard label="Hotel Rules" value={stats.hotels} trend="Stay products" icon={<FaHotel size={21} />} borderCls="border-[#d97706]" iconBgCls="bg-amber-50" iconColorCls="text-[#d97706]" />
        </div>

        <div className="bg-white rounded-2xl p-5 border shadow-sm" style={{ borderColor: C.border }}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
            <FilterSelect label="Product Type" value={filters.productType} onChange={(value) => updateFilter("productType", value)} options={["All", "Flight", "Hotel"]} className="xl:col-span-2" />
            <FilterSelect label="Operation Type" value={filters.operation} onChange={(value) => updateFilter("operation", value)} options={["All", ...operations]} className="xl:col-span-2" />
            <FilterSelect label="Trip Type" value={filters.tripType} onChange={(value) => updateFilter("tripType", value)} options={["All", "Domestic", "International"]} className="xl:col-span-2" />
            <FilterSelect label="Status" value={filters.status} onChange={(value) => updateFilter("status", value)} options={["All", "Active", "Inactive"]} className="xl:col-span-2" />
            <div className="flex flex-col gap-1 xl:col-span-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <FiSearch size={12} /> Search
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search service fee rules..."
                  value={filters.search}
                  onChange={(event) => updateFilter("search", event.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 focus:border-[#003399]"
                />
              </div>
            </div>
            <div className="xl:col-span-1 flex items-end gap-2">
              <button
                onClick={resetFilters}
                title="Reset Filters"
                aria-label="Reset Filters"
                className="w-full h-[38px] rounded-lg font-black text-[13px] flex items-center justify-center border shadow-sm transition-all hover:bg-slate-100 hover:text-slate-700 bg-white text-slate-500 border-slate-200"
              >
                <FiX />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: C.border }}>
          <div className="p-5 border-b flex flex-wrap items-center justify-between gap-3" style={{ borderColor: C.border }}>
            <div>
              <h2 className="font-black text-slate-800 tracking-tight text-lg">Service Fee Rule List</h2>
              <p className="text-[11px] font-bold uppercase tracking-widest mt-1" style={{ color: C.muted }}>
                {filteredRules.length} rule{filteredRules.length !== 1 ? "s" : ""} found
              </p>
            </div>
            <TableActionBar
              scrollRef={tableScrollRef}
              exportLabel="Export CSV"
              onExport={exportRules}
              exportClassName="bg-[#003399] hover:bg-[#002266] text-white shadow-sm rounded-lg text-xs font-bold px-4 py-2"
              arrowClassName="border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
            />
          </div>

          <div ref={tableScrollRef} className="overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
                  {["Rule Name", "Product Type", "Operation", "Trip Type", "Cabin / Star Rating", "Room Count", "Fee Type", "Fee Value", "Status", "Last Updated", "Actions"].map((head) => (
                    <th key={head} className="px-5 py-5 text-[10px] uppercase font-black tracking-widest whitespace-nowrap">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRules.length === 0 ? (
                  <EmptyTable onCreate={openCreate} colSpan={11} />
                ) : (
                  filteredRules.map((rule) => (
                    <tr key={rule.id} className="transition-colors border-b last:border-0 hover:bg-slate-50/80" style={{ borderColor: C.border }}>
                      <td className="px-5 py-5 min-w-56">
                        <p className="text-xs font-black text-[#003399]">{rule.ruleName}</p>
                      </td>
                      <td className="px-5 py-5"><ProductPill type={rule.productType} /></td>
                      <td className="px-5 py-5 text-xs font-bold text-slate-600">{rule.operation}</td>
                      <td className="px-5 py-5 text-xs font-bold text-slate-600">{rule.tripType}</td>
                      <td className="px-5 py-5 text-xs font-bold text-slate-600">{getConditionLabel(rule)}</td>
                      <td className="px-5 py-5 text-xs font-bold text-slate-500">{rule.roomCount ? `${rule.roomCount} Rooms` : "-------"}</td>
                      <td className="px-5 py-5 text-xs font-bold text-slate-600">{rule.feeType}</td>
                      <td className="px-5 py-5 text-xs font-black text-slate-800">{formatFee(rule)}</td>
                      <td className="px-5 py-5"><StatusBadge status={rule.status} /></td>
                      <td className="px-5 py-5 text-xs font-bold text-slate-500">{rule.lastUpdated}</td>
                      <td className="px-5 py-5">
                        <RowActions rule={rule} onView={setViewRule} onEdit={openEdit} onToggle={toggleRule} onDelete={setDeleteRule} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-slate-100">
            {filteredRules.length === 0 ? (
              <div className="px-6 py-16"><EmptyState onCreate={openCreate} /></div>
            ) : (
              filteredRules.map((rule) => (
                <div key={rule.id} className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[#003399]">{rule.ruleName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{rule.operation} / {rule.tripType}</p>
                    </div>
                    <StatusBadge status={rule.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-600">
                    <InfoCell label="Product" value={rule.productType} />
                    <InfoCell label="Condition" value={getConditionLabel(rule)} />
                    <InfoCell label="Fee" value={formatFee(rule)} />
                    <InfoCell label="Updated" value={rule.lastUpdated} />
                  </div>
                  <RowActions rule={rule} onView={setViewRule} onEdit={openEdit} onToggle={toggleRule} onDelete={setDeleteRule} />
                </div>
              ))
            )}
          </div>

          <div className="bg-slate-50 px-6 py-3 border-t flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ borderColor: C.border }}>
            <span>Showing {filteredRules.length} rule(s)</span>
            <span>Active: {stats.active} | Inactive: {stats.total - stats.active}</span>
          </div>
        </div>
      </div>

      {openForm && (
        <RuleFormModal
          form={form}
          loading={loading}
          onClose={() => setOpenForm(false)}
          onSubmit={saveRule}
          onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))}
          onProductTypeChange={setProductType}
        />
      )}

      {viewRule && (
        <DetailsModal rule={viewRule} onClose={() => setViewRule(null)} />
      )}

      {deleteRule && (
        <ConfirmDeleteModal rule={deleteRule} onCancel={() => setDeleteRule(null)} onConfirm={confirmDelete} />
      )}
    </div>
  );
}

function StatCard({ label, value, trend, icon, borderCls, iconBgCls, iconColorCls }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border-b-4 ${borderCls} shadow-sm flex items-center justify-between transition-all hover:-translate-y-0.5 hover:shadow-md`}>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-2xl font-black text-slate-800 leading-none">{value}</h3>
        <p className="text-[10px] font-bold text-slate-400 mt-2">{trend}</p>
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ml-3 ${iconBgCls} ${iconColorCls}`}>
        {icon}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, className = "" }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#003399]"
      >
        {options.map((option) => <option key={option} value={option}>{option === "All" ? `All ${label.replace(" Type", "s")}` : option}</option>)}
      </select>
    </div>
  );
}

function RowActions({ rule, onView, onEdit, onToggle, onDelete }) {
  return (
    <div className="flex gap-2 items-center md:justify-center">
      <IconButton title="View" onClick={() => onView(rule)} className="hover:bg-slate-100 text-slate-600"><FiEye size={16} /></IconButton>
      <IconButton title="Edit" onClick={() => onEdit(rule)} className="hover:bg-blue-100 text-blue-600"><FiEdit2 size={16} /></IconButton>
      <IconButton title={rule.status === "Active" ? "Disable" : "Enable"} onClick={() => onToggle(rule.id)} className={rule.status === "Active" ? "hover:bg-rose-100 text-rose-600" : "hover:bg-emerald-100 text-emerald-600"}>
        {rule.status === "Active" ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
      </IconButton>
      <IconButton title="Delete" onClick={() => onDelete(rule)} className="hover:bg-rose-100 text-rose-600"><FiTrash2 size={16} /></IconButton>
    </div>
  );
}

function IconButton({ title, onClick, className, children }) {
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      className={`p-2 rounded transition-colors cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}

function RuleFormModal({ form, loading, onClose, onSubmit, onChange, onProductTypeChange }) {
  const isFlight = form.productType === "Flight";
  const operations = isFlight ? flightOperations : hotelOperations;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <form
        onSubmit={onSubmit}
        className="h-full w-full lg:w-[700px] bg-white shadow-2xl flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 py-5 bg-gradient-to-r from-[#003399] to-[#000d26] text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">{form.id ? "Update Rule" : "Create Rule"}</h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 mt-1">Service fee configuration</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors" aria-label="Close">
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 p-5">
            <div className="xl:col-span-3 space-y-5">
              <Panel title="Rule Information">
                <LabeledInput label="Rule Name">
                  <input value={form.ruleName} onChange={(event) => onChange("ruleName", event.target.value)} placeholder={buildRuleName(form)} className="field-input" />
                </LabeledInput>
                <div className="grid grid-cols-2 gap-3">
                  {["Flight", "Hotel"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onProductTypeChange(type)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${form.productType === type ? "border-[#003399] bg-[#003399]/5 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"}`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${form.productType === type ? "bg-[#003399] text-white" : "bg-slate-100 text-slate-500"}`}>
                        {type === "Flight" ? <FaPlane size={14} /> : <FaHotel size={14} />}
                      </div>
                      <span className="block text-xs font-black uppercase tracking-widest text-slate-700">{type}</span>
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel title="Operation Configuration">
                <SegmentedControl options={operations} value={form.operation} onChange={(value) => onChange("operation", value)} />
              </Panel>

              <Panel title="Trip Type">
                <SegmentedControl options={["Domestic", "International"]} value={form.tripType} onChange={(value) => onChange("tripType", value)} />
              </Panel>

              <Panel title="Conditional Configuration">
                {isFlight ? (
                  <LabeledInput label="Cabin Class">
                    <select value={form.cabinClass} onChange={(event) => onChange("cabinClass", event.target.value)} className="field-input">
                      {cabinClasses.map((cabin) => <option key={cabin} value={cabin}>{cabin}</option>)}
                    </select>
                  </LabeledInput>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <LabeledInput label="Hotel Star Rating">
                      <select value={form.starRating} onChange={(event) => onChange("starRating", event.target.value)} className="field-input">
                        {starRatings.map((rating) => <option key={rating} value={rating}>{rating}</option>)}
                      </select>
                    </LabeledInput>
                    <LabeledInput label="Room Count">
                      <input type="number" min="1" value={form.roomCount} onChange={(event) => onChange("roomCount", event.target.value)} className="field-input" />
                    </LabeledInput>
                  </div>
                )}
              </Panel>

              <Panel title="Fee Configuration">
                <SegmentedControl options={["Fixed", "Percentage"]} value={form.feeType} onChange={(value) => onChange("feeType", value)} />
                <LabeledInput label={form.feeType === "Fixed" ? "Fixed Amount" : "Percentage"}>
                  <div className="relative">
                    {form.feeType === "Fixed" ? <FaRupeeSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[#003399]" size={12} /> : <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#003399] font-black text-xs">%</span>}
                    <input required type="number" min="0" value={form.feeValue} onChange={(event) => onChange("feeValue", event.target.value)} placeholder={form.feeType === "Fixed" ? "250" : "5"} className="field-input pl-9" />
                  </div>
                </LabeledInput>
              </Panel>

              <Panel title="Status">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Status</label>
                    <button type="button" onClick={() => onChange("status", form.status === "Active" ? "Inactive" : "Active")} className={`w-full px-4 py-3 rounded-xl border font-black text-xs uppercase tracking-widest flex items-center justify-between ${form.status === "Active" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                      {form.status}
                      {form.status === "Active" ? <FiToggleRight size={22} /> : <FiToggleLeft size={22} />}
                    </button>
                  </div>
                </div>
              </Panel>
            </div>

            <div className="xl:col-span-2">
              <PreviewCard form={form} />
            </div>
          </div>
        </div>

        <style>{`
          .field-input {
            width: 100%;
            border: 1px solid #e2e8f0;
            border-radius: 0.75rem;
            background: #f8fafc;
            padding: 0.625rem 0.875rem;
            font-size: 0.875rem;
            font-weight: 700;
            color: #1e293b;
            outline: none;
          }
          .field-input:focus {
            border-color: #003399;
            box-shadow: 0 0 0 3px rgba(0, 51, 153, 0.08);
            background: white;
          }
        `}</style>

        <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-200 text-slate-500 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-[#003399] to-[#000d26] text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg disabled:opacity-60">
            {loading ? "Saving..." : "Save Rule"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-4">
      <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-[#003399]">{title}</h3>
      {children}
    </section>
  );
}

function LabeledInput({ label, children }) {
  return (
    <div>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{label}</label>
      {children}
    </div>
  );
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`px-3 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${value === option ? "bg-[#003399] border-[#003399] text-white shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function PreviewCard({ form }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm sticky top-5">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Rule Summary</p>
      <div className="space-y-3">
        <ProductPill type={form.productType} />
        <h3 className="text-lg font-black text-slate-800 leading-tight">{form.ruleName || buildRuleName(form)}</h3>
        <div className="grid grid-cols-2 gap-3">
          <InfoCell label="Operation" value={form.operation} />
          <InfoCell label="Trip Type" value={form.tripType} />
          <InfoCell label={form.productType === "Flight" ? "Cabin" : "Star Rating"} value={form.productType === "Flight" ? form.cabinClass : form.starRating} />
        </div>
        <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fee</p>
          <p className="text-2xl font-black text-[#003399] mt-1">{form.feeType === "Fixed" ? `Rs. ${Number(form.feeValue || 0).toLocaleString()}` : `${Number(form.feeValue || 0)}%`}</p>
        </div>
      </div>
    </div>
  );
}

function DetailsModal({ rule, onClose }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <div className="px-6 py-5 bg-gradient-to-r from-[#003399] to-[#000d26] text-white flex items-center justify-between">
          <h2 className="text-lg font-black uppercase tracking-tight">Rule Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full" aria-label="Close"><FiX /></button>
        </div>
        <div className="p-6 space-y-4">
          <PreviewCard form={rule} />
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ rule, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(event) => event.stopPropagation()}>
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4"><FiTrash2 size={22} /></div>
        <h2 className="text-xl font-black text-slate-800">Delete Service Fee Rule?</h2>
        <p className="text-sm font-medium text-slate-500 mt-2">This action cannot be undone. The rule "{rule.ruleName}" will be removed.</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="px-5 py-2.5 border border-slate-200 text-slate-500 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-rose-700">Delete</button>
        </div>
      </div>
    </div>
  );
}

function EmptyTable({ onCreate, colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-20 text-center">
        <EmptyState onCreate={onCreate} />
      </td>
    </tr>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
        <FiInbox size={32} />
      </div>
      <p className="text-sm font-bold text-slate-400">No service fee rules configured yet.</p>
      <button onClick={onCreate} className="px-4 py-2 bg-[#003399] text-white rounded-lg text-xs font-black uppercase tracking-widest">Create First Rule</button>
    </div>
  );
}

function ProductPill({ type }) {
  const isFlight = type === "Flight";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded shadow-sm border ${isFlight ? "bg-[#003399]/10 text-[#003399] border-[#003399]/20" : "bg-[#d97706]/10 text-[#d97706] border-[#d97706]/20"}`}>
      {isFlight ? <FaPlane size={11} /> : <FaHotel size={11} />}
      {type}
    </span>
  );
}

function StatusBadge({ status }) {
  const isActive = status === "Active";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
      {status}
    </span>
  );
}

function InfoCell({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-xs font-black text-slate-700 mt-1">{value || "-------"}</p>
    </div>
  );
}

function getConditionLabel(rule) {
  return rule.productType === "Flight" ? rule.cabinClass : rule.starRating;
}

function formatFee(rule) {
  return rule.feeType === "Fixed" ? `Rs. ${Number(rule.feeValue || 0).toLocaleString()}` : `${Number(rule.feeValue || 0)}%`;
}

function buildRuleName(rule) {
  const condition = rule.productType === "Flight" ? rule.cabinClass : rule.starRating;
  return `${rule.tripType} ${condition} ${rule.productType} ${rule.operation}`.trim();
}
