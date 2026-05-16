import React from "react";
import { FiFilter, FiSearch, FiCalendar, FiUser, FiRefreshCw, FiX } from "react-icons/fi";
import { C } from "./color";

const DashboardFilters = ({
  activeTab,
  onReset,
  filters = [],
  searchTerm,
  setSearchTerm,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 mb-6">
      <div className="p-6 flex flex-wrap items-end gap-5">
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
            {filters.map((f, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  {f.icon}
                  {f.label}
                </label>
                <div className="relative h-9">
                  {f.type === "text" ? (
                    <>
                      <FiSearch
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                      />
                      <input
                        type="text"
                        placeholder={f.placeholder}
                        value={f.value}
                        onChange={(e) => f.onChange(e.target.value)}
                        className="w-full h-full pl-9 pr-3 rounded border border-slate-200 text-xs outline-none focus:border-slate-400 bg-white transition-colors placeholder:text-slate-300"
                      />
                    </>
                  ) : f.type === "select" ? (
                    <div className="relative h-full">
                      <select
                        value={f.value}
                        onChange={(e) => f.onChange(e.target.value)}
                        className="w-full h-full px-3 rounded border border-slate-200 text-xs outline-none bg-white focus:border-slate-400 cursor-pointer text-slate-600 appearance-none pr-8"
                      >
                        {f.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                        <FiFilter size={10} />
                      </div>
                    </div>
                  ) : f.type === "date" ? (
                    <div className="relative h-full">
                      <input
                        type="date"
                        value={f.value}
                        onChange={(e) => f.onChange(e.target.value)}
                        className="w-full h-full px-3 rounded border border-slate-200 text-xs outline-none bg-white focus:border-slate-400 uppercase text-slate-500"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 h-9 rounded border border-slate-200 bg-white text-slate-500 text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
          >
            <FiX size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters;
