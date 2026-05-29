import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { FiChevronLeft, FiChevronRight, FiDownload } from "react-icons/fi";
import { C } from "../../Shared/color";
import { exportToCSV } from "../../../utils/exportToCSV";

// ─── Scroll step per button click (px) ────────────────────────────────────────
const SCROLL_PX = 320;

// ─── useScrollState — watches a scroll container for overflow / position ───────
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

    // ResizeObserver on container + first child (table)
    let observedChild = el.firstElementChild;
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(sync)
        : null;
    const mo =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => {
            if (ro && observedChild !== el.firstElementChild) {
              if (observedChild) ro.unobserve(observedChild);
              observedChild = el.firstElementChild;
              if (observedChild) ro.observe(observedChild);
            }
            sync();
          })
        : null;

    ro?.observe(el);
    if (observedChild) ro?.observe(observedChild);
    mo?.observe(el, { childList: true, subtree: true });
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync(); // immediate

    return () => {
      ro?.disconnect();
      mo?.disconnect();
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [scrollRef]);

  return state;
}

// ─── TableActionBar — toolbar right-side with export + scroll buttons ──────────
export function TableActionBar({
  scrollRef,
  title,
  subtitle,
  exportLabel = "Export CSV",
  onExport,
  exportConfig,
  exportBgClass = "",
  arrowBgClass = "",
  exportLoading = false,
  exportDisabled = false,
  children,
}) {
  const { hasOverflow, canScrollLeft, canScrollRight } = useScrollState(scrollRef);
  const [isInternalExporting, setIsInternalExporting] = useState(false);

  const isExporting = exportLoading || isInternalExporting;

  const handleExport = async () => {
    if (onExport) {
      onExport();
      return;
    }
    if (exportConfig) {
      setIsInternalExporting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 50)); // small delay to show spinner/loading state if needed
        exportToCSV(exportConfig);
      } catch (err) {
        console.error("Export failed:", err);
      } finally {
        setIsInternalExporting(false);
      }
    }
  };

  const scroll = (dir) => {
    const el = scrollRef?.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -SCROLL_PX : SCROLL_PX, behavior: "smooth" });
  };

  const defaultExportBg = { background: C.navy, color: C.white };
  const defaultArrowBg = { background: C.offWhite, borderColor: C.border, color: C.muted };
  const activeArrowBg = { background: `${C.gold}10`, borderColor: `${C.gold}40`, color: C.gold };

  return (
    <div className="flex flex-nowrap items-center justify-between gap-3 px-4 py-3 bg-white">
      {/* LEFT: title */}
      <div className="min-w-0">
        {title && (
          <p className="text-sm font-bold truncate leading-tight" style={{ color: C.navy }}>{title}</p>
        )}
        {subtitle && (
          <p className="text-[11px] truncate leading-tight" style={{ color: C.muted }}>{subtitle}</p>
        )}
      </div>

      {/* RIGHT: extra slot + export + scroll buttons */}
      <div className="flex flex-nowrap items-center gap-2 shrink-0">
        {children}

        {/* Export button */}
        {(onExport || exportConfig) && (
          <button
            type="button"
            onClick={handleExport}
            disabled={exportDisabled || isExporting}
            className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest shadow transition-all cursor-pointer hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-wait ${exportBgClass}`}
            style={!exportBgClass ? defaultExportBg : {}}
          >
            {isExporting ? (
               <span className="w-3.5 h-3.5 border-2 border-[currentColor] border-t-transparent rounded-full animate-spin"></span>
            ) : (
               <FiDownload size={13} className={isExporting ? "animate-bounce" : ""} />
            )}
            <span>{isExporting ? "Exporting..." : exportLabel}</span>
          </button>
        )}

        {/* Scroll nav — only when overflow exists */}
        {hasOverflow && (
          <div className="flex shrink-0 items-center gap-1.5 pl-2 border-l" style={{ borderColor: C.border }}>
            <button
              type="button"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              aria-label="Scroll table left"
              className={`w-9 h-9 shrink-0 rounded-lg border flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${arrowBgClass}`}
              style={!arrowBgClass ? (canScrollLeft ? activeArrowBg : defaultArrowBg) : {}}
            >
              <FiChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              aria-label="Scroll table right"
              className={`w-9 h-9 shrink-0 rounded-lg border flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${arrowBgClass}`}
              style={!arrowBgClass ? (canScrollRight ? activeArrowBg : defaultArrowBg) : {}}
            >
              <FiChevronRight size={17} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ResponsiveDataTable ───────────────────────────────────────────────────────
const ResponsiveDataTable = forwardRef(function ResponsiveDataTable(
  {
    title,
    subtitle,
    toolbarRight,
    exportLabel = "Export CSV",
    onExport,
    exportConfig,
    exportBgClass = "",
    arrowBgClass  = "",
    exportLoading = false,
    exportDisabled = false,
    tableMinWidth = "700px",
    wrapperClass  = "",
    showToolbar   = true,
    children,
    footer,
    pagination,
  },
  ref
) {
  // This ref goes directly onto the overflow-x-auto div (same pattern as super-admin)
  const scrollRef = useRef(null);

  useImperativeHandle(ref, () => ({
    scrollLeft:       () => scrollRef.current?.scrollBy({ left: -SCROLL_PX, behavior: "smooth" }),
    scrollRight:      () => scrollRef.current?.scrollBy({ left:  SCROLL_PX, behavior: "smooth" }),
    getScrollElement: () => scrollRef.current,
  }));

  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden w-full ${wrapperClass}`} style={{ borderColor: C.border }}>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      {showToolbar && (
        <TableActionBar
          scrollRef={scrollRef}
          title={title}
          subtitle={subtitle}
          onExport={onExport}
          exportConfig={exportConfig}
          exportLabel={exportLabel}
          exportBgClass={exportBgClass}
          arrowBgClass={arrowBgClass}
          exportLoading={exportLoading}
          exportDisabled={exportDisabled}
        >
          {toolbarRight}
        </TableActionBar>
      )}

      {/* ── Scroll container ───────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="w-full overflow-x-auto"
        role="region"
        aria-label={title ? `${title} data table` : "Data table"}
        tabIndex={0}
        style={{
          WebkitOverflowScrolling: "touch",  // momentum scrolling on iOS
          scrollbarWidth: "thin",
          scrollbarColor: `${C.border} transparent`,
        }}
      >
        {/* Inner wrapper — enforces minimum width so columns don't squish */}
        <div style={{ minWidth: tableMinWidth }}>
          {children}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      {footer && (
        <div style={{ background: `${C.offWhite}80` }}>
          {footer}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {pagination && (
        <div>
          {pagination}
        </div>
      )}
    </div>
  );
});

export default ResponsiveDataTable;
