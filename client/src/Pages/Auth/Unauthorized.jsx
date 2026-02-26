import React from "react";
import { useNavigate } from "react-router-dom";
import { FaLock } from "react-icons/fa";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-gray-100 to-gray-300 p-6 relative overflow-hidden">

      {/* Soft background accents */}
      <div className="absolute top-10 left-10 w-40 h-40 bg-blue-300 rounded-full opacity-20 blur-[70px]" />
      <div className="absolute bottom-10 right-10 w-52 h-52 bg-purple-400 rounded-full opacity-20 blur-[90px]" />

      <div className="relative bg-white/70 backdrop-blur-xl shadow-2xl rounded-3xl p-12 w-full max-w-lg 
                      border border-white/40 animate-fadeIn text-center">

        {/* Lock Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 text-red-600 w-24 h-24 flex items-center justify-center 
                          rounded-full shadow-lg animate-pulse">
            <FaLock size={45} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-extrabold text-gray-800 tracking-wide mb-3">
          Access Denied
        </h1>

        {/* Subtitle */}
        <p className="text-gray-700 mb-10 text-base leading-relaxed px-4">
          You do not have permission to access this page.<br />
          Please log in with the appropriate role credentials.
        </p>

        {/* Login Button */}
        <button
          onClick={() => navigate("/landing")}
          className="w-full bg-blue-600 text-white py-3.5 px-6 rounded-xl font-semibold
                     shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-300
                     transform hover:scale-[1.03]"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}
