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

  return (
    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
      <span className="text-xs text-slate-400">
        Page <strong className="text-slate-600">{currentPage}</strong> of{" "}
        <strong className="text-slate-600">{totalPages}</strong>
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
              className={`w-7 h-7 text-xs font-bold rounded-md transition-colors ${
                p === currentPage
                  ? "bg-[#0A4D68] text-white shadow-sm"
                  : "border border-slate-200 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
