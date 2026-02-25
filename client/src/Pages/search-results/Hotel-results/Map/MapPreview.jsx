// components/MapPreview.jsx
import React from "react";
import { FaM, FaMapLocation } from "react-icons/fa6";
import { MapContainer, TileLayer } from "react-leaflet";

const MapPreview = ({ onOpen }) => {
  return (
    <div className=" mb-6 rounded-lg overflow-hidden">
      {/* Overlay */}
        <button
          onClick={onOpen}
          className="bg-blue-500 hover:bg-blue-600 flex items-center gap-2 cursor-pointer text-white px-3 py-1 text-sm rounded font-normal transition"
        >
          SEARCH ON MAP <FaMapLocation />
        </button>
    </div>
  );
};

export default MapPreview;
