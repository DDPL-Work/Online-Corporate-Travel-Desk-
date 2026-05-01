import React from "react";
import { RiArrowLeftLine } from "react-icons/ri";

const NoResultsFound = ({ 
  title = "No results found", 
  message = "We couldn't find any results matching your search. Try adjusting your dates or filters.", 
  onBack 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-2xl font-black text-[#000D26] mb-3">{title}</h3>
      <p className="text-slate-500 max-w-md text-center leading-relaxed mb-10 font-medium">
        {message}
      </p>

      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-8 py-3.5 bg-[#C9A84C] text-[#000D26] font-bold rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-amber-500/20"
        >
          <RiArrowLeftLine className="text-xl" />
          Modify Search
        </button>
      )}
    </div>
  );
};

export default NoResultsFound;
