import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { GOLD, MUTED, BORDER, NAVY } from "./blogConstants";

/**
 * Pagination – numbered page controls with prev/next arrows.
 * @param {{ current: number, total: number, onChange: (page: number) => void }} props
 */
export default function Pagination({ current, total, onChange }) {
  const pages = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-2 pt-8">
      {/* Prev */}
      <button
        onClick={() => onChange(Math.max(1, current - 1))}
        disabled={current === 1}
        className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ border: `1px solid ${BORDER}`, background: "#fff", color: NAVY }}
        aria-label="Previous page"
      >
        <FiChevronLeft size={16} />
      </button>

      {/* Page numbers */}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all"
          style={{
            background: p === current ? GOLD : "#fff",
            color: p === current ? "#000" : MUTED,
            border: `1px solid ${p === current ? GOLD : BORDER}`,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
          aria-label={`Page ${p}`}
          aria-current={p === current ? "page" : undefined}
        >
          {p}
        </button>
      ))}

      {/* Next */}
      <button
        onClick={() => onChange(Math.min(total, current + 1))}
        disabled={current === total}
        className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ border: `1px solid ${BORDER}`, background: "#fff", color: NAVY }}
        aria-label="Next page"
      >
        <FiChevronRight size={16} />
      </button>
    </div>
  );
}
