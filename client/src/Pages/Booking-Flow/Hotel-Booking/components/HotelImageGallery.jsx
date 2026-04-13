//HotelImageGallery.jsx

import React, { useState, useRef } from "react";
import {
  MdPhotoLibrary,
  MdClose,
  MdChevronLeft,
  MdChevronRight,
  MdGridView,
  MdZoomIn,
} from "react-icons/md";
import { FaExpand, FaCompress } from "react-icons/fa";
import { BsArrowsFullscreen } from "react-icons/bs";

/* ─────────────────────────────────────────
   Full-screen Lightbox
───────────────────────────────────────── */
const Lightbox = ({ images, startIndex, onClose }) => {
  const [current, setCurrent] = useState(startIndex);
  const total = images.length;

  const prev = () => setCurrent((i) => (i === 0 ? total - 1 : i - 1));
  const next = () => setCurrent((i) => (i === total - 1 ? 0 : i + 1));

  const handleKey = (e) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: "rgba(5,10,20,0.97)",
        backdropFilter: "blur(20px)",
        outline: "none",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKey}
      tabIndex={0}
      ref={(el) => el?.focus()}
    >
      {/* Top bar - Responsive */}
      <div className="flex items-center justify-between px-3 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <MdPhotoLibrary className="text-white text-xs sm:text-sm md:text-base" />
          </div>
          <div>
            <span className="text-white font-black text-xs sm:text-sm">
              {current + 1}
            </span>
            <span className="text-white/30 text-xs sm:text-sm"> / {total}</span>
          </div>
        </div>

        {/* Dot progress - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1">
          {images.slice(0, Math.min(total, 12)).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="transition-all duration-200"
              style={{
                width: i === current % 12 ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background:
                  i === current % 12 ? "#0d7fe8" : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
          {total > 12 && (
            <span className="text-white/30 text-xs ml-1">+{total - 12}</span>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
        >
          <MdClose className="text-lg sm:text-xl" />
        </button>
      </div>

      {/* Main image - Responsive */}
      <div className="flex-1 flex items-center justify-center relative px-3 sm:px-6 md:px-20 min-h-0">
        {/* Left Arrow */}
        <button
          onClick={prev}
          className="absolute left-2 sm:left-3 md:left-6 w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 rounded-lg sm:rounded-xl md:rounded-2xl bg-white/8 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all hover:scale-105 z-10"
        >
          <MdChevronLeft className="text-xl sm:text-2xl md:text-3xl" />
        </button>

        <div className="relative max-h-full max-w-full flex items-center justify-center">
          <img
            key={current}
            src={images[current]}
            alt={`Photo ${current + 1}`}
            className="rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl object-contain"
            style={{
              maxHeight: "calc(100vh - 140px)",
              maxWidth: "100%",
            }}
          />
        </div>

        {/* Right Arrow */}
        <button
          onClick={next}
          className="absolute right-2 sm:right-3 md:right-6 w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 rounded-lg sm:rounded-xl md:rounded-2xl bg-white/8 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all hover:scale-105 z-10"
        >
          <MdChevronRight className="text-xl sm:text-2xl md:text-3xl" />
        </button>
      </div>

      {/* Thumbnail strip - Responsive */}
      <div
        className="shrink-0 px-2 sm:px-4 md:px-8 py-3 sm:py-4 md:py-5 flex gap-1 sm:gap-2 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="shrink-0 rounded-lg sm:rounded-xl overflow-hidden transition-all duration-200"
            style={{
              width: i === current ? 60 : 48,
              height: 40,
              border:
                i === current ? "2px solid #0d7fe8" : "2px solid transparent",
              opacity: i === current ? 1 : 0.45,
            }}
          >
            <img src={img} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   Tile Component
───────────────────────────────────────── */
const Tile = ({ src, alt, onClick, children, style, className = "" }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={`relative overflow-hidden cursor-pointer group ${className}`}
      style={{ borderRadius: 12, ...style }}
      onClick={onClick}
    >
      {/* Skeleton shimmer */}
      {!loaded && (
        <div
          className="absolute inset-0 bg-slate-200"
          style={{
            background:
              "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }}
        />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.4s, transform 0.7s",
        }}
      />
      {/* Hover overlay gradient */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background:
            "linear-gradient(to top, rgba(10,37,64,0.5) 0%, transparent 60%)",
        }}
      />
      {/* Zoom icon */}
      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-100 scale-75">
        <MdZoomIn className="text-white text-sm sm:text-base" />
      </div>
      {children}
    </div>
  );
};

/* ─────────────────────────────────────────
   Main Gallery — Fully Responsive
───────────────────────────────────────── */
const HotelImageGallery = ({ images = [] }) => {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const total = images.length;
  if (!total) return null;

  const open = (i) => setLightboxIndex(i);
  const close = () => setLightboxIndex(null);

  const remaining = Math.max(0, total - 4);

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        /* Mobile: Single column layout */
        @media (max-width: 640px) {
          .gallery-grid {
            display: grid;
            gap: 4px;
            height: auto;
            grid-template-columns: 1fr;
            grid-template-rows: auto;
            grid-auto-rows: 180px;
          }
          .gallery-grid > div:nth-child(1) {
            grid-row: 1;
            grid-column: 1;
            height: 220px !important;
          }
          .gallery-grid > div:nth-child(2) {
            grid-row: 2;
            grid-column: 1;
          }
          .gallery-grid > div:nth-child(3) {
            grid-row: 3;
            grid-column: 1;
          }
          .gallery-grid > div:nth-child(4) {
            grid-row: 4;
            grid-column: 1;
          }
          .gallery-grid > div:nth-child(5) {
            grid-row: 5;
            grid-column: 1;
          }
        }
        
        /* Tablet: 2x3 grid */
        @media (min-width: 641px) and (max-width: 1024px) {
          .gallery-grid {
            display: grid;
            gap: 6px;
            height: 400px;
            grid-template-columns: 1.5fr 1fr;
            grid-template-rows: 1fr 1fr;
            grid-auto-flow: dense;
          }
          .gallery-grid > div:nth-child(1) {
            grid-row: 1 / 3;
            grid-column: 1;
          }
          .gallery-grid > div:nth-child(2) {
            grid-row: 1;
            grid-column: 2;
          }
          .gallery-grid > div:nth-child(3) {
            grid-row: 2;
            grid-column: 2;
          }
          .gallery-grid > div:nth-child(4) {
            display: none;
          }
          .gallery-grid > div:nth-child(5) {
            display: none;
          }
        }
        
        /* Desktop: Full bento layout */
        @media (min-width: 1025px) {
          .gallery-grid {
            display: grid;
            gap: 6px;
            height: 500px;
            grid-template-columns: 2.2fr 1fr 1fr;
            grid-template-rows: 1fr 1fr;
          }
          .gallery-grid > div:nth-child(1) {
            grid-row: 1 / 3;
            grid-column: 1;
          }
          .gallery-grid > div:nth-child(2) {
            grid-row: 1;
            grid-column: 2;
          }
          .gallery-grid > div:nth-child(3) {
            grid-row: 1;
            grid-column: 3;
          }
          .gallery-grid > div:nth-child(4) {
            grid-row: 2;
            grid-column: 2;
          }
          .gallery-grid > div:nth-child(5) {
            grid-row: 2;
            grid-column: 3;
          }
        }
      `}</style>

      {/* ── Main Gallery ── */}
      <div className="relative w-full">
        <div className="gallery-grid">
          {/* ① HERO */}
          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <Tile
              src={images[0]}
              alt="Main"
              onClick={() => open(0)}
              style={{ borderRadius: 0, width: "100%", height: "100%" }}
            >
              {/* Hero overlay label - Hidden on mobile */}
              <div
                className="hidden sm:block absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-5"
                style={{
                  background:
                    "linear-gradient(to top, rgba(10,37,64,0.8) 0%, transparent 100%)",
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0d7fe8] animate-pulse" />
                  <span className="text-white text-xs font-bold uppercase tracking-widest opacity-80">
                    Featured Photo
                  </span>
                </div>
              </div>
            </Tile>
          </div>

          {/* ② Second image */}
          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {images[1] ? (
              <Tile
                src={images[1]}
                alt="2"
                onClick={() => open(1)}
                style={{ borderRadius: 0, width: "100%", height: "100%" }}
              />
            ) : (
              <div className="w-full h-full bg-slate-200 rounded-xl" />
            )}
          </div>

          {/* ③ Third image */}
          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {images[2] ? (
              <Tile
                src={images[2]}
                alt="3"
                onClick={() => open(2)}
                style={{ borderRadius: 0, width: "100%", height: "100%" }}
              />
            ) : (
              <div className="w-full h-full bg-slate-200 rounded-xl" />
            )}
          </div>

          {/* ④ Fourth image */}
          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {images[3] ? (
              <Tile
                src={images[3]}
                alt="4"
                onClick={() => open(3)}
                style={{ borderRadius: 0, width: "100%", height: "100%" }}
              />
            ) : (
              <div className="w-full h-full bg-slate-200 rounded-xl" />
            )}
          </div>

          {/* ⑤ Fifth image with +N overlay */}
          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {images[4] ? (
              <Tile
                src={images[4]}
                alt="5"
                onClick={() => open(4)}
                style={{ borderRadius: 0, width: "100%", height: "100%" }}
              >
                {remaining > 0 && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                    style={{
                      background: "rgba(10,37,64,0.72)",
                      backdropFilter: "blur(2px)",
                    }}
                  >
                    <div
                      className="text-white font-black leading-none"
                      style={{ fontSize: 28 }}
                    >
                      +{remaining}
                    </div>
                  </div>
                )}
              </Tile>
            ) : (
              <div className="w-full h-full bg-slate-200 rounded-xl" />
            )}
          </div>
        </div>

        {/* ── Photo count badge - Responsive ── */}
        <div
          className="absolute top-2 sm:top-3 md:top-4 left-2 sm:left-3 md:left-4 flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full z-10"
          style={{
            background: "rgba(10,37,64,0.75)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <MdPhotoLibrary className="text-white text-xs sm:text-sm" />
          <span className="text-white text-xs font-bold">{total} Photos</span>
        </div>

        {/* ── Action button - Responsive ── */}
        <div className="absolute bottom-2 sm:bottom-3 md:bottom-4 right-2 sm:right-3 md:right-4 z-10">
          <button
            onClick={() => open(0)}
            className="flex items-center gap-1.5 sm:gap-2 font-bold text-xs px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl transition-all hover:scale-105 active:scale-95"
            style={{
              background: "rgba(255,255,255,0.95)",
              color: "#0a2540",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.5)",
            }}
          >
            <MdGridView className="text-[#0d7fe8] text-sm sm:text-base" />
            <span className="hidden sm:inline">View All {total}</span>
            <span className="sm:hidden">{total}</span>
          </button>
        </div>
      </div>

      {/* ── Thumbnail filmstrip - Responsive ── */}
      {total > 5 && (
        <div className="mt-2 sm:mt-3 md:mt-4 relative">
          <div
            className="flex gap-1.5 sm:gap-2 overflow-x-auto py-1 px-0.5"
            style={{ scrollbarWidth: "none" }}
          >
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => open(i)}
                className="group relative shrink-0 overflow-hidden transition-all duration-200 hover:-translate-y-1"
                style={{
                  width: 60,
                  height: 44,
                  borderRadius: 8,
                  border: "2px solid transparent",
                  outline: "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "#0d7fe8")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "transparent")
                }
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                <div className="absolute bottom-0.5 right-1 text-[8px] text-white/0 group-hover:text-white/80 font-bold transition">
                  {i + 1}
                </div>
              </button>
            ))}
          </div>
          {/* Fade edge */}
          <div
            className="absolute top-0 right-0 bottom-0 w-8 sm:w-12 pointer-events-none"
            style={{
              background: "linear-gradient(to left, white, transparent)",
            }}
          />
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox images={images} startIndex={lightboxIndex} onClose={close} />
      )}
    </>
  );
};

export default HotelImageGallery;