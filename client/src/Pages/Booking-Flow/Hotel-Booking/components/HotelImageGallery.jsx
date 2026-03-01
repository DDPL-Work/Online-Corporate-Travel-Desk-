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
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: "rgba(5,10,20,0.97)", backdropFilter: "blur(20px)",outline: "none", background: "rgba(5,10,20,0.97)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKey}
      tabIndex={0}
      ref={(el) => el?.focus()}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <MdPhotoLibrary className="text-white text-base" />
          </div>
          <div>
            <span className="text-white font-black text-sm">{current + 1}</span>
            <span className="text-white/30 text-sm"> / {total}</span>
          </div>
        </div>

        {/* Dot progress */}
        <div className="hidden md:flex items-center gap-1">
          {images.slice(0, Math.min(total, 12)).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="transition-all duration-200"
              style={{
                width: i === current % 12 ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === current % 12 ? "#0d7fe8" : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
          {total > 12 && <span className="text-white/30 text-xs ml-1">+{total - 12}</span>}
        </div>

        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
        >
          <MdClose className="text-xl" />
        </button>
      </div>

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center relative px-20 min-h-0">
        <button
          onClick={prev}
          className="absolute left-6 w-14 h-14 rounded-2xl bg-white/8 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all hover:scale-105 z-10"
        >
          <MdChevronLeft className="text-3xl" />
        </button>

        <div className="relative max-h-full max-w-full flex items-center justify-center">
          <img
            key={current}
            src={images[current]}
            alt={`Photo ${current + 1}`}
            className="rounded-2xl shadow-2xl object-contain"
            style={{ maxHeight: "calc(100vh - 220px)", maxWidth: "100%" }}
          />
        </div>

        <button
          onClick={next}
          className="absolute right-6 w-14 h-14 rounded-2xl bg-white/8 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all hover:scale-105 z-10"
        >
          <MdChevronRight className="text-3xl" />
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="shrink-0 px-8 py-5 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="shrink-0 rounded-xl overflow-hidden transition-all duration-200"
            style={{
              width: i === current ? 80 : 56,
              height: 48,
              border: i === current ? "2px solid #0d7fe8" : "2px solid transparent",
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
   All Photos Modal — Masonry style
───────────────────────────────────────── */
const AllPhotosModal = ({ images, onClose, onSelect }) => (
  <div
    className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
    style={{ background: "rgba(10,20,40,0.85)", backdropFilter: "blur(10px)" }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div
      className="bg-white w-full max-w-5xl flex flex-col overflow-hidden"
      style={{ maxHeight: "92vh", borderRadius: 24, boxShadow: "0 40px 100px rgba(0,0,0,0.4)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 shrink-0">
        <div>
          <h3 className="font-black text-[#0a2540] text-lg">All Photos</h3>
          <p className="text-xs text-slate-400 mt-0.5">{images.length} photos · Click to view full screen</p>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
        >
          <MdClose className="text-slate-600 text-lg" />
        </button>
      </div>

      {/* Grid */}
      <div
        className="overflow-y-auto p-5"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          scrollbarWidth: "thin",
        }}
      >
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => { onSelect(i); onClose(); }}
            className="relative group overflow-hidden"
            style={{
              borderRadius: 12,
              aspectRatio: i % 7 === 0 ? "1/1.3" : i % 3 === 0 ? "16/9" : "4/3",
              gridColumn: i % 7 === 0 ? "span 2" : "span 1",
            }}
          >
            <img
              src={img}
              alt=""
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition duration-400"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
              <BsArrowsFullscreen className="text-white text-xl opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
              {i + 1}
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

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
            background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
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
        style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.4s, transform 0.7s" }}
      />
      {/* Hover overlay gradient */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "linear-gradient(to top, rgba(10,37,64,0.5) 0%, transparent 60%)" }}
      />
      {/* Zoom icon */}
      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-100 scale-75">
        <MdZoomIn className="text-white text-base" />
      </div>
      {children}
    </div>
  );
};

/* ─────────────────────────────────────────
   Main Gallery — Unique Asymmetric Bento
───────────────────────────────────────── */
const HotelImageGallery = ({ images = [] }) => {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const total = images.length;
  if (!total) return null;

  const open = (i) => setLightboxIndex(i);
  const close = () => setLightboxIndex(null);

  const remaining = Math.max(0, total - 6);

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .gallery-grid {
          display: grid;
          gap: 6px;
          height: 500px;
          grid-template-columns: 2.2fr 1fr 1fr;
          grid-template-rows: 1fr 1fr;
        }
      `}</style>

      {/* ── Main Bento ── */}
      <div className="relative">
        <div className="gallery-grid">

          {/* ① HERO — tall left, spans both rows */}
          <div style={{ gridRow: "1 / 3", gridColumn: "1 / 2", borderRadius: 16, overflow: "hidden", position: "relative" }}>
            <Tile
              src={images[0]}
              alt="Main"
              onClick={() => open(0)}
              style={{ borderRadius: 0, width: "100%", height: "100%" }}
            >
              {/* Hotel name overlay on hero */}
              <div
                className="absolute bottom-0 left-0 right-0 p-5"
                style={{ background: "linear-gradient(to top, rgba(10,37,64,0.8) 0%, transparent 100%)" }}
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

          {/* ② Top center */}
          <div style={{ gridRow: "1 / 2", gridColumn: "2 / 3", borderRadius: 12, overflow: "hidden", position: "relative" }}>
            {images[1] ? (
              <Tile src={images[1]} alt="2" onClick={() => open(1)} style={{ borderRadius: 0, width: "100%", height: "100%" }} />
            ) : <div className="w-full h-full bg-slate-200 rounded-xl" />}
          </div>

          {/* ③ Top right — taller with label */}
          <div style={{ gridRow: "1 / 2", gridColumn: "3 / 4", borderRadius: 12, overflow: "hidden", position: "relative" }}>
            {images[2] ? (
              <Tile src={images[2]} alt="3" onClick={() => open(2)} style={{ borderRadius: 0, width: "100%", height: "100%" }} />
            ) : <div className="w-full h-full bg-slate-200 rounded-xl" />}
          </div>

          {/* ④ Bottom center */}
          <div style={{ gridRow: "2 / 3", gridColumn: "2 / 3", borderRadius: 12, overflow: "hidden", position: "relative" }}>
            {images[3] ? (
              <Tile src={images[3]} alt="4" onClick={() => open(3)} style={{ borderRadius: 0, width: "100%", height: "100%" }} />
            ) : <div className="w-full h-full bg-slate-200 rounded-xl" />}
          </div>

          {/* ⑤ Bottom right — +N overlay */}
          <div style={{ gridRow: "2 / 3", gridColumn: "3 / 4", borderRadius: 12, overflow: "hidden", position: "relative" }}>
            {images[4] ? (
              <Tile
                src={images[4]}
                alt="5"
                onClick={() => remaining > 0 ? setShowAll(true) : open(4)}
                style={{ borderRadius: 0, width: "100%", height: "100%" }}
              >
                {remaining > 0 && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                    style={{ background: "rgba(10,37,64,0.72)", backdropFilter: "blur(2px)" }}
                  >
                    <div
                      className="text-white font-black leading-none"
                      style={{ fontSize: 36 }}
                    >
                      +{remaining}
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3 py-1">
                      <MdGridView className="text-white text-xs" />
                      <span className="text-white text-[11px] font-bold">View All</span>
                    </div>
                  </div>
                )}
              </Tile>
            ) : <div className="w-full h-full bg-slate-200 rounded-xl" />}
          </div>
        </div>

        {/* ── Floating badge — total count ── */}
        <div
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full z-10"
          style={{ background: "rgba(10,37,64,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <MdPhotoLibrary className="text-white text-sm" />
          <span className="text-white text-xs font-bold">{total} Photos</span>
        </div>

        {/* ── Action buttons bottom-right ── */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
          <button
            onClick={() => setShowAll(true)}
            className="flex items-center gap-2 font-bold text-xs px-4 py-2.5 rounded-xl transition-all hover:scale-105"
            style={{
              background: "rgba(255,255,255,0.95)",
              color: "#0a2540",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.5)",
            }}
          >
            <MdGridView className="text-[#0d7fe8] text-base" />
            All {total} Photos
          </button>
          <button
            onClick={() => open(0)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}
          >
            <BsArrowsFullscreen className="text-[#0a2540] text-sm" />
          </button>
        </div>
      </div>

      {/* ── Thumbnail filmstrip ── */}
      {total > 5 && (
        <div className="mt-3 relative">
          <div
            className="flex gap-2 overflow-x-auto py-1 px-0.5"
            style={{ scrollbarWidth: "none" }}
          >
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => open(i)}
                className="group relative shrink-0 overflow-hidden transition-all duration-200 hover:-translate-y-1"
                style={{
                  width: 72,
                  height: 52,
                  borderRadius: 10,
                  border: "2px solid transparent",
                  outline: "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0d7fe8")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                <div className="absolute bottom-0.5 right-1 text-[8px] text-white/0 group-hover:text-white/80 font-bold transition">
                  {i + 1}
                </div>
              </button>
            ))}
          </div>
          {/* Fade edges */}
          <div className="absolute top-0 right-0 bottom-0 w-12 pointer-events-none" style={{ background: "linear-gradient(to left, white, transparent)" }} />
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox images={images} startIndex={lightboxIndex} onClose={close} />
      )}

      {/* All Photos */}
      {showAll && (
        <AllPhotosModal
          images={images}
          onClose={() => setShowAll(false)}
          onSelect={(i) => { setShowAll(false); open(i); }}
        />
      )}
    </>
  );
};

export default HotelImageGallery;