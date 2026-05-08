/**
 * ResponsiveDataTable — Corporate Manager
 * Standardized component for administrative data grids.
 */

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { FiChevronLeft, FiChevronRight, FiDownload } from "react-icons/fi";

const SCROLL_PX = 320;

function useScrollState(scrollRef) {
  const [state, setState] = useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
  });

  useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return;

    const sync = () => {
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      setState({
        hasOverflow: max > 4,
        canScrollLeft: el.scrollLeft > 4,
        canScrollRight: el.scrollLeft < max - 4,
      });
    };

    let observedChild = el.firstElementChild;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    const mo = typeof MutationObserver !== "undefined" ? new MutationObserver(() => {
      if (ro && observedChild !== el.firstElementChild) {
        if (observedChild) ro.unobserve(observedChild);
        observedChild = el.firstElementChild;
        if (observedChild) ro.observe(observedChild);
      }
      sync();
    }) : null;

    ro?.observe(el);
    if (observedChild) ro?.observe(observedChild);
    mo?.observe(el, { childList: true, subtree: true });
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();

    return () => {
      ro?.disconnect();
      mo?.disconnect();
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [scrollRef]);

  return state;
}

export function TableActionBar({
  scrollRef,
  title,
  subtitle,
  exportLabel = "Export",
  onExport,
  exportBgClass = "bg-[#0A4D68] hover:bg-[#083d52]",
  arrowBgClass = "bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600",
  children,
}) {
  const { hasOverflow, canScrollLeft, canScrollRight } = useScrollState(scrollRef);

  const scroll = (dir) => {
    const el = scrollRef?.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -SCROLL_PX : SCROLL_PX, behavior: "smooth" });
  };

  return (
    <div className="flex flex-nowrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-white">
      <div className="min-w-0">
        {title && (
          <p className="text-sm font-bold text-slate-800 truncate leading-tight">{title}</p>
        )}
        {subtitle && (
          <p className="text-[11px] text-slate-400 truncate leading-tight">{subtitle}</p>
        )}
      </div>

      <div className="flex flex-nowrap items-center gap-2 shrink-0">
        {children}

        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-white rounded-lg text-[11px] font-bold uppercase tracking-widest shadow transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${exportBgClass}`}
          >
            <FiDownload size={13} />
            <span>{exportLabel}</span>
          </button>
        )}

        {hasOverflow && (
          <div className="flex shrink-0 items-center gap-1.5 pl-2 border-l border-slate-100">
            <button
              type="button"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={`w-9 h-9 shrink-0 rounded-lg border flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${arrowBgClass}`}
            >
              <FiChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={`w-9 h-9 shrink-0 rounded-lg border flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${arrowBgClass}`}
            >
              <FiChevronRight size={17} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const ResponsiveDataTable = forwardRef(function ResponsiveDataTable(
  {
    title,
    subtitle,
    toolbarRight,
    exportLabel = "Export",
    onExport,
    exportBgClass = "bg-[#0A4D68] hover:bg-[#083d52]",
    arrowBgClass  = "bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600",
    tableMinWidth = "700px",
    wrapperClass  = "",
    showToolbar   = true,
    children,
    footer,
    pagination,
  },
  ref
) {
  const scrollRef = useRef(null);

  useImperativeHandle(ref, () => ({
    scrollLeft:       () => scrollRef.current?.scrollBy({ left: -SCROLL_PX, behavior: "smooth" }),
    scrollRight:      () => scrollRef.current?.scrollBy({ left:  SCROLL_PX, behavior: "smooth" }),
    getScrollElement: () => scrollRef.current,
  }));

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden w-full ${wrapperClass}`}>
      {showToolbar && (
        <TableActionBar
          scrollRef={scrollRef}
          title={title}
          subtitle={subtitle}
          onExport={onExport}
          exportLabel={exportLabel}
          exportBgClass={exportBgClass}
          arrowBgClass={arrowBgClass}
        >
          {toolbarRight}
        </TableActionBar>
      )}

      <div
        ref={scrollRef}
        className="w-full overflow-x-auto"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "thin",
          scrollbarColor: "#cbd5e1 transparent",
        }}
      >
        <div style={{ minWidth: tableMinWidth }}>
          {children}
        </div>
      </div>

      {footer && (
        <div className="border-t border-slate-100 bg-slate-50/60">
          {footer}
        </div>
      )}

      {pagination && (
        <div className="border-t border-slate-100">
          {pagination}
        </div>
      )}
    </div>
  );
});

export default ResponsiveDataTable;
