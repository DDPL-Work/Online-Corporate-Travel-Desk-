import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { FiGlobe } from "react-icons/fi";

function MapModal({ open, onClose, lat, lng, name, address }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-[95vw] max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-800">{name}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">
              {address}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer border-none"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="#64748b"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Full map */}
        <div className="h-[70vh]">
          <MapContainer
            center={[lat, lng]}
            zoom={15}
            className="w-full h-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              // attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[lat, lng]}>
              <Popup>{name}</Popup>
            </Marker>
          </MapContainer>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <FiGlobe size={11} /> {address}
          </p>
          <a
            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-[#C9A84C] hover:underline"
          >
            Open in OpenStreetMap →
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default MapModal;
