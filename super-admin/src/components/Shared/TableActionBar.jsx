import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiChevronLeft, FiChevronRight, FiDownload } from "react-icons/fi";

const defaultExportClassName =
  "inline-flex shrink-0 items-center gap-2 px-4 py-2.5 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-95";

const defaultArrowClassName =
  "w-10 h-10 shrink-0 rounded-xl border shadow-sm flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

export function FloatingHintButton({
  tooltip,
  className = "",
  ariaLabel,
  disabled = false,
  onClick,
  children,
}) {
  const buttonRef = useRef(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(null);

  const syncTooltipPosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const placeAbove = rect.top > 56;
    const edgeThreshold = 120;
    let align = "center";

    if (viewportWidth - rect.right < edgeThreshold) {
      align = "right";
    } else if (rect.left < edgeThreshold) {
      align = "left";
    }

    setTooltipPosition({
      top: placeAbove ? rect.top - 10 : rect.bottom + 10,
      left:
        align === "right"
          ? viewportWidth - rect.right
          : align === "left"
            ? rect.left
            : rect.left + rect.width / 2,
      placement: placeAbove ? "top" : "bottom",
      align,
    });
  };

  const showTooltip = () => {
    if (disabled) return;
    syncTooltipPosition();
    setIsTooltipVisible(true);
  };

  const hideTooltip = () => setIsTooltipVisible(false);

  useEffect(() => {
    if (!isTooltipVisible) return undefined;

    const handleViewportChange = () => syncTooltipPosition();

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isTooltipVisible]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={className}
        aria-label={ariaLabel}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </button>

      {isTooltipVisible &&
        tooltipPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg"
            style={{
              top: `${tooltipPosition.top}px`,
              left:
                tooltipPosition.align === "right"
                  ? undefined
                  : `${tooltipPosition.left}px`,
              right:
                tooltipPosition.align === "right"
                  ? `${tooltipPosition.left}px`
                  : undefined,
              transform:
                tooltipPosition.align === "center"
                  ? tooltipPosition.placement === "top"
                    ? "translate(-50%, -100%)"
                    : "translate(-50%, 0)"
                  : tooltipPosition.placement === "top"
                    ? "translateY(-100%)"
                    : "translateY(0)",
            }}
          >
            {tooltip}
          </div>,
          document.body,
        )}
    </>
  );
}

export default function TableActionBar({
  scrollRef,
  exportLabel = "Export",
  onExport,
  exportClassName = "",
  arrowClassName = "",
  containerClassName = "",
  children,
}) {
  const [scrollControls, setScrollControls] = useState({
    hasHorizontalOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
  });

  useEffect(() => {
    const scrollEl = scrollRef?.current;

    if (!scrollEl) {
      const resetId = window.requestAnimationFrame(() => {
        setScrollControls({
          hasHorizontalOverflow: false,
          canScrollLeft: false,
          canScrollRight: false,
        });
      });
      return () => window.cancelAnimationFrame(resetId);
    }

    const syncScrollControls = () => {
      const maxScrollLeft = Math.max(
        0,
        scrollEl.scrollWidth - scrollEl.clientWidth,
      );

      setScrollControls({
        hasHorizontalOverflow: maxScrollLeft > 4,
        canScrollLeft: scrollEl.scrollLeft > 4,
        canScrollRight: scrollEl.scrollLeft < maxScrollLeft - 4,
      });
    };

    let observedChild = scrollEl.firstElementChild;
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(syncScrollControls)
        : null;
    const mutationObserver =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => {
            if (resizeObserver && observedChild !== scrollEl.firstElementChild) {
              if (observedChild) {
                resizeObserver.unobserve(observedChild);
              }
              observedChild = scrollEl.firstElementChild;
              if (observedChild) {
                resizeObserver.observe(observedChild);
              }
            }
            syncScrollControls();
          })
        : null;

    syncScrollControls();
    resizeObserver?.observe(scrollEl);
    if (observedChild) {
      resizeObserver?.observe(observedChild);
    }
    mutationObserver?.observe(scrollEl, { childList: true, subtree: true });
    scrollEl.addEventListener("scroll", syncScrollControls, {
      passive: true,
    });
    window.addEventListener("resize", syncScrollControls);

    return () => {
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      scrollEl.removeEventListener("scroll", syncScrollControls);
      window.removeEventListener("resize", syncScrollControls);
    };
  }, [scrollRef]);

  const handleScroll = (direction) => {
    const scrollEl = scrollRef?.current;
    if (!scrollEl) return;

    scrollEl.scrollBy({
      left: direction === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  return (
    <div
      className={`flex flex-nowrap justify-end items-center gap-2 ${containerClassName}`}
    >
      <button
        type="button"
        onClick={onExport}
        className={`${defaultExportClassName} ${exportClassName}`}
      >
        <FiDownload size={16} />
        <span>{exportLabel}</span>
      </button>

      {children}

      {scrollControls.hasHorizontalOverflow && (
        <div className="flex shrink-0 items-center gap-2 self-center">
          <FloatingHintButton
            onClick={() => handleScroll("left")}
            disabled={!scrollControls.canScrollLeft}
            className={`${defaultArrowClassName} ${arrowClassName}`}
            ariaLabel="Scroll list left"
            tooltip="Scroll list left"
          >
              <FiChevronLeft size={18} />
          </FloatingHintButton>

          <FloatingHintButton
            onClick={() => handleScroll("right")}
            disabled={!scrollControls.canScrollRight}
            className={`${defaultArrowClassName} ${arrowClassName}`}
            ariaLabel="Scroll list right"
            tooltip="Scroll list right"
          >
              <FiChevronRight size={18} />
          </FloatingHintButton>
        </div>
      )}
    </div>
  );
}
