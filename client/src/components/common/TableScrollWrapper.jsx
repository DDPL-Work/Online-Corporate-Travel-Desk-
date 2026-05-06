import React, { useRef, useState, useEffect } from 'react';
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";

/**
 * 🔄 TableScrollWrapper
 * A premium reusable wrapper that adds floating horizontal scroll buttons (Carousel style)
 * for tables. Buttons appear on the sides of the table for easy navigation.
 */
const TableScrollWrapper = ({ children }) => {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      // Use a small buffer (2px) to avoid sub-pixel rounding issues
      setShowLeft(scrollLeft > 5);
      setShowRight(scrollWidth > clientWidth + 5 && scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    const ref = scrollRef.current;
    if (!ref) return;

    // Monitor both scroll and size changes
    const observer = new ResizeObserver(() => {
      checkScroll();
    });

    ref.addEventListener('scroll', checkScroll);
    observer.observe(ref);
    
    // Also observe the first child (usually the table) for content changes
    if (ref.firstChild) {
      observer.observe(ref.firstChild);
    }

    // Initial check
    checkScroll();

    return () => {
      ref.removeEventListener('scroll', checkScroll);
      observer.disconnect();
    };
  }, [children]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = Math.min(scrollRef.current.clientWidth * 0.8, 400);
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="w-full relative group/scroll">
      {/* Scrollable Container */}
      <div 
        ref={scrollRef} 
        className="overflow-x-auto custom-scrollbar scroll-smooth relative"
      >
        {children}
      </div>

      {/* Floating Left Button */}
      {showLeft && (
        <div className="absolute left-0 top-0 bottom-0 flex items-center z-20 pointer-events-none pr-16 bg-gradient-to-r from-white via-white/80 to-transparent transition-all duration-300">
          <button
            onClick={() => scroll("left")}
            className="ml-3 w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full shadow-xl text-indigo-600 hover:bg-indigo-600 hover:text-white hover:scale-110 transition-all pointer-events-auto active:scale-95 border-l-4 border-l-indigo-500"
            aria-label="Scroll Left"
          >
            <HiChevronLeft className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Floating Right Button */}
      {showRight && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center z-20 pointer-events-none pl-16 bg-gradient-to-l from-white via-white/80 to-transparent transition-all duration-300">
          <button
            onClick={() => scroll("right")}
            className="mr-3 w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full shadow-xl text-indigo-600 hover:bg-indigo-600 hover:text-white hover:scale-110 transition-all pointer-events-auto active:scale-95 border-r-4 border-r-indigo-500"
            aria-label="Scroll Right"
          >
            <HiChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};

export default TableScrollWrapper;
