import React from "react";
import { C } from "../../Shared/color";

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}) {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  const activeGoldenStyle = {
    background: `${C.gold}10`,
    borderColor: `${C.gold}40`,
    color: C.gold,
  };

  const defaultButtonStyle = {
    background: C.white,
    borderColor: C.border,
    color: C.muted,
  };

  return (
    <div className="px-4 py-3 border-t flex items-center justify-between gap-2" style={{ borderColor: C.border, background: C.offWhite }}>
      <span className="text-xs text-slate-400">
        Page <strong className="text-slate-600">{currentPage}</strong> of{" "}
        <strong className="text-slate-600">{totalPages}</strong>
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
          style={currentPage !== 1 ? activeGoldenStyle : defaultButtonStyle}
        >
          ← Prev
        </button>

        {pages.map((p) => {
          // Show first, last, current ±1, and ellipsis
          const show =
            p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
          const showEllipsisBefore = p === currentPage - 2 && p > 2;
          const showEllipsisAfter = p === currentPage + 2 && p < totalPages - 1;

          if (showEllipsisBefore || showEllipsisAfter) {
            return (
              <span key={p} className="px-1 text-slate-300 text-xs">
                …
              </span>
            );
          }
          if (!show) return null;

          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className="w-7 h-7 text-xs font-bold rounded-md transition-all border cursor-pointer select-none"
              style={p === currentPage ? {
                background: C.navy,
                borderColor: C.navy,
                color: C.white,
              } : defaultButtonStyle}
            >
              {p}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
          style={currentPage !== totalPages ? activeGoldenStyle : defaultButtonStyle}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
