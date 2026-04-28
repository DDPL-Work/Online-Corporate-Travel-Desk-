import React, { useState, useRef, useEffect } from "react";
import { FaGlobe, FaChevronDown, FaSearch } from "react-icons/fa";

const GOLD = "#C9A240";

/* ─── Shared Country Selector ─── */
export const CountrySelector = ({ value, onChange, countries, label = "Country", disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = countries.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.code?.toLowerCase().includes(search.toLowerCase()),
  );

  const selected = countries.find((c) => c.code === value);

  return (
    <div className="relative" ref={ref}>
      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
        <FaGlobe style={{ color: GOLD, fontSize: 11 }} /> {label}
      </label>
      <button
        type="button"
        onMouseDown={(e) => disabled && e.preventDefault()}
        onClick={() => !disabled && setOpen(!open)}
        className={`w-full flex items-center justify-between border-2 rounded-xl px-3 py-3 bg-white transition-all text-left
          ${disabled ? "bg-gray-50 border-gray-100 cursor-default" : "hover:border-[#C9A240] cursor-pointer"}
          ${open ? "border-[#C9A240] shadow-sm" : value ? "border-[#C9A240]" : "border-gray-200"}`}
      >
        <div className={`flex items-center gap-2 min-w-0 ${disabled ? "opacity-60" : ""}`}>
          {selected ? (
            <>
              <span className="text-lg leading-none">{selected.flag}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {selected.name}
                </p>
              </div>
            </>
          ) : (
            <>
              <FaGlobe className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-400 font-medium">Select</span>
            </>
          )}
        </div>
        {!disabled && (
          <FaChevronDown
            className={`text-gray-400 text-xs shrink-0 ml-1 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && !disabled && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-white sticky top-0">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <FaSearch className="text-gray-400 text-xs" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="text-xs font-medium text-gray-700 outline-none bg-transparent w-full placeholder-gray-400"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto custom-scrollbar">
            {value && (
              <div
                onMouseDown={() => {
                  onChange("");
                  setOpen(false);
                  setSearch("");
                }}
                className="flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 cursor-pointer border-b border-gray-100"
              >
                <span className="text-xs text-red-500 font-semibold">
                  ✕ Clear selection
                </span>
              </div>
            )}
            {filtered.map((country) => (
              <div
                key={country.code}
                onMouseDown={() => {
                  onChange(country.code);
                  setOpen(false);
                  setSearch("");
                }}
                className={`flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer transition group border-b border-gray-50 last:border-0
                  ${value === country.code ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <p
                    className={`text-sm font-semibold group-hover:text-blue-700 ${value === country.code ? "text-blue-700" : "text-gray-800"}`}
                  >
                    {country.name}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-lg ${value === country.code ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-500"}`}
                >
                  {country.code}
                </span>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">
                No countries found
              </p>
            )}
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  );
};

/* ─── Generic Searchable Select ─── */
export const SearchableSelect = ({ 
  label, 
  icon, 
  value, 
  options = [], 
  onChange, 
  placeholder = "Select", 
  displayKey = "Name", 
  valueKey = "Code",
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((item) => 
    String(item[displayKey] || "").toLowerCase().includes(search.toLowerCase())
  );
  
  const selected = options.find((opt) => opt[valueKey] === value);

  return (
    <div ref={ref} className="relative w-full">
      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 px-1">
        <span className="text-blue-600">{icon}</span> {label}
      </label>
      <button
        type="button"
        onMouseDown={(e) => disabled && e.preventDefault()}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full flex items-center justify-between border-2 rounded-xl px-3 py-3 bg-white transition-all text-left
          ${disabled ? "bg-gray-50 border-gray-100 cursor-default" : "hover:border-blue-400 cursor-pointer"}
          ${open ? "border-blue-600 shadow-sm" : value ? "border-blue-300" : "border-gray-200"}`}
      >
        <div className={`flex flex-col min-w-0 ${disabled ? "opacity-60" : ""}`}>
          <span className={`text-sm font-bold truncate ${selected ? "text-gray-800" : "text-gray-400"}`}>
            {selected?.[displayKey] || placeholder}
          </span>
        </div>
        {!disabled && <FaChevronDown className={`w-3 h-3 text-gray-400 shrink-0 ml-1 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>

      {open && !disabled && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white">
              <FaSearch className="text-gray-400 text-xs" />
              <input
                autoFocus
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs font-medium text-gray-700 outline-none bg-transparent"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <div
                  key={item[valueKey]}
                  onClick={() => { onChange(item); setOpen(false); setSearch(""); }}
                  className="px-4 py-3 text-sm cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-colors group"
                >
                  <span className={`font-semibold group-hover:text-blue-700 ${value === item[valueKey] ? "text-blue-700" : "text-gray-700"}`}>
                    {item[displayKey]}
                  </span>
                  {value === item[valueKey] && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-xs text-gray-400 text-center uppercase tracking-widest font-bold">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
