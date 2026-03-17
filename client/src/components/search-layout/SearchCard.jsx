import React from "react";

export default function SearchCard({ children }) {
  return (
    <div className="max-w-6xl mx-auto bg-white/95 backdrop-blur-md
      rounded-3xl shadow-2xl p-8">
      {children}
    </div>
  );
}
